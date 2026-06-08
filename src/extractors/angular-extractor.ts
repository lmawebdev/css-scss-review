import { UsageExtractor, ScanContext, addLocation } from './types';

export class AngularExtractor implements UsageExtractor {
  readonly name = 'angular';

  shouldScan(ctx: ScanContext): boolean {
    return ctx.cfg.scanAngularPatterns;
  }

  scan(ctx: ScanContext): void {
    this.scanClassBinding(ctx);
    this.scanNgClass(ctx);
    this.scanHostBinding(ctx);
    this.scanRenderer2(ctx);
  }

  // ─── [class.className]="condition" ───────────────────────────────────────

  private scanClassBinding(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    const classPropRegex = /\[class\.([a-zA-Z_][a-zA-Z0-9_-]*)\]/g;
    let m: RegExpExecArray | null;
    while ((m = classPropRegex.exec(text)) !== null) {
      const name = m[1];
      if (classNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name);
        addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }
  }

  // ─── [ngClass]="..." / [class]="..." ─────────────────────────────────────

  private scanNgClass(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    const ngClassRegex = /\[(?:ngClass|class)\]\s*=\s*"([\s\S]*?)"/g;
    let m: RegExpExecArray | null;
    while ((m = ngClassRegex.exec(text)) !== null) {
      const expression = m[1];
      const exprStart = m.index + m[0].indexOf(expression);

      // String literals inside the expression
      const strRegex = /(['"`])([\s\S]*?)\1/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(expression)) !== null) {
        const classStr = sm[2];
        const classStrStart = exprStart + sm.index + 1;
        if (classStr.trim()) { ctx.classGroups.add(classStr); }
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(classStr)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
          }
        }
      }

      // Object keys: { 'class-name': cond } and { className: cond }
      const objKeyRegex = /(?:^|[,{(\s])(?:'([a-zA-Z_][a-zA-Z0-9_-]*)'|"([a-zA-Z_][a-zA-Z0-9_-]*)"|([a-zA-Z_][a-zA-Z0-9_-]*))\s*:/gm;
      let km: RegExpExecArray | null;
      while ((km = objKeyRegex.exec(expression)) !== null) {
        const name = km[1] ?? km[2] ?? km[3];
        if (name && classNames.has(name)) {
          const nameOffset = exprStart + km.index + km[0].indexOf(name);
          addLocation(classLocations, name, uri, lineStarts, nameOffset, name.length);
        }
      }
    }
  }

  // ─── @HostBinding('class.name') ──────────────────────────────────────────

  private scanHostBinding(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    // @HostBinding('class.className') or @HostBinding("class.className")
    const hostBindingRegex = /@HostBinding\s*\(\s*['"]class\.([a-zA-Z_][a-zA-Z0-9_-]*)['"]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = hostBindingRegex.exec(text)) !== null) {
      const name = m[1];
      if (classNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name);
        addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }

    // @HostBinding('className') — the whole class string
    const hostBindingClassRegex = /@HostBinding\s*\(\s*['"]className['"]\s*\)/g;
    // This pattern doesn't yield a specific class name, skip — handled via property value scanning
  }

  // ─── renderer.addClass(el, 'name') / renderer.removeClass(el, 'name') ────

  private scanRenderer2(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    // renderer.addClass(el, 'class-name') or renderer2.removeClass(el, 'class-name')
    const rendererRegex = /\b\w*[Rr]enderer\w*\s*\.\s*(?:addClass|removeClass)\s*\(\s*[^,)]+,\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = rendererRegex.exec(text)) !== null) {
      const name = m[1];
      if (classNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name, m[0].indexOf(','));
        addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }

    // renderer.setElementClass(el, 'class-name', bool) — Angular 2 legacy
    const setClassRegex = /\b\w*[Rr]enderer\w*\s*\.\s*setElementClass\s*\(\s*[^,)]+,\s*['"`]([a-zA-Z_][a-zA-Z0-9_-]*)['"`]/g;
    while ((m = setClassRegex.exec(text)) !== null) {
      const name = m[1];
      if (classNames.has(name)) {
        const nameStart = m.index + m[0].indexOf(name, m[0].indexOf(','));
        addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
      }
    }
  }
}
