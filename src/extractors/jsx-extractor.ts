import { UsageExtractor, ScanContext, addLocation } from './types';

export class JsxExtractor implements UsageExtractor {
  readonly name = 'jsx';

  shouldScan(_ctx: ScanContext): boolean {
    return true;
  }

  scan(ctx: ScanContext): void {
    this.scanTemplateLiterals(ctx);
    this.scanTernaryExpressions(ctx);
    this.scanClsxClassnames(ctx);
    this.scanClassnameVariables(ctx);
    this.scanCvaVariants(ctx);
    this.scanArrowFunctions(ctx);
  }

  // ─── Template literals: className={`...`} ────────────────────────────────

  private scanTemplateLiterals(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    const templateRegex = /\b(?:class|className)\s*=\s*\{\s*`([^`]*)`\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = templateRegex.exec(text)) !== null) {
      const template = m[1];
      const templateStart = m.index + m[0].indexOf(template);
      this.extractFromTemplate(ctx, template, templateStart);
    }
  }

  // ─── Ternary expressions: className={cond ? 'a' : 'b'} ───────────────────
  // Supports multiline, nested ternaries, and multiple class tokens per branch.

  private scanTernaryExpressions(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    // Match the entire className={...} expression block (up to 800 chars, dotAll via [\s\S])
    const exprRegex = /\b(?:class|className)\s*=\s*\{([\s\S]{1,800}?)\}/g;
    let m: RegExpExecArray | null;

    while ((m = exprRegex.exec(text)) !== null) {
      const expr = m[1];
      // Only process expressions that contain ternaries
      if (!expr.includes('?')) { continue; }

      const exprStart = m.index + m[0].indexOf(expr);
      this.extractStringLiteralsFromExpression(ctx, expr, exprStart);
    }
  }

  /**
   * Recursively extracts all string literals from a JS expression.
   * Handles ternaries, nested ternaries, logical &&, and simple strings.
   */
  private extractStringLiteralsFromExpression(
    ctx: ScanContext,
    expr: string,
    exprStart: number
  ): void {
    const { uri, lineStarts, classLocations, classNames } = ctx;
    const strRegex = /(['"`])([\s\S]*?)\1/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRegex.exec(expr)) !== null) {
      const content = sm[2];
      if (!content.trim()) { continue; }
      ctx.classGroups.add(content);
      const contentStart = exprStart + sm.index + 1;
      const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRegex.exec(content)) !== null) {
        if (classNames.has(wm[0])) {
          addLocation(classLocations, wm[0], uri, lineStarts, contentStart + wm.index, wm[0].length);
        }
      }
    }
  }

  // ─── clsx / classnames / cn / cx ─────────────────────────────────────────

  private scanClsxClassnames(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    // Allow nested parens up to 2 levels deep via repeated non-paren content
    const clsxRegex = /\b(?:clsx|classnames|classNames|cn|cx|cva)\s*\(([\s\S]{1,1000}?)\)(?=\s*[;,)\]}\n])/g;
    let m: RegExpExecArray | null;

    while ((m = clsxRegex.exec(text)) !== null) {
      const argsContent = m[1];
      const argsStart = m.index + m[0].indexOf(argsContent);

      // String literals (single, double, backtick)
      const strRegex = /(['"`])([\s\S]*?)\1/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(argsContent)) !== null) {
        const classStr = sm[2];
        if (!classStr.trim()) { continue; }
        ctx.classGroups.add(classStr);
        const classStrStart = argsStart + sm.index + 1;
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(classStr)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
          }
        }
      }

      // Object keys: { 'class-name': cond } or { className: cond }
      const objKeyRegex = /(?:^|[,{([\s])(?:'([a-zA-Z_][a-zA-Z0-9_-]*)'|"([a-zA-Z_][a-zA-Z0-9_-]*)"|`([a-zA-Z_][a-zA-Z0-9_-]*)`|([a-zA-Z_][a-zA-Z0-9_-]*))\s*:/gm;
      let km: RegExpExecArray | null;
      while ((km = objKeyRegex.exec(argsContent)) !== null) {
        const name = km[1] ?? km[2] ?? km[3] ?? km[4];
        if (name && classNames.has(name)) {
          const nameOffset = argsStart + km.index + km[0].indexOf(name);
          addLocation(classLocations, name, uri, lineStarts, nameOffset, name.length);
        }
      }

      // Short-circuit: isActive && 'class-name'
      const shortCircuitRegex = /&&\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]/g;
      let scm: RegExpExecArray | null;
      while ((scm = shortCircuitRegex.exec(argsContent)) !== null) {
        const name = scm[1];
        if (classNames.has(name)) {
          const nameStart = argsStart + scm.index + scm[0].indexOf(name);
          addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
        }
      }
    }
  }

  // ─── Variable assignments ─────────────────────────────────────────────────

  private scanClassnameVariables(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    // Template literal: const/let/var <varName> = `...`
    const varTemplateRegex = /(?:const|let|var)\s+\w+\s*=\s*`([^`]*)`/g;
    let m: RegExpExecArray | null;
    while ((m = varTemplateRegex.exec(text)) !== null) {
      const template = m[1];
      const templateStart = m.index + m[0].indexOf(template);
      this.extractFromTemplate(ctx, template, templateStart);
    }

    // String literal: const/let/var <varName> = 'class1 class2'
    const varStringRegex = /(?:const|let|var)\s+\w+\s*=\s*['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"](?!\s*[?:])/g;
    while ((m = varStringRegex.exec(text)) !== null) {
      const classStr = m[1];
      const classStrStart = m.index + m[0].indexOf(classStr);
      if (classStr.trim()) { ctx.classGroups.add(classStr); }
      const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRegex.exec(classStr)) !== null) {
        if (classNames.has(wm[0])) {
          addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
        }
      }
    }
  }

  // ─── Arrow functions returning class strings ──────────────────────────────
  // const getClass = () => 'btn-active'
  // const getClass = (x: boolean) => x ? 'active' : 'inactive'

  private scanArrowFunctions(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    // Arrow fn with direct string return: => 'class-name' or => "class-name"
    const arrowStrRegex = /=>\s*['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"](?!\s*[?:])/g;
    let m: RegExpExecArray | null;
    while ((m = arrowStrRegex.exec(text)) !== null) {
      const classStr = m[1];
      if (!classStr.trim()) { continue; }
      ctx.classGroups.add(classStr);
      const classStrStart = m.index + m[0].indexOf(classStr);
      const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRegex.exec(classStr)) !== null) {
        if (classNames.has(wm[0])) {
          addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
        }
      }
    }

    // Arrow fn with ternary: => cond ? 'a' : 'b'
    const arrowTernaryRegex = /=>\s*[\s\S]{0,60}?\?\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*:\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]/g;
    while ((m = arrowTernaryRegex.exec(text)) !== null) {
      for (const branch of [m[1], m[2]]) {
        if (!branch) { continue; }
        if (classNames.has(branch)) {
          const branchStart = m.index + m[0].indexOf(branch);
          addLocation(classLocations, branch, uri, lineStarts, branchStart, branch.length);
        }
      }
    }
  }

  // ─── CVA variants ─────────────────────────────────────────────────────────

  private scanCvaVariants(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    const cvaRegex = /\bcva\s*\([\s\S]{0,2000}?variants\s*:\s*\{([\s\S]{0,2000}?)\}/g;
    let m: RegExpExecArray | null;
    while ((m = cvaRegex.exec(text)) !== null) {
      const variantsBlock = m[1];
      const variantsStart = m.index + m[0].indexOf(variantsBlock);

      const strRegex = /:\s*['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"]|:\s*`([a-zA-Z_][a-zA-Z0-9_\s-]*)`/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(variantsBlock)) !== null) {
        const classStr = sm[1] ?? sm[2];
        if (!classStr?.trim()) { continue; }
        ctx.classGroups.add(classStr);
        const classStrStart = variantsStart + sm.index + sm[0].indexOf(classStr);
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

  // ─── Shared helper: extract from template literal content ─────────────────

  private extractFromTemplate(ctx: ScanContext, template: string, templateStart: number): void {
    const { uri, lineStarts, classLocations, classNames } = ctx;

    // Pre-compute interpolation ranges
    const interpolations: { start: number; end: number }[] = [];
    const interpolationRegex = /\$\{([^}]+)\}/g;
    let im: RegExpExecArray | null;
    while ((im = interpolationRegex.exec(template)) !== null) {
      interpolations.push({ start: im.index, end: im.index + im[0].length });
    }

    // Static words outside interpolations
    const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
    let wm: RegExpExecArray | null;
    while ((wm = wordRegex.exec(template)) !== null) {
      const ws = wm.index;
      const we = wm.index + wm[0].length;
      const inside = interpolations.some(ip => ws >= ip.start && we <= ip.end);
      if (!inside && classNames.has(wm[0])) {
        addLocation(classLocations, wm[0], uri, lineStarts, templateStart + wm.index, wm[0].length);
      }
    }

    // Add cleaned version to classGroups
    const cleaned = template.replace(/\$\{[^}]*\}/g, ' ');
    if (cleaned.trim()) { ctx.classGroups.add(cleaned); }

    // String literals inside interpolations: ${cond ? 'active' : 'inactive'}
    interpolationRegex.lastIndex = 0;
    while ((im = interpolationRegex.exec(template)) !== null) {
      const expression = im[1];
      const expressionStart = templateStart + im.index + 2; // account for `${`
      const strRegex = /(['"`])(.*?)\1/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(expression)) !== null) {
        const literalContent = sm[2];
        const literalStart = expressionStart + sm.index + 1;
        if (literalContent.trim()) { ctx.classGroups.add(literalContent); }
        const cwReg = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let lwm: RegExpExecArray | null;
        while ((lwm = cwReg.exec(literalContent)) !== null) {
          if (classNames.has(lwm[0])) {
            addLocation(classLocations, lwm[0], uri, lineStarts, literalStart + lwm.index, lwm[0].length);
          }
        }
      }
    }
  }
}
