import { UsageExtractor, ScanContext, addLocation } from './types';

export class VueExtractor implements UsageExtractor {
  readonly name = 'vue';

  shouldScan(): boolean {
    return true;
  }

  scan(ctx: ScanContext): void {
    this.scanObjectSyntax(ctx);
    this.scanArraySyntax(ctx);
    this.scanTemplateLiterals(ctx);
  }

  // ─── :class="{ 'active': isActive, disabled: !enabled }" ─────────────────

  private scanObjectSyntax(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    // Allow multiline via [\s\S] — cap at 800 chars for safety
    const objRegex = /(?::class|v-bind:class)\s*=\s*"(\{[\s\S]{0,800}?\})"/g;
    let m: RegExpExecArray | null;
    while ((m = objRegex.exec(text)) !== null) {
      const objBlock = m[1];
      const objContent = objBlock.slice(1, -1); // strip outer { }
      const objStart = m.index + m[0].indexOf(objContent);

      // Both quoted and unquoted keys
      const keyRegex = /(?:['\"]([a-zA-Z_][a-zA-Z0-9_-]*)['\"]\s*:)|(?:([a-zA-Z_][a-zA-Z0-9_-]*)\s*:)/g;
      let km: RegExpExecArray | null;
      while ((km = keyRegex.exec(objContent)) !== null) {
        const name = km[1] ?? km[2];
        if (name && classNames.has(name)) {
          const nameOffset = km[1] ? km.index + 1 : km.index;
          addLocation(classLocations, name, uri, lineStarts, objStart + nameOffset, name.length);
        }
      }
    }

    // Also handle static :class="'class-name'" shorthand
    const staticClassRegex = /(?::class|v-bind:class)\s*=\s*"'([a-zA-Z_][a-zA-Z0-9_\s-]*)'"|\s*=\s*"\"([a-zA-Z_][a-zA-Z0-9_\s-]*)""/g;
    while ((m = staticClassRegex.exec(text)) !== null) {
      const classStr = m[1] ?? m[2];
      if (!classStr?.trim()) { continue; }
      const classStrStart = m.index + m[0].indexOf(classStr);
      ctx.classGroups.add(classStr);
      const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRegex.exec(classStr)) !== null) {
        if (classNames.has(wm[0])) {
          addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
        }
      }
    }
  }

  // ─── :class="['active', conditionalVar, cond ? 'a' : 'b']" ──────────────

  private scanArraySyntax(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    // Use [\s\S] for multiline support, cap at 800 chars
    const arrRegex = /(?::class|v-bind:class)\s*=\s*"\[([\s\S]{0,800}?)\]"/g;
    let m: RegExpExecArray | null;
    while ((m = arrRegex.exec(text)) !== null) {
      const arrContent = m[1];
      const arrStart = m.index + m[0].indexOf(arrContent);

      // String literals in array
      const strRegex = /['\"]([a-zA-Z_][a-zA-Z0-9_\s-]+)['\"]/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(arrContent)) !== null) {
        const classStr = sm[1];
        if (classStr.trim()) { ctx.classGroups.add(classStr); }
        const classStrStart = arrStart + sm.index + 1;
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(classStr)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
          }
        }
      }

      // Object syntax inside array: [{ 'name': cond }]
      const innerObjRegex = /\{([\s\S]{0,400}?)\}/g;
      let om: RegExpExecArray | null;
      while ((om = innerObjRegex.exec(arrContent)) !== null) {
        const objContent = om[1];
        const objStart2 = arrStart + om.index + 1;
        const keyRegex = /['\"]([a-zA-Z_][a-zA-Z0-9_-]*)['\"]\s*:|([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/g;
        let km: RegExpExecArray | null;
        while ((km = keyRegex.exec(objContent)) !== null) {
          const name = km[1] ?? km[2];
          if (name && classNames.has(name)) {
            const nameOffset = km[1] ? km.index + 1 : km.index;
            addLocation(classLocations, name, uri, lineStarts, objStart2 + nameOffset, name.length);
          }
        }
      }

      // Ternary expressions inside array — capture BOTH branches
      // Pattern: ? 'trueBranch' : 'falseBranch'
      const ternaryRegex = /\?\s*['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"][\s\S]{0,30}?:\s*['"]([a-zA-Z_][a-zA-Z0-9_-]*)['\"]/g;
      let tm: RegExpExecArray | null;
      while ((tm = ternaryRegex.exec(arrContent)) !== null) {
        for (const name of [tm[1], tm[2]]) {
          if (name && classNames.has(name)) {
            const nameStart = arrStart + tm.index + tm[0].indexOf(name);
            addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
          }
        }
      }
    }
  }

  // ─── :class="`btn ${isPrimary ? 'btn-primary' : 'btn-secondary'}`" ───────

  private scanTemplateLiterals(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    const templateRegex = /(?::class|v-bind:class|class)\s*=\s*`([^`]*)`/g;
    let m: RegExpExecArray | null;
    while ((m = templateRegex.exec(text)) !== null) {
      const template = m[1];
      const templateStart = m.index + m[0].indexOf(template);

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

      // String literals inside interpolations
      interpolationRegex.lastIndex = 0;
      while ((im = interpolationRegex.exec(template)) !== null) {
        const expression = im[1];
        const expressionStart = templateStart + im.index + 2;
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
}
