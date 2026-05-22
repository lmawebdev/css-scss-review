import { UsageExtractor, ScanContext, addLocation } from './types';

export class PugExtractor implements UsageExtractor {
  readonly name = 'pug';

  shouldScan(ctx: ScanContext): boolean {
    if (!ctx.cfg.scanPugPatterns) return false;
    const lowerPath = ctx.uri.fsPath.toLowerCase();
    if (lowerPath.endsWith('.pug') || lowerPath.endsWith('.jade') || lowerPath.endsWith('.slim') || lowerPath.endsWith('.haml')) {
      return true;
    }
    return /<template[^>]*\blang\s*=\s*["'](?:pug|jade|slim|haml)["'][^>]*>/i.test(ctx.text);
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    let m: RegExpExecArray | null;

    const pugRegex = /^[ \t]*(?:[a-zA-Z][a-zA-Z0-9]*)?(\.(?:[a-zA-Z_][a-zA-Z0-9_-]*)(?:\.(?:[a-zA-Z_][a-zA-Z0-9_-]*))*)/gm;
    while ((m = pugRegex.exec(text)) !== null) {
      const dotClasses = m[1];
      const dotStart = m.index + m[0].indexOf(dotClasses);
      const dotRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
      let dm: RegExpExecArray | null;
      while ((dm = dotRegex.exec(dotClasses)) !== null) {
        const name = dm[1];
        if (classNames.has(name)) {
          addLocation(classLocations, name, uri, lineStarts, dotStart + dm.index + 1, name.length);
        }
      }
    }
  }
}
