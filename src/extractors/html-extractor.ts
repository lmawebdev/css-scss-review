import { UsageExtractor, ScanContext, addLocation } from './types';

export class HtmlExtractor implements UsageExtractor {
  readonly name = 'html';

  shouldScan(): boolean {
    return true; // Always active
  }

  scan(ctx: ScanContext): void {
    this.scanClassAttributes(ctx);
    this.scanIdAttributes(ctx);
  }

  private scanClassAttributes(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    let m: RegExpExecArray | null;

    // Standard class/className attributes with string values
    const attrRegex = /\b(?:class|className|:class|v-bind:class|\[class\]|\[ngClass\])\s*=\s*(?:"([^"]*)"|'([^']*)'|{['"`]([^'"`]*)['"`]})/g;
    while ((m = attrRegex.exec(text)) !== null) {
      const value = m[1] ?? m[2] ?? m[3] ?? '';
      
      if (value.trim()) {
        ctx.classGroups.add(value);
      }

      const valueStart = m.index + m[0].indexOf(value);
      const classRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
      let cm: RegExpExecArray | null;
      while ((cm = classRegex.exec(value)) !== null) {
        const name = cm[0];
        if (classNames.has(name)) {
          addLocation(classLocations, name, uri, lineStarts, valueStart + cm.index, name.length);
        }
      }
    }
  }

  private scanIdAttributes(ctx: ScanContext): void {
    const { text, uri, lineStarts, idLocations, idNames } = ctx;
    let m: RegExpExecArray | null;

    const attrRegex = /\b(?:id|\[id\])\s*=\s*(?:"([^"]*)"|'([^']*)'|{['"`]([^'"`]*)['"`]})/g;
    while ((m = attrRegex.exec(text)) !== null) {
      const value = m[1] ?? m[2] ?? m[3] ?? '';
      if (idNames.has(value)) {
        const valueStart = m.index + m[0].indexOf(value);
        addLocation(idLocations, value, uri, lineStarts, valueStart, value.length);
      }
    }
  }
}
