# CSS/SCSS Unused Detector

A high-performance Visual Studio Code extension that automatically detects and highlights **unused CSS/SCSS/SASS selectors** across your entire project. It's built to be fast, accurate, and framework-agnostic.

---

## 🌟 Pro Features

- **Real-time Detection**: Analyzes your code as you type, with smart debouncing to keep the editor smooth.
- **Smart Hover Details**: Hover over any CSS class or ID to see exactly which files are using it and how many times.
- **Quick Fixes (Code Actions)**: See a class you want the detector to ignore? Click the 💡 icon (Quick Fix) to add a `/* css-unused-ignore */` comment. You can even choose to ignore all unused selectors in an entire file with one click!
- **Sidebar Explorer Panel**: A dedicated Tree View in your VS Code sidebar groups all unused CSS by file. Click a selector to jump instantly to that line of code.
- **Interactive Status Bar**: A discrete indicator in the bottom-right corner shows the health of your CSS at a glance.
- **Visual Highlights**: Unused CSS blocks are subtly highlighted so you can easily spot and remove dead code.
- **Reference CodeLens**: Displays the exact number of times a CSS class or ID is used right above the selector, with an icon matching your configured diagnostic severity.
- **Native Localization**: Fully supports English and Spanish. Settings automatically translate based on your VS Code Display Language.

## 🚀 Supported Frameworks & Languages

We scan everything you throw at it. The extension analyzes your CSS/SCSS files and extracts the classes/IDs, then searches for usages in your codebase. It understands:

- **HTML & Templates**: `class="..."`, `id="..."`
- **React / JSX / TSX**: `className="..."`, `className={'...'}`
- **Vue.js**: `:class="{...}"`, `v-bind:class="..."`
- **Angular**: `[class]="..."`, `[ngClass]="{'...': expr}"`
- **Svelte**: `class:name` directives
- **Astro**: `class:list={[...]}`
- **Pug / Jade**: `.class-name`
- **Vanilla JS DOM API**: `classList.add()`, `querySelector()`, `getElementById()`
- **CSS-in-JS**: `css\`.class { }\`` inside code files
- **Inline Styles**: `<style>` blocks inside `.vue`, `.svelte`, `.astro`, etc.

## ⚙️ Configuration

Open your VS Code Settings (UI) and search for `cssUnusedDetector` to access these options:

### Appearance

- **Highlight Color (`cssUnusedDetector.highlightColor`)**: Customize the background color of unused CSS blocks using a native color picker. Default is `#ff000026`.
- **Enable Highlight (`cssUnusedDetector.highlightEnabled`)**: Turn the background highlighter on/off.
- **Enable CodeLens (`cssUnusedDetector.codeLensEnabled`)**: Turn the reference counter on/off.
- **Enable Diagnostics (`cssUnusedDetector.diagnosticsEnabled`)**: Show warnings/errors in the Problems panel.
- **Diagnostic Severity (`cssUnusedDetector.diagnosticSeverity`)**: Choose between `error`, `warning`, `information`, or `hint`. The CodeLens icon will adapt to your choice.

### Analysis Triggers

- **Analyze on Save (`cssUnusedDetector.analyzeOnSave`)**: Run analysis when a file is saved.
- **Analyze on Type (`cssUnusedDetector.analyzeOnType`)**: Run analysis while typing.
- **Debounce Delay (`cssUnusedDetector.debounceDelay`)**: Adjust the delay (in ms) before the auto-analysis triggers after you stop typing. Default is `800`.

### Included / Excluded Files

- **Include Extensions (`cssUnusedDetector.includeFileExtensions`)**: Specify which file extensions to scan for class/id usage.
- **Exclude Folders (`cssUnusedDetector.excludeFolders`)**: Folders to ignore (e.g. `node_modules`, `dist`, `.git`).
- **Exclude Files (`cssUnusedDetector.excludeFiles`)**: Specific glob patterns to ignore (e.g. `**/*.min.css`).

## 🛠 Commands

You can access these via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **`CSS: Detect unused selectors`**: Manually trigger a full workspace analysis.
- **`CSS: Open analysis panel`**: Open the sidebar explorer to review unused selectors.
- **`CSS: Open extension settings`**: Quickly open the configuration panel.

---

*Made with ❤️ by alex-web.dev*
