import { UsageExtractor, ScanContext, addLocation } from './types';

export class AngularExtractor implements UsageExtractor {
  readonly name = 'angular';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanAngularPatterns;
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    let m: RegExpExecArray | null;

    const ngClassObjRegex = /\[ngClass\]\s*=\s*"\{([^}]*)\}"/g;
    while ((m = ngClassObjRegex.exec(text)) !== null) {
      const objContent = m[1];
      const objStart = m.index + m[0].indexOf(objContent);
      const keyRegex = /['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"]/g;
      let km: RegExpExecArray | null;
      while ((km = keyRegex.exec(objContent)) !== null) {
        const name = km[1];
        if (classNames.has(name)) {
          addLocation(classLocations, name, uri, lineStarts, objStart + km.index + 1, name.length);
        }
      }
    }
  }
}
