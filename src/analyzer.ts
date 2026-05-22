import * as vscode from 'vscode';
import postcss, { Rule, AtRule, Root } from 'postcss';
import postcssScss from 'postcss-scss';
import selectorParser from 'postcss-selector-parser';
import { getConfig, ExtensionConfig } from './config';
import { resolveNestedSelector } from './nesting-resolver';
import { calculateSpecificity, Specificity } from './specificity';
import { calculateConfidence, ConfidenceFactors } from './confidence';
import { createExtractors, ScanContext, buildLineStarts } from './extractors';
import type { UsageExtractor } from './extractors';

export interface CSSSelector {
  selector: string;
  file: vscode.Uri;
  line: number;
  used: boolean;
  useCount: number;
  status?: 'confirmed' | 'probable' | 'unused';
  locations: vscode.Location[];
  range?: vscode.Range;
  source: 'stylesheet' | 'inline-style' | 'css-in-js';
  scoped?: boolean;
  externalOnly?: boolean;
  partsCount?: number;
  requiredAtoms?: string[];
  hasCombinator?: boolean;
  canBeConfirmedStatically?: boolean;
  selectorGroups?: string[];
  groupCount?: number;
  matchedGroupsCount?: number;
  hasSelectorList?: boolean;
  specificity?: Specificity;
  confidence?: number;
  resolvedSelectors?: string[];
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
  sourceIndex?: number;
};

type ExtractedSelectorPart = {
  type: 'class' | 'id' | 'tag';
  value: string;
  externalOnly: boolean;
};

type SelectorGroupMeta = {
  selector: string;
  parts: ExtractedSelectorPart[];
  requiredAtoms: string[];
  hasCombinator: boolean;
  canBeConfirmedStatically: boolean;
};

type ExtractedSelectorMeta = {
  groups: SelectorGroupMeta[];
  parts: ExtractedSelectorPart[];
  requiredAtoms: string[];
  hasCombinator: boolean;
  canBeConfirmedStatically: boolean;
  hasSelectorList: boolean;
};

/** Maximum file size in bytes to read (default 1MB) */
const MAX_FILE_SIZE = 1 * 1024 * 1024;

/** Concurrency limit for parallel file reads */
const CONCURRENCY_LIMIT = 8;

export class CSSAnalyzer {
  private cssFiles: vscode.Uri[] = [];
  private codeFiles: vscode.Uri[] = [];
  private selectors: Map<string, CSSSelector[]> = new Map();
  private extractors: UsageExtractor[] = [];

  /** Cache of extracted selector metadata keyed by selector string */
  private selectorMetaCache: Map<string, ExtractedSelectorMeta> = new Map();

  /** Set of classes referenced by @extend */
  private extendedClasses: Set<string> = new Set();

  /** Cache of class groups (co-occurring classes) per file */
  private fileClassGroups: Map<string, Set<string>> = new Map();

  constructor() {
    this.extractors = createExtractors();
  }

