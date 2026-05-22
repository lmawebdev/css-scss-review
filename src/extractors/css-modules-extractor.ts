import { UsageExtractor, ScanContext, addLocation } from './types';

export class CssModulesExtractor implements UsageExtractor {
  readonly name = 'css-modules';

  shouldScan(): boolean {
    return true;
  }

  scan(ctx: ScanContext): void {
    const { text, uri, lineStarts, classLocations, classNames } = ctx;
    
    // Find CSS module imports: import IDENT from '...module.css/scss/less'
    // Also: const IDENT = require('...module.css')
    const importRegex = /(?:import\s+(\w+)\s+from\s+['"][^'"]*\.module\.(?:css|scss|sass|less)['"])|(?:(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"][^'"]*\.module\.(?:css|scss|sass|less)['"]\s*\))/g;
    const styleVars: string[] = [];
    let m: RegExpExecArray | null;
    
    while ((m = importRegex.exec(text)) !== null) {
      const varName = m[1] ?? m[2];
      if (varName) {
        styleVars.push(varName);
      }
    }

    if (styleVars.length === 0) return;

    for (const varName of styleVars) {
      // Match styles.className (dot notation)
      const dotRegex = new RegExp(`\\b${this.escapeRegex(varName)}\\.(\\w[\\w-]*)`, 'g');
      while ((m = dotRegex.exec(text)) !== null) {
        const name = m[1];
        if (classNames.has(name)) {
          const nameStart = m.index + m[0].indexOf(name);
          addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
        }
      }

      // Match styles['class-name'] or styles["class-name"] (bracket notation)
      const bracketRegex = new RegExp(`\\b${this.escapeRegex(varName)}\\[\\s*['"]([\\w][\\w-]*)['"]\\s*\\]`, 'g');
      while ((m = bracketRegex.exec(text)) !== null) {
        const name = m[1];
        if (classNames.has(name)) {
          const nameStart = m.index + m[0].indexOf(name);
          addLocation(classLocations, name, uri, lineStarts, nameStart, name.length);
        }
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
