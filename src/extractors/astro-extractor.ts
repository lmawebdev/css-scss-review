import { UsageExtractor, ScanContext, addLocation } from './types';

export class AstroExtractor implements UsageExtractor {
  readonly name = 'astro';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanAstroPatterns;
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    let m: RegExpExecArray | null;

    const astroRegex = /class:list\s*=\s*{\s*\[([^\]]*)\]/g;
    while ((m = astroRegex.exec(text)) !== null) {
      const arrContent = m[1];
      const arrStart = m.index + m[0].indexOf(arrContent);
      const strRegex = /['"]([a-zA-Z_][a-zA-Z0-9_\s-]*)['"]/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(arrContent)) !== null) {
        const classStr = sm[1];
        const classStrStart = arrStart + sm.index + 1;
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
