import * as vscode from 'vscode';
import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import selectorParser from 'postcss-selector-parser';
import { getConfig, ExtensionConfig } from './config';

export interface CSSSelector {
  selector: string;
  file: vscode.Uri;
  line: number;
  used: boolean;
  useCount: number;
  locations: vscode.Location[];
  range?: vscode.Range;
  source: 'stylesheet' | 'inline-style' | 'css-in-js';
  scoped?: boolean;
  externalOnly?: boolean;
}

export interface AnalysisResult {
  unused: CSSSelector[];
  used: CSSSelector[];
  total: number;
}

type SelectorAstNode = {
  type?: string;
  value?: string;
  parent?: SelectorAstNode;
  nodes?: SelectorAstNode[];
};

export class CSSAnalyzer {
  private cssFiles: vscode.Uri[] = [];
  private codeFiles: vscode.Uri[] = [];
  private selectors: Map<string, CSSSelector[]> = new Map();

  /**
   * Read file content preferring the in-memory (dirty) buffer of open editors.
   * Falls back to disk if the file is not open.
   */
  private async readFileContent(uri: vscode.Uri): Promise<string> {
    const openDoc = vscode.workspace.textDocuments.find(
      doc => doc.uri.fsPath === uri.fsPath
    );
    if (openDoc) {
      return openDoc.getText();
    }
    const content = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(content);
  }

  async analyzeWorkspace(workspaceFolder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<AnalysisResult> {
    this.selectors.clear();

    await this.findFiles(workspaceFolder);
    if (token?.isCancellationRequested) { return this.getResults(); }

    await this.extractSelectors(token);
    if (token?.isCancellationRequested) { return this.getResults(); }

    await this.checkUsage(token);

    return this.getResults();
  }

  private async findFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    const cfg = getConfig();

    // Build a single glob pattern: {**/node_modules/**,**/.git/**,...}
    const allExcludePatterns: string[] = cfg.excludeFolders.map(f => `**/${f}/**`);
    if (cfg.excludeFiles.length > 0) {
      allExcludePatterns.push(...cfg.excludeFiles);
    }
    // workspace.findFiles expects ONE GlobPattern — use brace expansion
    const exclude = allExcludePatterns.length > 0
      ? `{${allExcludePatterns.join(',')}}`
      : undefined;

    // Find CSS/SCSS files
    const cssExts = cfg.cssFileExtensions.join(',');
    this.cssFiles = await vscode.workspace.findFiles(
      `**/*.{${cssExts}}`,
      exclude
    );

    // Find ALL code files
    const codeExts = cfg.includeFileExtensions.join(',');
    this.codeFiles = await vscode.workspace.findFiles(
      `**/*.{${codeExts}}`,
      exclude
    );
  }

