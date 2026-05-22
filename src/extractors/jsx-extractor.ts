import { UsageExtractor, ScanContext, addLocation } from './types';

export class JsxExtractor implements UsageExtractor {
  readonly name = 'jsx';

  shouldScan(ctx: ScanContext): boolean {
    // Activate for all scanned files since JSX patterns might appear in them
    return true;
  }

  scan(ctx: ScanContext): void {
    this.scanTemplateLiterals(ctx);
    this.scanTernaryExpressions(ctx);
    this.scanClsxClassnames(ctx);
  }

  private scanTemplateLiterals(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    // Match className={`...`} and extract static string segments
    const templateRegex = /\b(?:class|className)\s*=\s*\{\s*`([^`]*)`\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = templateRegex.exec(text)) !== null) {
      const template = m[1];
      const templateStart = m.index + m[0].indexOf(template);
      // Remove ${...} expressions and extract remaining words
      const cleaned = template.replace(/\$\{[^}]*\}/g, ' ');
      
      if (cleaned.trim()) {
        ctx.classGroups.add(cleaned);
      }

      const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRegex.exec(cleaned)) !== null) {
        if (classNames.has(wm[0])) {
          addLocation(classLocations, wm[0], uri, lineStarts, templateStart + wm.index, wm[0].length);
        }
      }
    }
  }

  private scanTernaryExpressions(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    // Match className={cond ? 'value1' : 'value2'} patterns
    const ternaryRegex = /\b(?:class|className)\s*=\s*\{[^}]*\?\s*['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"]\s*:\s*['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"][^}]*\}/g;
    let m: RegExpExecArray | null;
    while ((m = ternaryRegex.exec(text)) !== null) {
      for (const branch of [m[1], m[2]]) {
        if (!branch) continue;
        const branchStart = m.index + m[0].indexOf(branch);
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(branch)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, branchStart + wm.index, wm[0].length);
          }
        }
      }
    }
  }

  private scanClsxClassnames(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    // Match clsx(...), classnames(...), classNames(...), cn(...), cx(...)
    const clsxRegex = /\b(?:clsx|classnames|classNames|cn|cx|cva)\s*\(([^)]{1,500})\)/g;
    let m: RegExpExecArray | null;
    while ((m = clsxRegex.exec(text)) !== null) {
      const argsContent = m[1];
      const argsStart = m.index + m[0].indexOf(argsContent);
      // Extract string literals from arguments
      const strRegex = /['"]([a-zA-Z_][a-zA-Z0-9_\s-]+)['"]/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(argsContent)) !== null) {
        const classStr = sm[1];
        
        if (classStr.trim()) {
          ctx.classGroups.add(classStr);
        }

        const classStrStart = argsStart + sm.index + 1;
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(classStr)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
          }
        }
      }
    }
  }
}
