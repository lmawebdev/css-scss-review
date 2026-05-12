# CSS/SCSS Unused Detector - Project Instructions

## Project Overview

This is a VS Code extension that detects unused CSS/SCSS selectors in web projects, supporting multiple frameworks (React, Vue, Angular, Astro, vanilla JavaScript, etc.).

## Architecture

### Core Components

1. **`extension.ts`** - Main extension entry point
   - Registers commands
   - Manages file watchers
   - Orchestrates analysis workflow

2. **`analyzer.ts`** - CSS/SCSS Analysis Engine
   - Finds all CSS/SCSS files
   - Extracts selectors (classes and IDs)
   - Scans code files for selector usage
   - Creates analysis report

3. **`diagnostics.ts`** - Diagnostic Display Manager
   - Manages VS Code diagnostics collection
   - Shows warnings for unused selectors
   - Updates in real-time

## Key Features Implemented

- ✅ Workspace-wide CSS/SCSS scanning
- ✅ Multi-framework support (React, Vue, Angular, Astro)
- ✅ Automatic detection of:
  - `.className` selectors
  - `#idName` selectors
- ✅ Real-time file watching
- ✅ Diagnostic warnings with line numbers
- ✅ Support for SCSS/SASS syntax

## How It Works

1. **File Discovery** - Uses VS Code FileSystemProvider to find:
   - CSS/SCSS files using patterns: `**/*.{css,scss,sass}`
   - Code files using patterns: `**/*.{js,jsx,ts,tsx,vue,html,astro}`

2. **Selector Extraction** - Uses PostCSS with SCSS support to parse CSS and extract:
   - Classes (`.className`)
   - IDs (`#idName`)
   - Line numbers

3. **Usage Detection** - Creates regex patterns to find selector usage in:
   - className/class attributes
   - id attributes
   - JavaScript/TypeScript imports and references
   - Template literals

4. **Diagnostics** - Reports unused selectors with:
   - DiagnosticTag.Unnecessary for proper coloring
   - DiagnosticSeverity.Warning
   - Exact file and line information

## Dependencies

- `postcss` - CSS parsing
- `postcss-scss` - SCSS support
- `postcss-selector-parser` - Selectors extraction
- VS Code API - UI and file system integration

## Development Setup

```bash
# Install dependencies
npm install

# Build in watch mode
npm run esbuild-watch

# Build for production
npm run vscode:prepublish

# Run tests
npm test
```

## Debugging

Press F5 to launch extension in debug mode. Changes auto-reload.

## Roadmap

- [ ] Custom ignore patterns
- [ ] Dynamic CSS detection
- [ ] Detailed statistics dashboard
- [ ] Export analysis report
- [ ] Refactoring integration
- [ ] LESS support
- [ ] Selector specificity analysis
- [ ] Performance optimizations
- [ ] Multi-workspace support
- [ ] Configuration UI

## Known Limitations

- Dynamic class concatenation not detected
- CSS-in-JS approaches may have false positives
- External library styles from node_modules excluded
- Complex selector patterns may be missed
- Performance may degrade on very large projects

## File Structure

```
css-scss-review/
├── src/
│   ├── extension.ts          # Entry point
│   ├── analyzer.ts           # Analysis logic
│   └── diagnostics.ts        # Diagnostics management
├── dist/
│   └── extension.js          # Compiled output
├── .vscode/
│   ├── launch.json          # Debug configuration
│   └── tasks.json           # Build tasks
├── .github/
│   └── copilot-instructions.md
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript config
├── .eslintrc.json          # Linter config
├── .gitignore              # Git ignore rules
├── README.md               # User documentation
└── EXAMPLES.md             # Usage examples
```

## Future Enhancements

### Short Term
1. Add configurable ignore patterns
2. Support for CSS custom properties
3. Statistics panel in VS Code sidebar

### Medium Term
1. Integration with refactoring tools
2. Batch delete unused selectors
3. CSS architecture analysis
4. Performance profiling

### Long Term
1. BDD plugin for style testing
2. Design token detection
3. Accessibility checking
4. Component library integration

## Contribution Guidelines

1. Follow TypeScript strict mode
2. Test changes with multiple frameworks
3. Test with large projects (>1000 CSS rules)
4. Document new features
5. Update README and examples

## Testing Scenarios

Test with:
- React project (hooks, function components)
- Vue 3 project (composition API)
- Angular project (components)
- Astro project (hybrid rendering)
- Vanilla JS + HTML
- Tailwind CSS projects
- Styled components / Emotion projects
- SCSS with nesting and mixins
- Large CSS files (10K+ lines)
- Multiple frameworks in monorepo
