import { UsageExtractor, ScanContext, addLocation } from './types';

export class SvelteExtractor implements UsageExtractor {
  readonly name = 'svelte';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanSveltePatterns;
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    let m: RegExpExecArray | null;

    const svelteRegex = /\bclass:([a-zA-Z_][a-zA-Z0-9_-]*)/g;
    while ((m = svelteRegex.exec(text)) !== null) {
      const name = m[1];
      if (classNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name);
        addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }
  }
}
