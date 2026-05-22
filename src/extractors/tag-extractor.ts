import { UsageExtractor, ScanContext, addLocation } from './types';

export class TagExtractor implements UsageExtractor {
  readonly name = 'tag';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanTags && ctx.tagNames.size > 0;
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, tagLocations, tagNames } = ctx;
    let m: RegExpExecArray | null;

    const tagRegex = /<\s*([a-zA-Z_][a-zA-Z0-9_-]*)/g;
    while ((m = tagRegex.exec(text)) !== null) {
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
