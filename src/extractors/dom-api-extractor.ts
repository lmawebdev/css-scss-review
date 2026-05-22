import { UsageExtractor, ScanContext, addLocation } from './types';

export class DomApiExtractor implements UsageExtractor {
  readonly name = 'dom-api';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanDomApi;
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, idLocations, tagLocations, classNames, idNames, tagNames } = ctx;
    let m: RegExpExecArray | null;

    // classList API
    const classListRegex = /classList\s*\.\s*(?:add|remove|toggle|contains|replace)\s*\(([^)]+)\)/g;
    while ((m = classListRegex.exec(text)) !== null) {
      const argsContent = m[1];
      const argsStart = m.index + m[0].indexOf(argsContent);
      const strLitRegex = /['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"]/g;
      let sm: RegExpExecArray | null;
      while ((sm = strLitRegex.exec(argsContent)) !== null) {
        const name = sm[1];
        if (classNames.has(name)) {
          addLocation(classLocations, name, uri, lineStarts, argsStart + sm.index + 1, name.length);
        }
      }
    }

    // querySelector for classes and ids
    const qsRegex = /querySelector(?:All)?\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    while ((m = qsRegex.exec(text)) !== null) {
      const selectorStr = m[1];
      const selectorStart = m.index + m[0].indexOf(selectorStr);
      
      const dotClassRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
      let cm: RegExpExecArray | null;
      while ((cm = dotClassRegex.exec(selectorStr)) !== null) {
        const name = cm[1];
        if (classNames.has(name)) {
          addLocation(classLocations, name, uri, lineStarts, selectorStart + cm.index + 1, name.length);
        }
      }

      const hashIdRegex = /#([a-zA-Z_][a-zA-Z0-9_-]*)/g;
      let im: RegExpExecArray | null;
      while ((im = hashIdRegex.exec(selectorStr)) !== null) {
        const name = im[1];
        if (idNames.has(name)) {
          addLocation(idLocations, name, uri, lineStarts, selectorStart + im.index + 1, name.length);
        }
      }
    }

    // getElementById
    const getByIdRegex = /getElementById\s*\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*\)/g;
    while ((m = getByIdRegex.exec(text)) !== null) {
      const name = m[1];
      if (idNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name);
        addLocation(idLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }

    // getElementsByTagName / createElement
    if (tagNames.size > 0) {
      const getByTagRegex = /(?:getElementsByTagName(?:NS)?|createElement)\s*\(\s*(?:['"`][^'"`]*['"`]\s*,\s*)?['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*\)/g;
      while ((m = getByTagRegex.exec(text)) !== null) {
        const name = m[1];
        const nameLower = name.toLowerCase();
        const matchedName = tagNames.has(name) ? name : (tagNames.has(nameLower) ? nameLower : undefined);
        if (matchedName) {
          const nameStart = m.index + m[0].indexOf(name);
          addLocation(tagLocations, matchedName, uri, lineStarts, nameStart, name.length);
        }
      }
    }
  }
}
