import { UsageExtractor, ScanContext, addLocation } from './types';

export class VueExtractor implements UsageExtractor {
  readonly name = 'vue';

  shouldScan(): boolean {
    return true; // Vue :class might appear in any .vue file
  }

  scan(ctx: ScanContext): void {
    this.scanObjectSyntax(ctx);
    this.scanArraySyntax(ctx);
  }

  private scanObjectSyntax(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    // :class="{ 'active': isActive, disabled: !enabled }"
    // v-bind:class="{ 'active': isActive }"
    const objRegex = /(?::class|v-bind:class)\s*=\s*"\{([^}]*)\}"/g;
    let m: RegExpExecArray | null;
    while ((m = objRegex.exec(text)) !== null) {
      const objContent = m[1];
      const objStart = m.index + m[0].indexOf(objContent);
      // Match both quoted and unquoted keys
      const keyRegex = /(?:['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"](\s*:))|(?:([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:))/g;
      let km: RegExpExecArray | null;
      while ((km = keyRegex.exec(objContent)) !== null) {
        const name = km[1] ?? km[3];
        if (name && classNames.has(name)) {
          const nameOffset = km[1] ? km.index + 1 : km.index; // +1 for quote
          addLocation(classLocations, name, uri, lineStarts, objStart + nameOffset, name.length);
        }
      }
    }
  }

  private scanArraySyntax(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    // :class="['active', conditionalVar]"
    const arrRegex = /(?::class|v-bind:class)\s*=\s*"\[([^\]]*)\]"/g;
    let m: RegExpExecArray | null;
    while ((m = arrRegex.exec(text)) !== null) {
      const arrContent = m[1];
      const arrStart = m.index + m[0].indexOf(arrContent);
      // Extract string literals from array
      const strRegex = /['"]([a-zA-Z_][a-zA-Z0-9_\s-]+)['"]/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(arrContent)) !== null) {
        const classStr = sm[1];
        
        if (classStr.trim()) {
          ctx.classGroups.add(classStr);
        }

        const classStrStart = arrStart + sm.index + 1;
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_-]*/g;
        let wm: RegExpExecArray | null;
        while ((wm = wordRegex.exec(classStr)) !== null) {
          if (classNames.has(wm[0])) {
            addLocation(classLocations, wm[0], uri, lineStarts, classStrStart + wm.index, wm[0].length);
          }
        }
      }
      // Also look for object syntax inside array: [{ 'name': cond }]
      const innerObjRegex = /\{([^}]*)\}/g;
      let om: RegExpExecArray | null;
      while ((om = innerObjRegex.exec(arrContent)) !== null) {
        const objContent = om[1];
        const objStart2 = arrStart + om.index + 1;
        const keyRegex = /['"]([a-zA-Z_][a-zA-Z0-9_-]*)['"]/g;
        let km: RegExpExecArray | null;
        while ((km = keyRegex.exec(objContent)) !== null) {
          const name = km[1];
          if (name && classNames.has(name)) {
            addLocation(classLocations, name, uri, lineStarts, objStart2 + km.index + 1, name.length);
          }
        }
      }
    }
  }
}
