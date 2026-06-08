import { UsageExtractor, ScanContext, addLocation } from './types';

export class SvelteExtractor implements UsageExtractor {
  readonly name = 'svelte';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanSveltePatterns;
  }

  scan(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    let m: RegExpExecArray | null;

    // 1. Directiva class:nombre y shorthand class:nombre
    const svelteRegex = /\bclass:([a-zA-Z_][a-zA-Z0-9_-]*)/g;
    while ((m = svelteRegex.exec(text)) !== null) {
      const name = m[1];
      if (classNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name);
        addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }

    // 2. Reactividad en class={...} con arrays u objetos (Svelte >= 5.16 o expresiones generales)
    const classAttrRegex = /\bclass\s*=\s*\{\s*([^{}]+)\s*\}/g;
    while ((m = classAttrRegex.exec(text)) !== null) {
      const expression = m[1];
      const exprStart = m.index + m[0].indexOf(expression);

      // Extract all string literals inside single, double quotes or backticks inside the expression
      const strRegex = /(['"`])(.*?)\1/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(expression)) !== null) {
        const classStr = sm[2];
        const classStrStart = exprStart + sm.index + 1; // +1 for quote

        if (classStr.trim()) {
          ctx.classGroups.add(classStr);
        }

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
