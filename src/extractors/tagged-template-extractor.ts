import { UsageExtractor, ScanContext, addLocation } from './types';

/**
 * Detects CSS class usage in tagged template literals and utility-class composers.
 *
 * Covered patterns:
 *   tw`btn btn-primary text-white`
 *   twMerge('btn', 'btn-primary')
 *   ctl('btn btn-primary')
 *   tva({ base: 'btn', variants: { ... } })
 *   cx('a', 'b')
 *   tws`btn btn-primary`
 */

/** Default set of tagged template function names to scan. */
const DEFAULT_TAG_FNS = ['tw', 'tws', 'css', 'styled'];

/** Default set of composer function names to scan. */
const DEFAULT_COMPOSER_FNS = ['twMerge', 'ctl', 'tva', 'merge', 'composeClasses'];

export class TaggedTemplateExtractor implements UsageExtractor {
  readonly name = 'tagged-template';

  shouldScan(_ctx: ScanContext): boolean {
    return true;
  }

  scan(ctx: ScanContext): void {
    this.scanTaggedTemplates(ctx);
    this.scanComposerFunctions(ctx);
    this.scanStyledComponents(ctx);
  }

  // ─── tw`btn btn-primary` ─────────────────────────────────────────────────

  private scanTaggedTemplates(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    const fns = DEFAULT_TAG_FNS.join('|');
    // Match: tagFn`...content...` (with possible interpolations)
    const tagRegex = new RegExp(`\\b(?:${fns})\\s*\`([^\`]*)\``, 'g');
    let m: RegExpExecArray | null;

    while ((m = tagRegex.exec(text)) !== null) {
      const template = m[1];
      const templateStart = m.index + m[0].indexOf(template);

      // Pre-compute interpolation ranges to skip dynamic parts
      const interpolations: { start: number; end: number }[] = [];
      const interpRegex = /\$\{([^}]+)\}/g;
      let im: RegExpExecArray | null;
      while ((im = interpRegex.exec(template)) !== null) {
        interpolations.push({ start: im.index, end: im.index + im[0].length });
      }

      // Extract static class tokens outside interpolations
      const wordRegex = /[a-zA-Z_][a-zA-Z0-9_:-]*/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRegex.exec(template)) !== null) {
        const ws = wm.index;
        const we = wm.index + wm[0].length;
        const inside = interpolations.some(ip => ws >= ip.start && we <= ip.end);
        if (!inside && classNames.has(wm[0])) {
          addLocation(classLocations, wm[0], uri, lineStarts, templateStart + wm.index, wm[0].length);
        }
      }

      // Add whole static content for classGroups
      const cleaned = template.replace(/\$\{[^}]*\}/g, ' ');
      if (cleaned.trim()) { ctx.classGroups.add(cleaned); }

      // String literals inside interpolations
      interpRegex.lastIndex = 0;
      while ((im = interpRegex.exec(template)) !== null) {
        const expression = im[1];
        const expressionStart = templateStart + im.index + 2;
        const strRegex = /(['"`])(.*?)\1/g;
        let sm: RegExpExecArray | null;
        while ((sm = strRegex.exec(expression)) !== null) {
          const content = sm[2];
          const contentStart = expressionStart + sm.index + 1;
          if (content.trim()) { ctx.classGroups.add(content); }
          const cwReg = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
          let lwm: RegExpExecArray | null;
          while ((lwm = cwReg.exec(content)) !== null) {
            if (classNames.has(lwm[0])) {
              addLocation(classLocations, lwm[0], uri, lineStarts, contentStart + lwm.index, lwm[0].length);
            }
          }
        }
      }
    }
  }

  // ─── twMerge('btn', conditionalClass) ────────────────────────────────────

  private scanComposerFunctions(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;
    const fns = DEFAULT_COMPOSER_FNS.join('|');
    const composerRegex = new RegExp(`\\b(?:${fns})\\s*\\(([\\s\\S]{1,800}?)\\)(?=\\s*[;,)\\]{}\\n])`, 'g');
    let m: RegExpExecArray | null;

    while ((m = composerRegex.exec(text)) !== null) {
      const argsContent = m[1];
      const argsStart = m.index + m[0].indexOf(argsContent);

      // String literals
      const strRegex = /(['"`])([\s\S]*?)\1/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(argsContent)) !== null) {
        const classStr = sm[2];
        if (!classStr.trim()) { continue; }
        ctx.classGroups.add(classStr);
        const classStrStart = argsStart + sm.index + 1;
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(classStr)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
          }
        }
      }

      // Object keys: { 'name': cond } or { name: cond }
      const objKeyRegex = /(?:^|[,{(\s])(?:'([a-zA-Z_][a-zA-Z0-9_-]*)'|"([a-zA-Z_][a-zA-Z0-9_-]*)"|([a-zA-Z_][a-zA-Z0-9_-]*))\s*:/gm;
      let km: RegExpExecArray | null;
      while ((km = objKeyRegex.exec(argsContent)) !== null) {
        const name = km[1] ?? km[2] ?? km[3];
        if (name && classNames.has(name)) {
          const nameOffset = argsStart + km.index + km[0].indexOf(name);
          addLocation(classLocations, name, uri, lineStarts, nameOffset, name.length);
        }
      }
    }
  }

  // ─── styled.div`...` / styled(Component)`...` ────────────────────────────
  // Only scans @apply and class references, not CSS rules themselves
  // (CSS parsing is handled by the style block scanner in analyzer.ts).

  private scanStyledComponents(ctx: ScanContext): void {
    const { strippedText: text, uri, lineStarts, classLocations, classNames } = ctx;

    // styled.tag`...` or styled(X)`...`
    const styledRegex = /\bstyled(?:\.\w+|\([^)]*\))\s*`([\s\S]{0,2000}?)`/g;
    let m: RegExpExecArray | null;

    while ((m = styledRegex.exec(text)) !== null) {
      const template = m[1];
      const templateStart = m.index + m[0].indexOf(template);

      // @apply class-name
      const applyRegex = /@apply\s+([a-zA-Z_][a-zA-Z0-9_\s-]*)/g;
      let am: RegExpExecArray | null;
      while ((am = applyRegex.exec(template)) !== null) {
        const classStr = am[1];
        const classStrStart = templateStart + am.index + am[0].indexOf(classStr);
        if (classStr.trim()) { ctx.classGroups.add(classStr); }
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