  private async extractSelectors(token?: vscode.CancellationToken): Promise<void> {
    const cfg = getConfig();

    // 1. Process dedicated CSS/SCSS files
    for (const file of this.cssFiles) {
      if (token?.isCancellationRequested) { return; }
      try {
        const text = await this.readFileContent(file);
        const isSCSS = file.fsPath.endsWith('.scss') || file.fsPath.endsWith('.sass');
        this.processCSSContent(text, file, isSCSS, 0, {
          source: 'stylesheet'
        });
      } catch (error) {
        console.error(`Error parsing file ${file.fsPath}:`, error);
      }
    }

    // 2. Process inline <style> blocks in code files
    if (cfg.scanStyleBlocks) {
      for (const file of this.codeFiles) {
        if (token?.isCancellationRequested) { return; }
        try {
          const text = await this.readFileContent(file);

          const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
          let match;
          while ((match = styleRegex.exec(text)) !== null) {
            const attributes = match[1];
            const styleContent = match[2];
            const textBefore = text.substring(0, match.index);
            const styleTagLine = match[0].substring(0, match[0].indexOf('>'));
            const lineOffset = (textBefore.match(/\n/g) || []).length + (styleTagLine.match(/\n/g) || []).length;
            const isSCSS = /lang\s*=\s*["']scss["']/i.test(attributes);
            const isScoped = /\bscoped\b/i.test(attributes);
            this.processCSSContent(styleContent, file, isSCSS, lineOffset, {
              source: 'inline-style',
              scoped: isScoped
            });
          }

          // CSS-in-JS: css`...`
          if (cfg.scanCssInJs) {
            const cssLiteralRegex = /css`([\s\S]*?)`/gi;
            while ((match = cssLiteralRegex.exec(text)) !== null) {
              const styleContent = match[1];
              const textBefore = text.substring(0, match.index);
              const lineOffset = (textBefore.match(/\n/g) || []).length;
              this.processCSSContent(styleContent, file, false, lineOffset, {
                source: 'css-in-js'
              });
            }
          }
        } catch (error) {
          console.error(`Error parsing file ${file.fsPath} for styles:`, error);
        }
      }
    }
  }

  private processCSSContent(
    text: string,
    file: vscode.Uri,
    isSCSS: boolean,
    lineOffset: number,
    context: { source: 'stylesheet' | 'inline-style' | 'css-in-js'; scoped?: boolean }
  ): void {
    try {
      const root = postcss.parse(text, {
        syntax: isSCSS ? postcssScss : undefined
      } as any);

      root.walkRules((rule) => {
        // Check for ignore comment
        const prevNode = rule.prev();
        if (prevNode && prevNode.type === 'comment' && prevNode.text.includes('css-unused-ignore')) {
          return;
        }

        const selector = rule.selector;
        const startLine = (rule.source?.start?.line ?? 1) - 1 + lineOffset;
        const startChar = (rule.source?.start?.column ?? 1) - 1;
        const endLine = (rule.source?.end?.line ?? 1) - 1 + lineOffset;
        const endChar = (rule.source?.end?.column ?? 1);

        // Full range from selector start to closing brace
        const range = new vscode.Range(
          new vscode.Position(startLine, startChar),
          new vscode.Position(endLine, endChar)
        );

        const extracted = this.extractSelectorsFromRule(selector);

        for (const ext of extracted) {
          const key = `${ext.type}:${ext.value}`;
          if (!this.selectors.has(key)) {
            this.selectors.set(key, []);
          }
          this.selectors.get(key)!.push({
            selector: selector,
            file: file,
            line: startLine,
            used: false,
            useCount: 0,
            locations: [],
            range: range,
            source: context.source,
            scoped: context.scoped,
            externalOnly: ext.externalOnly
          });
        }
      });
    } catch (error) {
      console.error(`Error processing CSS content in ${file.fsPath}:`, error);
    }
  }

  private extractSelectorsFromRule(selector: string): Array<{type: string; value: string; externalOnly: boolean}> {
    const extracted: Array<{type: string; value: string; externalOnly: boolean}> = [];
    const cfg = getConfig();

    try {
      selectorParser(selectors => {
        selectors.walkClasses(sel => {
          extracted.push({
            type: 'class',
            value: sel.value,
            externalOnly: this.isInsideDeepOrGlobal(sel) || this.isAfterDeepOrGlobalPseudo(sel)
          });
        });
        selectors.walkIds(sel => {
          extracted.push({
            type: 'id',
            value: sel.value,
            externalOnly: this.isInsideDeepOrGlobal(sel) || this.isAfterDeepOrGlobalPseudo(sel)
          });
        });
        if (cfg.scanTags) {
          selectors.walkTags(sel => {
            extracted.push({
              type: 'tag',
              value: sel.value,
              externalOnly: this.isInsideDeepOrGlobal(sel) || this.isAfterDeepOrGlobalPseudo(sel)
            });
          });
        }
      }).processSync(selector);
    } catch (error) {
      console.error(`Error extracting selectors from "${selector}":`, error);
    }

    return extracted;
  }

  private isDeepOrGlobalPseudo(pseudoValueRaw: string): boolean {
    const pseudoValue = String(pseudoValueRaw || '').toLowerCase();
    return pseudoValue === ':deep'
      || pseudoValue === ':global'
      || pseudoValue === '::v-deep'
      || pseudoValue === ':v-deep'
      || pseudoValue === '::v-global'
      || pseudoValue === ':v-global';
  }

  private isInsideDeepOrGlobal(node: SelectorAstNode | undefined): boolean {
    let current = node?.parent;

    while (current) {
      if (current.type === 'pseudo') {
        if (this.isDeepOrGlobalPseudo(String(current.value || ''))) {
          return true;
        }
      }
      current = current.parent;
    }

    return false;
  }

  private isAfterDeepOrGlobalPseudo(node: SelectorAstNode | undefined): boolean {
    if (!node) {
      return false;
    }

    const topLevelSelector = this.getTopLevelSelector(node);
    if (!topLevelSelector?.nodes || topLevelSelector.nodes.length === 0) {
      return false;
    }

    let directChild: SelectorAstNode = node;
    while (directChild?.parent && directChild.parent !== topLevelSelector) {
      directChild = directChild.parent;
    }

    const nodeIndex = topLevelSelector.nodes.indexOf(directChild);
    if (nodeIndex <= 0) {
      return false;
    }

    for (let i = 0; i < nodeIndex; i++) {
      const candidate = topLevelSelector.nodes[i];
      if (candidate?.type === 'pseudo' && this.isDeepOrGlobalPseudo(String(candidate.value || ''))) {
        return true;
      }
    }

    return false;
  }

  private getTopLevelSelector(node: SelectorAstNode | undefined): SelectorAstNode | undefined {
    let current = node;
    while (current) {
      if (current.type === 'selector' && current.parent?.type === 'root') {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }

  private async checkUsage(token?: vscode.CancellationToken): Promise<void> {
    // Build a complete index of all class, id and tag usages across all code files in a single pass
    const classLocations = new Map<string, vscode.Location[]>();
    const idLocations = new Map<string, vscode.Location[]>();
    const tagLocations = new Map<string, vscode.Location[]>();

    // Collect only the names we actually need to search for
    const classNames = new Set<string>();
    const idNames = new Set<string>();
    const tagNames = new Set<string>();
    for (const [key] of this.selectors) {
      const colonIdx = key.indexOf(':');
      const type = key.substring(0, colonIdx);
      const value = key.substring(colonIdx + 1);
      if (type === 'class') {
        classNames.add(value);
      } else if (type === 'id') {
        idNames.add(value);
      } else if (type === 'tag') {
        tagNames.add(value);
      }
    }

    for (const codeFile of this.codeFiles) {
      if (token?.isCancellationRequested) { return; }
      try {
        const text = await this.readFileContent(codeFile);
        const scanText = this.maskStyleBlocks(text);

        // Build a line-start offset index for fast line/char calculation
        const lineStarts = this.buildLineStarts(scanText);
        const cfg = getConfig();

        // Scan for class usages
        this.scanClassAttributes(scanText, codeFile, lineStarts, classLocations, classNames, cfg);

        // Scan for id usages
        this.scanIdAttributes(scanText, codeFile, lineStarts, idLocations, idNames, cfg);

        // Scan for tag usages
        if (cfg.scanTags && tagNames.size > 0) {
          this.scanTagNames(scanText, codeFile, lineStarts, tagLocations, tagNames, cfg);
        }

      } catch (error) {
        console.error(`Error reading file ${codeFile.fsPath}:`, error);
      }
    }

    // Populate usage data back onto the selectors
    for (const [key, selectorsList] of this.selectors) {
      const colonIdx = key.indexOf(':');
      const type = key.substring(0, colonIdx);
      const value = key.substring(colonIdx + 1);
      
      let locations: vscode.Location[] | undefined;
      if (type === 'class') {
        locations = classLocations.get(value);
      } else if (type === 'id') {
        locations = idLocations.get(value);
      } else if (type === 'tag') {
        locations = tagLocations.get(value);
      }

      for (const selector of selectorsList) {
        const resolvedLocations = this.resolveLocationsForSelector(selector, locations);

        selector.used = resolvedLocations.length > 0;
        selector.useCount = resolvedLocations.length;
        selector.locations = resolvedLocations;
      }
    }
  }

  private maskStyleBlocks(text: string): string {
    const styleRegex = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
    return text.replace(styleRegex, match => match.replace(/[^\r\n]/g, ' '));
  }

  private resolveLocationsForSelector(selector: CSSSelector, locations: vscode.Location[] | undefined): vscode.Location[] {
    if (!locations || locations.length === 0) {
      return [];
    }

    const isScopedInlineStyle = selector.source === 'inline-style' && selector.scoped === true;

    let filteredLocations: vscode.Location[];
    if (!isScopedInlineStyle) {
      filteredLocations = [...locations];
    } else if (selector.externalOnly === true) {
      // deep/global selectors can be matched from local or external templates
      filteredLocations = [...locations];
    } else {
      filteredLocations = locations.filter(loc => loc.uri.fsPath === selector.file.fsPath);
    }

    return this.sortAndDeduplicateLocations(filteredLocations, selector.file.fsPath);
  }

  private sortAndDeduplicateLocations(locations: vscode.Location[], preferredFilePath: string): vscode.Location[] {
    if (locations.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const deduped: vscode.Location[] = [];

    for (const loc of locations) {
      const key = `${loc.uri.fsPath}:${loc.range.start.line}:${loc.range.start.character}:${loc.range.end.line}:${loc.range.end.character}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(loc);
    }

    deduped.sort((a, b) => {
      const aPreferred = a.uri.fsPath === preferredFilePath ? 0 : 1;
      const bPreferred = b.uri.fsPath === preferredFilePath ? 0 : 1;
      if (aPreferred !== bPreferred) {
        return aPreferred - bPreferred;
      }

      if (a.uri.fsPath !== b.uri.fsPath) {
        return a.uri.fsPath.localeCompare(b.uri.fsPath);
      }

      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }

      if (a.range.start.character !== b.range.start.character) {
        return a.range.start.character - b.range.start.character;
      }

      if (a.range.end.line !== b.range.end.line) {
        return a.range.end.line - b.range.end.line;
      }

      return a.range.end.character - b.range.end.character;
    });

    return deduped;
  }

  private buildLineStarts(text: string): number[] {
    const starts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        starts.push(i + 1);
      }
    }
    return starts;
  }

  private offsetToPosition(lineStarts: number[], offset: number): vscode.Position {
    // Binary search for the line
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lineStarts[mid] <= offset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return new vscode.Position(low, offset - lineStarts[low]);
  }

  private addLocationAtOffset(map: Map<string, vscode.Location[]>, name: string, uri: vscode.Uri, lineStarts: number[], offset: number, length: number) {
    const start = this.offsetToPosition(lineStarts, offset);
    const end = new vscode.Position(start.line, start.character + length);
    const loc = new vscode.Location(uri, new vscode.Range(start, end));

    let arr = map.get(name);
    if (!arr) {
      arr = [];
      map.set(name, arr);
    }
    arr.push(loc);
  }

  /**
   * Scans text for all class/className attribute values across all frameworks:
   *  - class="foo bar"                   (HTML, Angular, PHP, Twig, Blade, etc.)
   *  - className="foo bar"               (React JSX/TSX)
   *  - className={'foo bar'}             (React expression)
   *  - :class="'foo bar'"                (Vue shorthand)
   *  - v-bind:class="'foo bar'"          (Vue full)
   *  - [class]="'foo bar'"               (Angular property binding)
   *  - [ngClass]="'foo bar'"             (Angular ngClass)
   *  - [ngClass]="{'foo': condition}"    (Angular ngClass object)
   *  - class:foo                         (Svelte directive)
   *  - class:list={['foo', 'bar']}       (Astro)
   *  - class={{ 'foo': true }}           (Vue object syntax in templates)
   *  - classList.add('foo')              (vanilla JS DOM)
   *  - classList.toggle('foo')           (vanilla JS DOM)
   *  - classList.contains('foo')         (vanilla JS DOM)
   *  - classList.remove('foo')           (vanilla JS DOM)
   *  - el.setAttribute('class', 'foo')  (vanilla JS DOM)
   *  - document.querySelector('.foo')    (vanilla JS DOM)
   *  - template literals / Pug / Haml / Slim etc.
   */
  private scanClassAttributes(
    text: string,
    uri: vscode.Uri,
    lineStarts: number[],
    classLocations: Map<string, vscode.Location[]>,
    classNames: Set<string>,
    cfg: ExtensionConfig
  ) {
    let m;

    // 1. Standard HTML/JSX/Vue/Angular: class="...", className="...", :class="...", [class]="...", [ngClass]="..."
    const attrRegex = /\b(?:class|className|:class|v-bind:class|\[class\]|\[ngClass\])\s*=\s*(?:"([^"]*)"|'([^']*)'|{['"`]([^'"`]*)['"`]})/g;
    while ((m = attrRegex.exec(text)) !== null) {
      const value = m[1] ?? m[2] ?? m[3] ?? '';
      this.extractClassNamesFromValue(value, m, classNames, classLocations, uri, lineStarts);
    }

    // 2. Angular [ngClass] with object syntax
    if (cfg.scanAngularPatterns) {
      const ngClassObjRegex = /\[ngClass\]\s*=\s*"\{([^}]*)\}"/g;
      while ((m = ngClassObjRegex.exec(text)) !== null) {
        const objContent = m[1];
        const objStart = m.index + m[0].indexOf(objContent);
        const keyRegex = /['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"]/g;
        let km;
        while ((km = keyRegex.exec(objContent)) !== null) {
          const name = km[1];
          if (classNames.has(name)) {
            this.addLocationAtOffset(classLocations, name, uri, lineStarts, objStart + km.index + 1, name.length);
          }
        }
      }
    }

    // 3. Svelte class:name directive
    if (cfg.scanSveltePatterns) {
      const svelteRegex = /\bclass:([a-zA-Z_][a-zA-Z0-9_-]*)/g;
      while ((m = svelteRegex.exec(text)) !== null) {
        const name = m[1];
        if (classNames.has(name)) {
          const nameStart = m.index + m[0].indexOf(name);
          this.addLocationAtOffset(classLocations, name, uri, lineStarts, nameStart, name.length);
        }
      }
    }

    // 4. Astro class:list={[...]}
    if (cfg.scanAstroPatterns) {
      const astroRegex = /class:list\s*=\s*{\s*\[([^\]]*)\]/g;
      while ((m = astroRegex.exec(text)) !== null) {
        const arrContent = m[1];
        const arrStart = m.index + m[0].indexOf(arrContent);
        const strRegex = /['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"]/g;
        let sm;
        while ((sm = strRegex.exec(arrContent)) !== null) {
          const classStr = sm[1];
          const classStrStart = arrStart + sm.index + 1;
          const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
          let wm;
          while ((wm = wordRegex.exec(classStr)) !== null) {
            if (classNames.has(wm[0])) {
              this.addLocationAtOffset(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
            }
          }
        }
      }
    }

    // 5. JS DOM API
    if (cfg.scanDomApi) {
      const classListRegex = /classList\s*\.\s*(?:add|remove|toggle|contains|replace)\s*\(([^)]+)\)/g;
      while ((m = classListRegex.exec(text)) !== null) {
        const argsContent = m[1];
        const argsStart = m.index + m[0].indexOf(argsContent);
        const strLitRegex = /['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"]/g;
        let sm;
        while ((sm = strLitRegex.exec(argsContent)) !== null) {
          const name = sm[1];
          if (classNames.has(name)) {
            this.addLocationAtOffset(classLocations, name, uri, lineStarts, argsStart + sm.index + 1, name.length);
          }
        }
      }

      // querySelector/querySelectorAll('.class-name')
      const qsRegex = /querySelector(?:All)?\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      while ((m = qsRegex.exec(text)) !== null) {
        const selectorStr = m[1];
        const selectorStart = m.index + m[0].indexOf(selectorStr);
        const dotClassRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
        let cm;
        while ((cm = dotClassRegex.exec(selectorStr)) !== null) {
          const name = cm[1];
          if (classNames.has(name)) {
            this.addLocationAtOffset(classLocations, name, uri, lineStarts, selectorStart + cm.index + 1, name.length);
          }
        }
      }
    }

    // 6. Pug/Jade
    if (cfg.scanPugPatterns && this.shouldScanPugPatternsInFile(uri, text)) {
      const pugRegex = /^[ \t]*(?:[a-zA-Z][a-zA-Z0-9]*)?(\.(?:[a-zA-Z_][a-zA-Z0-9_-]*)(?:\.(?:[a-zA-Z_][a-zA-Z0-9_-]*))*)/gm;
      while ((m = pugRegex.exec(text)) !== null) {
        const dotClasses = m[1];
        const dotStart = m.index + m[0].indexOf(dotClasses);
        const dotRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
        let dm;
        while ((dm = dotRegex.exec(dotClasses)) !== null) {
          const name = dm[1];
          if (classNames.has(name)) {
            this.addLocationAtOffset(classLocations, name, uri, lineStarts, dotStart + dm.index + 1, name.length);
          }
        }
      }
    }
  }

  private shouldScanPugPatternsInFile(uri: vscode.Uri, text: string): boolean {
    const lowerPath = uri.fsPath.toLowerCase();
    if (lowerPath.endsWith('.pug') || lowerPath.endsWith('.jade') || lowerPath.endsWith('.slim') || lowerPath.endsWith('.haml')) {
      return true;
    }

    return /<template[^>]*\blang\s*=\s*["'](?:pug|jade|slim|haml)["'][^>]*>/i.test(text);
  }

  private extractClassNamesFromValue(
    value: string,
    match: RegExpExecArray,
    classNames: Set<string>,
    classLocations: Map<string, vscode.Location[]>,
    uri: vscode.Uri,
    lineStarts: number[]
  ) {
    const valueStart = match.index + match[0].indexOf(value);
    const classRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
    let cm;
    while ((cm = classRegex.exec(value)) !== null) {
      const name = cm[0];
      if (classNames.has(name)) {
        this.addLocationAtOffset(classLocations, name, uri, lineStarts, valueStart + cm.index, name.length);
      }
    }
  }

  /**
   * Scans text for all id attribute values across all frameworks:
   *  - id="foo"                        (HTML)
   *  - id={'foo'}                      (JSX)
   *  - [id]="'foo'"                    (Angular)
   *  - getElementById('foo')           (vanilla JS)
   *  - querySelector('#foo')           (vanilla JS)
   */
  private scanIdAttributes(
    text: string,
    uri: vscode.Uri,
    lineStarts: number[],
    idLocations: Map<string, vscode.Location[]>,
    idNames: Set<string>,
    cfg: ExtensionConfig
  ) {
    let m;

    // 1. HTML/JSX/Angular: id="foo", id={'foo'}, [id]="'foo'"
    const attrRegex = /\b(?:id|\[id\])\s*=\s*(?:"([^"]*)"|'([^']*)'|{['"`]([^'"`]*)['"`]})/g;
    while ((m = attrRegex.exec(text)) !== null) {
      const value = m[1] ?? m[2] ?? m[3] ?? '';
      if (idNames.has(value)) {
        const valueStart = m.index + m[0].indexOf(value);
        this.addLocationAtOffset(idLocations, value, uri, lineStarts, valueStart, value.length);
      }
    }

    // 2. DOM API: getElementById, querySelector
    if (cfg.scanDomApi) {
      const getByIdRegex = /getElementById\s*\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*\)/g;
      while ((m = getByIdRegex.exec(text)) !== null) {
        const name = m[1];
        if (idNames.has(name)) {
          const nameStart = m.index + m[0].indexOf(name);
          this.addLocationAtOffset(idLocations, name, uri, lineStarts, nameStart, name.length);
        }
      }

      const qsIdRegex = /querySelector(?:All)?\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      while ((m = qsIdRegex.exec(text)) !== null) {
        const selectorStr = m[1];
        const selectorStart = m.index + m[0].indexOf(selectorStr);
        const hashIdRegex = /#([a-zA-Z_][a-zA-Z0-9_-]*)/g;
        let im;
        while ((im = hashIdRegex.exec(selectorStr)) !== null) {
          const name = im[1];
          if (idNames.has(name)) {
            this.addLocationAtOffset(idLocations, name, uri, lineStarts, selectorStart + im.index + 1, name.length);
          }
        }
      }
    }
  }

  private scanTagNames(
    text: string,
    uri: vscode.Uri,
    lineStarts: number[],
    tagLocations: Map<string, vscode.Location[]>,
    tagNames: Set<string>,
    cfg: ExtensionConfig
  ) {
    let m;

    // 1. Scan for HTML tags: <tag-name ...
    const tagRegex = /<\s*([a-zA-Z_][a-zA-Z0-9_-]*)/g;
    while ((m = tagRegex.exec(text)) !== null) {
      const name = m[1];
      const nameLower = name.toLowerCase();
      let matchedName: string | undefined;
      if (tagNames.has(name)) {
        matchedName = name;
      } else if (tagNames.has(nameLower)) {
        matchedName = nameLower;
      }

      if (matchedName) {
        const nameStart = m.index + m[0].indexOf(name);
        this.addLocationAtOffset(tagLocations, matchedName, uri, lineStarts, nameStart, name.length);
      }
    }

    // 2. DOM API tag name scans
    if (cfg.scanDomApi) {
      const getByTagRegex = /getElementsByTagName(?:NS)?\s*\(\s*(?:['"`][^'"`]*['"`]\s*,\s*)?['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*\)/g;
      while ((m = getByTagRegex.exec(text)) !== null) {
        const name = m[1];
        const nameLower = name.toLowerCase();
        let matchedName: string | undefined;
        if (tagNames.has(name)) {
          matchedName = name;
        } else if (tagNames.has(nameLower)) {
          matchedName = nameLower;
        }

        if (matchedName) {
          const nameStart = m.index + m[0].indexOf(name);
          this.addLocationAtOffset(tagLocations, matchedName, uri, lineStarts, nameStart, name.length);
        }
      }

      const createElementRegex = /createElement\s*\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*\)/g;
      while ((m = createElementRegex.exec(text)) !== null) {
        const name = m[1];
        const nameLower = name.toLowerCase();
        let matchedName: string | undefined;
        if (tagNames.has(name)) {
          matchedName = name;
        } else if (tagNames.has(nameLower)) {
          matchedName = nameLower;
        }

        if (matchedName) {
          const nameStart = m.index + m[0].indexOf(name);
          this.addLocationAtOffset(tagLocations, matchedName, uri, lineStarts, nameStart, name.length);
        }
      }

      const qsRegex = /querySelector(?:All)?\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      while ((m = qsRegex.exec(text)) !== null) {
        const selectorStr = m[1];
        const selectorStart = m.index + m[0].indexOf(selectorStr);
        try {
          selectorParser(selectors => {
            selectors.walkTags(sel => {
              const name = sel.value;
              const nameLower = name.toLowerCase();
              let matchedName: string | undefined;
              if (tagNames.has(name)) {
                matchedName = name;
              } else if (tagNames.has(nameLower)) {
                matchedName = nameLower;
              }

              if (matchedName) {
                const offset = (sel as any).sourceIndex ?? selectorStr.indexOf(name);
                this.addLocationAtOffset(tagLocations, matchedName, uri, lineStarts, selectorStart + offset, name.length);
              }
            });
          }).processSync(selectorStr);
        } catch (e) {
          const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_-]*)\b/g;
          let wm;
          while ((wm = wordRegex.exec(selectorStr)) !== null) {
            const name = wm[1];
            const precedingChar = selectorStr.charAt(wm.index - 1);
            if (precedingChar !== '.' && precedingChar !== '#' && precedingChar !== ':' && precedingChar !== '[' && precedingChar !== '@') {
              const nameLower = name.toLowerCase();
              let matchedName: string | undefined;
              if (tagNames.has(name)) {
                matchedName = name;
              } else if (tagNames.has(nameLower)) {
                matchedName = nameLower;
              }

              if (matchedName) {
                this.addLocationAtOffset(tagLocations, matchedName, uri, lineStarts, selectorStart + wm.index, name.length);
              }
            }
          }
        }
      }
    }
  }

  private getResults(): AnalysisResult {
    const mergedByRule = new Map<string, CSSSelector>();

    for (const selectorsList of this.selectors.values()) {
      for (const selector of selectorsList) {
        const ruleKey = `${selector.file.fsPath}:${selector.line}:${selector.selector}`;
        const existing = mergedByRule.get(ruleKey);

        if (!existing) {
          mergedByRule.set(ruleKey, {
            ...selector,
            locations: [...selector.locations]
          });
          continue;
        }

        existing.used = existing.used || selector.used;
        existing.locations = this.sortAndDeduplicateLocations(
          [...existing.locations, ...selector.locations],
          existing.file.fsPath
        );
      }
    }

    const unused: CSSSelector[] = [];
    const used: CSSSelector[] = [];

    for (const selector of mergedByRule.values()) {
      selector.useCount = selector.locations.length;
      selector.used = selector.used || selector.useCount > 0;

      if (selector.used) {
        used.push(selector);
      } else {
        unused.push(selector);
      }
    }

    return {
      unused,
      used,
      total: used.length + unused.length
    };
  }
}