  private async readFileContent(uri: vscode.Uri): Promise<string | null> {
    const openDoc = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === uri.fsPath);
    if (openDoc) {
      return openDoc.getText();
    }
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > MAX_FILE_SIZE) {
        return null;
      }
      const content = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder().decode(content);
    } catch {
      return null;
    }
  }

  async analyzeWorkspace(workspaceFolder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<AnalysisResult> {
    this.selectors.clear();
    this.selectorMetaCache.clear();
    this.extendedClasses.clear();
    this.fileClassGroups.clear();

    await this.findFiles(workspaceFolder);
    if (token?.isCancellationRequested) {
      return this.getResults();
    }

    await this.extractSelectors(token);
    if (token?.isCancellationRequested) {
      return this.getResults();
    }

    await this.checkUsage(token);

    return this.getResults();
  }

  private async findFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    const cfg = getConfig();
    const allExcludePatterns: string[] = cfg.excludeFolders.map(f => `**/${f}/**`);
    if (cfg.excludeFiles.length > 0) {
      allExcludePatterns.push(...cfg.excludeFiles);
    }
    const exclude = allExcludePatterns.length > 0 ? `{${allExcludePatterns.join(',')}}` : undefined;

    const cssExts = cfg.cssFileExtensions.join(',');
    this.cssFiles = await vscode.workspace.findFiles(`**/*.{${cssExts}}`, exclude);

    const codeExts = cfg.includeFileExtensions.join(',');
    this.codeFiles = await vscode.workspace.findFiles(`**/*.{${codeExts}}`, exclude);
  }

  private async extractSelectors(token?: vscode.CancellationToken): Promise<void> {
    const cfg = getConfig();

    // Process CSS files with concurrency limit
    await this.processWithConcurrency(this.cssFiles, async (file) => {
      if (token?.isCancellationRequested) return;
      try {
        const text = await this.readFileContent(file);
        if (!text) return;

        // Bug #3: .sass uses indented syntax — skip it, postcss-scss can't parse it
        const isSASS = file.fsPath.endsWith('.sass');
        if (isSASS) return;

        const isSCSS = file.fsPath.endsWith('.scss');
        this.processCSSContent(text, file, isSCSS, 0, { source: 'stylesheet' });
      } catch (error) {
        console.error(`Error parsing file ${file.fsPath}:`, error);
      }
    }, CONCURRENCY_LIMIT);

    if (cfg.scanStyleBlocks) {
      await this.processWithConcurrency(this.codeFiles, async (file) => {
        if (token?.isCancellationRequested) return;
        try {
          const text = await this.readFileContent(file);
          if (!text) return;

          const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
          let match: RegExpExecArray | null;
          while ((match = styleRegex.exec(text)) !== null) {
            const attributes = match[1];
            const styleContent = match[2];

            // Bug #1: lineOffset is only the lines before the match start + the lines
            // within the opening tag (up to the closing >). PostCSS line 1 corresponds
            // to the first line of styleContent (match[2]), which starts right after >.
            const matchStartOffset = match.index;
            const openingTagEnd = match[0].indexOf('>') + 1;
            const textUpToContent = text.substring(0, matchStartOffset + openingTagEnd);
            const lineOffset = (textUpToContent.match(/\n/g) || []).length;

            const isSCSS = /lang\s*=\s*["']scss["']/i.test(attributes);
            const isScoped = /\bscoped\b/i.test(attributes);
            this.processCSSContent(styleContent, file, isSCSS, lineOffset, {
              source: 'inline-style',
              scoped: isScoped
            });
          }

          if (cfg.scanCssInJs) {
            const cssLiteralRegex = /css`([\s\S]*?)`/gi;
            while ((match = cssLiteralRegex.exec(text)) !== null) {
              const styleContent = match[1];
              const textBefore = text.substring(0, match.index);
              const lineOffset = (textBefore.match(/\n/g) || []).length;
              this.processCSSContent(styleContent, file, false, lineOffset, { source: 'css-in-js' });
            }
          }
        } catch (error) {
          console.error(`Error parsing file ${file.fsPath} for styles:`, error);
        }
      }, CONCURRENCY_LIMIT);
    }
  }

  /**
   * Process an array of items with a concurrency limit.
   */
  private async processWithConcurrency<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    limit: number
  ): Promise<void> {
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const p = processor(item).catch(() => { /* ignore */ });
      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
        // Remove resolved promises
        for (let i = executing.length - 1; i >= 0; i--) {
          // Check if promise is settled by racing with an immediate resolve
          const settled = await Promise.race([
            executing[i].then(() => true),
            Promise.resolve(false)
          ]);
          if (settled) {
            executing.splice(i, 1);
          }
        }
      }
    }

    await Promise.all(executing);
  }

  private processCSSContent(
    text: string,
    file: vscode.Uri,
    isSCSS: boolean,
    lineOffset: number,
    context: { source: 'stylesheet' | 'inline-style' | 'css-in-js'; scoped?: boolean }
  ): void {
    try {
      const root: Root = postcss.parse(text, { syntax: isSCSS ? postcssScss : undefined } as any);

      // Feature: @extend/@apply awareness — collect extended classes
      root.walkAtRules(atRule => {
        if (atRule.name === 'extend') {
          // @extend .className or @extend .className !optional
          const extendMatch = atRule.params.match(/\.([a-zA-Z_][\w-]*)/);
          if (extendMatch) {
            this.extendedClasses.add(extendMatch[1]);
          }
        } else if (atRule.name === 'apply') {
          // @apply bg-red-500 text-white
          const applyClasses = atRule.params.split(/\s+/);
          for (const cls of applyClasses) {
            const cleanCls = cls.replace(/^[.!]/, ''); // remove dot or !important if present
            if (cleanCls) {
              this.extendedClasses.add(cleanCls);
            }
          }
        }
      });

      root.walkRules((rule: Rule) => {
        const prevNode = rule.prev();
        if (prevNode && prevNode.type === 'comment' && (prevNode as any).text?.includes('css-unused-ignore')) {
          return;
        }

        let current: any = rule.parent;
        let isKeyframes = false;
        while (current) {
          if (current.type === 'atrule' && current.name?.match(/keyframes/i)) {
            isKeyframes = true;
            break;
          }
          current = current.parent;
        }
        if (isKeyframes) {
          return;
        }

        const selector = rule.selector;
        const startLine = (rule.source?.start?.line ?? 1) - 1 + lineOffset;
        const startChar = (rule.source?.start?.column ?? 1) - 1;
        const endLine = (rule.source?.end?.line ?? 1) - 1 + lineOffset;
        const endChar = rule.source?.end?.column ?? 1;

        const range = new vscode.Range(
          new vscode.Position(startLine, startChar),
          new vscode.Position(endLine, endChar)
        );

        // Feature: SCSS nesting resolution
        let resolvedSelectors: string[] | undefined;
        if (isSCSS && rule.parent && rule.parent.type === 'rule') {
          try {
            resolvedSelectors = resolveNestedSelector(rule);
          } catch {
            // Fallback: use selector as-is
          }
        }

        // Use resolved selectors for extraction if available, otherwise original
        const selectorToExtract = resolvedSelectors && resolvedSelectors.length > 0
          ? resolvedSelectors.join(', ')
          : selector;

        const extractedMeta = this.extractSelectorsFromRuleCached(selectorToExtract);
        if (extractedMeta.parts.length === 0) {
          return;
        }

        // Calculate specificity
        const specificity = calculateSpecificity(selector);

        for (const ext of extractedMeta.parts) {
          const key = `${ext.type}:${ext.value}`;
          if (!this.selectors.has(key)) {
            this.selectors.set(key, []);
          }
          this.selectors.get(key)!.push({
            selector,
            file,
            line: startLine,
            used: false,
            useCount: 0,
            locations: [],
            range,
            source: context.source,
            scoped: context.scoped,
            externalOnly: ext.externalOnly,
            partsCount: extractedMeta.requiredAtoms.length,
            requiredAtoms: extractedMeta.requiredAtoms,
            hasCombinator: extractedMeta.hasCombinator,
            canBeConfirmedStatically: extractedMeta.canBeConfirmedStatically,
            selectorGroups: extractedMeta.groups.map(g => g.selector),
            groupCount: extractedMeta.groups.length,
            matchedGroupsCount: 0,
            hasSelectorList: extractedMeta.hasSelectorList,
            specificity,
            resolvedSelectors
          });
        }
      });
    } catch (error) {
      console.error(`Error processing CSS content in ${file.fsPath}:`, error);
    }
  }

  /**
   * Cached version of extractSelectorsFromRule to avoid double parsing in getResults.
   */
  private extractSelectorsFromRuleCached(selector: string): ExtractedSelectorMeta {
    const cached = this.selectorMetaCache.get(selector);
    if (cached) return cached;

    const meta = this.extractSelectorsFromRule(selector);
    this.selectorMetaCache.set(selector, meta);
    return meta;
  }

  private extractSelectorsFromRule(selector: string): ExtractedSelectorMeta {
    const cfg = getConfig();
    const groups: SelectorGroupMeta[] = [];

    const isFalsePositive = (val: string) => {
      if (!val) return true;
      const lower = val.toLowerCase();
      if (lower === 'from' || lower === 'to' || /^\d+%$/.test(lower)) return true;
      if (lower.startsWith('@') || lower === '&') return true;
      if (lower === 'global' || lower === 'deep' || lower === 'v-deep' || lower === 'v-global') return true;
      return false;
    };

    try {
      selectorParser(selectors => {
        selectors.each(selectorNode => {
          const parts: ExtractedSelectorPart[] = [];
          const atomSet = new Set<string>();
          let hasCombinator = false;

          const addPart = (type: 'class' | 'id' | 'tag', value: string, externalOnly: boolean) => {
            const normalized = type === 'tag' ? value.toLowerCase() : value;
            const atomKey = `${type}:${normalized}`;
            if (atomSet.has(atomKey)) {
              return;
            }
            atomSet.add(atomKey);
            parts.push({ type, value: normalized, externalOnly });
          };

          selectorNode.walk(node => {
            if (node.type === 'combinator') {
              hasCombinator = true;
            }

            if (node.type === 'class') {
              const value = String(node.value || '');
              if (!isFalsePositive(value)) {
                addPart(
                  'class',
                  value,
                  this.isInsideDeepOrGlobal(node as SelectorAstNode) || this.isAfterDeepOrGlobalPseudo(node as SelectorAstNode)
                );
              }
              return;
            }

            if (node.type === 'id') {
              const value = String(node.value || '');
              if (!isFalsePositive(value)) {
                addPart(
                  'id',
                  value,
                  this.isInsideDeepOrGlobal(node as SelectorAstNode) || this.isAfterDeepOrGlobalPseudo(node as SelectorAstNode)
                );
              }
              return;
            }

            if (cfg.scanTags && node.type === 'tag') {
              const value = String(node.value || '');
              if (!isFalsePositive(value)) {
                addPart(
                  'tag',
                  value,
                  this.isInsideDeepOrGlobal(node as SelectorAstNode) || this.isAfterDeepOrGlobalPseudo(node as SelectorAstNode)
                );
              }
            }
          });

          const normalizedSelector = selectorNode.toString().trim();
          if (parts.length > 0) {
            groups.push({
              selector: normalizedSelector,
              parts,
              requiredAtoms: parts.map(p => `${p.type}:${p.value}`),
              hasCombinator,
              canBeConfirmedStatically: !hasCombinator && parts.length > 0
            });
          }
        });
      }).processSync(selector);
    } catch (error) {
      console.error(`Error extracting selectors from "${selector}":`, error);
    }

    const allPartsMap = new Map<string, ExtractedSelectorPart>();
    for (const group of groups) {
      for (const part of group.parts) {
        const key = `${part.type}:${part.value}`;
        if (!allPartsMap.has(key)) {
          allPartsMap.set(key, part);
        }
      }
    }

    const parts = Array.from(allPartsMap.values());
    const requiredAtoms = Array.from(allPartsMap.keys());
    const hasCombinator = groups.some(g => g.hasCombinator);
    const canBeConfirmedStatically = groups.length === 1 && groups[0].canBeConfirmedStatically;
    const hasSelectorList = groups.length > 1;

    return {
      groups,
      parts,
      requiredAtoms,
      hasCombinator,
      canBeConfirmedStatically,
      hasSelectorList
    };
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
      if (current.type === 'pseudo' && this.isDeepOrGlobalPseudo(String(current.value || ''))) {
        return true;
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
    const classLocations = new Map<string, vscode.Location[]>();
    const idLocations = new Map<string, vscode.Location[]>();
    const tagLocations = new Map<string, vscode.Location[]>();

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

    // Feature: @extend — mark extended classes as used candidates
    for (const extClass of this.extendedClasses) {
      if (classNames.has(extClass)) {
        // Add a synthetic location so the extended class is considered used
        const syntheticLoc = new vscode.Location(
          vscode.Uri.parse('internal:@extend'),
          new vscode.Range(0, 0, 0, 0)
        );
        let arr = classLocations.get(extClass);
        if (!arr) {
          arr = [];
          classLocations.set(extClass, arr);
        }
        arr.push(syntheticLoc);
      }
    }

    const cfg = getConfig();

    // Use extractor-based scanning with concurrency
    await this.processWithConcurrency(this.codeFiles, async (codeFile) => {
      if (token?.isCancellationRequested) return;
      try {
        const text = await this.readFileContent(codeFile);
        if (!text) return;

        const scanText = this.maskStyleBlocks(text);
        const lineStarts = buildLineStarts(scanText);

        const classGroups = new Set<string>();

        const ctx: ScanContext = {
          text: scanText,
          uri: codeFile,
          lineStarts,
          classNames,
          idNames,
          tagNames,
          classLocations,
          idLocations,
          tagLocations,
          classGroups,
          cfg
        };

        for (const extractor of this.extractors) {
          if (extractor.shouldScan(ctx)) {
            extractor.scan(ctx);
          }
        }

        if (classGroups.size > 0) {
          this.fileClassGroups.set(codeFile.fsPath, classGroups);
        }
      } catch (error) {
        console.error(`Error reading file ${codeFile.fsPath}:`, error);
      }
    }, CONCURRENCY_LIMIT);

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

  private getResults(): AnalysisResult {
    const mergedByRule = new Map<string, CSSSelector & { atomUsage: Set<string> }>();

    for (const [atomKey, selectorsList] of this.selectors) {
      for (const selector of selectorsList) {
        // Bug #4: Add startChar to ruleKey to disambiguate selectors on the same line
        const startChar = selector.range?.start.character ?? 0;
        const ruleKey = `${selector.file.fsPath}:${selector.line}:${startChar}:${selector.selector}`;
        const existing = mergedByRule.get(ruleKey);

        if (!existing) {
          mergedByRule.set(ruleKey, {
            ...selector,
            // Bug #2: Keep locations even for combinators (as probable references)
            locations: [...selector.locations],
            atomUsage: selector.used ? new Set([atomKey]) : new Set<string>()
          });
          continue;
        }

        if (selector.used) {
          existing.atomUsage.add(atomKey);
        }

        existing.requiredAtoms = selector.requiredAtoms || existing.requiredAtoms;
        existing.partsCount = selector.partsCount || existing.partsCount;
        existing.hasCombinator = selector.hasCombinator ?? existing.hasCombinator;
        existing.canBeConfirmedStatically = selector.canBeConfirmedStatically ?? existing.canBeConfirmedStatically;
        existing.selectorGroups = selector.selectorGroups || existing.selectorGroups;
        existing.groupCount = selector.groupCount || existing.groupCount;
        existing.hasSelectorList = selector.hasSelectorList ?? existing.hasSelectorList;
        existing.specificity = selector.specificity || existing.specificity;
        existing.resolvedSelectors = selector.resolvedSelectors || existing.resolvedSelectors;

        // Bug #2: Always merge locations (even for combinators)
        existing.locations = this.sortAndDeduplicateLocations(
          [...existing.locations, ...selector.locations],
          existing.file.fsPath
        );
      }
    }

    const unused: CSSSelector[] = [];
    const used: CSSSelector[] = [];

    for (const selector of mergedByRule.values()) {
      const groupStrings = selector.selectorGroups && selector.selectorGroups.length > 0
        ? selector.selectorGroups
        : [selector.selector];

      // Perf: Use cached meta instead of re-parsing
      const groupAnalyses = groupStrings.map(group => this.extractSelectorsFromRuleCached(group));

      let matchedGroupsCount = 0;
      let anyProbable = false;
      let anyConfirmed = false;

      for (const analysis of groupAnalyses) {
        const group = analysis.groups[0];
        if (!group || group.requiredAtoms.length === 0) {
          continue;
        }

        const groupMatched = group.requiredAtoms.every(atom => selector.atomUsage.has(atom));
        if (!groupMatched) {
          continue;
        }

        matchedGroupsCount += 1;
        if (group.canBeConfirmedStatically) {
          anyConfirmed = true;
        } else {
          anyProbable = true;
        }
      }

      selector.matchedGroupsCount = matchedGroupsCount;

      if (matchedGroupsCount === 0) {
        selector.used = false;
        selector.status = 'unused';
        selector.useCount = 0;
        selector.locations = [];
        // Confidence for unused selectors
        selector.confidence = 0;
        unused.push(selector);
        continue;
      }

      selector.used = true;

      if (selector.hasSelectorList) {
        if (!anyProbable && anyConfirmed && !selector.hasCombinator) {
          selector.status = 'confirmed';
          selector.useCount = selector.locations.length;
        } else {
          selector.status = 'probable';
          // Bug #2: Keep locations for probable matches
          selector.useCount = selector.locations.length;
        }
        used.push(selector);
      } else if (selector.hasCombinator) {
        // Bug #2: Keep locations as probable references instead of clearing them
        selector.status = 'probable';
        selector.useCount = selector.locations.length;
      } else {
        selector.status = selector.canBeConfirmedStatically ? 'confirmed' : 'probable';
        selector.useCount = selector.locations.length;
      }

      // Calculate confidence score
      const sameFileMatch = selector.locations.some(
        loc => loc.uri.fsPath === selector.file.fsPath
      );

      let colocatedClasses = false;
      let isSingleAtom = true;
      for (const analysis of groupAnalyses) {
        const group = analysis.groups[0];
        if (!group) continue;
        
        if (group.parts.length > 1 || selector.hasCombinator) {
          isSingleAtom = false;
        }

        const classParts = group.parts.filter(p => p.type === 'class').map(p => p.value);
        if (classParts.length > 1) {
          for (const loc of selector.locations) {
            const groups = this.fileClassGroups.get(loc.uri.fsPath);
            if (groups) {
              for (const g of groups) {
                // Check if all class parts are found as whole words in this class group
                const allPresent = classParts.every(c => new RegExp(`\\b${c}\\b`).test(g));
                if (allPresent) {
                  colocatedClasses = true;
                  break;
                }
              }
            }
            if (colocatedClasses) break;
          }
        }
        if (colocatedClasses) break;
      }

      const factors: Partial<ConfidenceFactors> = {
        allAtomsFound: matchedGroupsCount > 0,
        sameFileMatch,
        noCombinators: !selector.hasCombinator,
        colocatedClasses,
        staticReference: true,
        isSingleAtom
      };
      selector.confidence = calculateConfidence(selector, factors);

      if (!selector.hasSelectorList) {
        used.push(selector);
      }
    }

    return {
      unused,
      used,
      total: used.length + unused.length
    };
  }
}