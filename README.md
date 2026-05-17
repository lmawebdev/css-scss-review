# CSS/SCSS Unused Detector

A high-performance Visual Studio Code extension that automatically detects and highlights **unused CSS/SCSS/SASS selectors** across your entire project. It's built to be fast, accurate, and framework-agnostic.

---

## 🌟 Pro Features

- **Real-time Detection**: Analyzes your code as you type, with smart debouncing to keep the editor smooth.
- **Smart Hover Details**: Hover over any CSS class, ID, or HTML tag to see exactly which files are using it and how many times.
- **HTML Tag Analysis**: Automatically detects and counts references for HTML tag selectors (e.g. `body`, `div`, `span`, `p`) in both templates and standard DOM APIs.
- **Quick Fixes (Code Actions)**: See a selector you want the detector to ignore? Click the 💡 icon (Quick Fix) to add a `/* css-unused-ignore */` comment. You can even choose to ignore all unused selectors in an entire file with one click!
- **Sidebar Explorer Panel**: A dedicated Tree View in your VS Code sidebar groups all unused CSS by file. Click a selector to jump instantly to that line of code.
- **Interactive Status Bar**: A discrete indicator in the bottom-right corner shows the health of your CSS at a glance.
- **Visual Highlights**: Unused CSS blocks are subtly highlighted so you can easily spot and remove dead code.
- **Reference CodeLens**: Displays the exact number of times a CSS class, ID, or HTML tag is used right above the selector, with an icon matching your configured diagnostic severity.
- **Bilingual IDE Descriptions**: All configuration settings now display side-by-side English/Spanish (`[EN] ... / [ES] ...`) descriptions directly in the settings panel to guarantee localization works perfectly.

## 🚀 Supported Frameworks & Languages

We scan everything you throw at it. The extension analyzes your CSS/SCSS files and extracts the classes/IDs/tags, then searches for usages in your codebase. It understands:

- **HTML & Templates**: `<tag-name class="..." id="...">`
- **React / JSX / TSX**: `className="..."`, `className={'...'}`
- **Vue.js**: `:class="{...}"`, `v-bind:class="..."`
- **Angular**: `[class]="..."`, `[ngClass]="{'...': expr}"`
- **Svelte**: `class:name` directives
- **Astro**: `class:list={[...]}`
- **Pug / Jade**: `.class-name`
- **Vanilla JS DOM API**: `classList.add()`, `querySelector()`, `getElementById()`, `getElementsByTagName()`, `createElement()`
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

### Scan Options

- **Scan Tags (`cssUnusedDetector.scanTags`)**: Enable or disable scanning and checking for HTML/XML tag name selectors (like `body`, `div`, `span`). Default is `true`.
- **Scan DOM API (`cssUnusedDetector.scanDomApi`)**: Scan for vanilla JavaScript DOM API usage (`classList`, `querySelector`, etc.).
- **Scan Style Blocks (`cssUnusedDetector.scanStyleBlocks`)**: Extract selectors from `<style>` blocks in template files.
- **Scan CSS-in-JS (`cssUnusedDetector.scanCssInJs`)**: Scan for `css\`.class { }\`` template literal usages.

### Included / Excluded Files

- **Include Extensions (`cssUnusedDetector.includeFileExtensions`)**: Specify which file extensions to scan for class/id/tag usage.
- **Exclude Folders (`cssUnusedDetector.excludeFolders`)**: Folders to ignore (e.g. `node_modules`, `dist`, `.git`).
- **Exclude Files (`cssUnusedDetector.excludeFiles`)**: Specific glob patterns to ignore (e.g. `**/*.min.css`).

## 🛠 Commands

You can access these via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **`CSS: Detect unused selectors`**: Manually trigger a full workspace analysis.
- **`CSS: Open analysis panel`**: Open the sidebar explorer to review unused selectors.
- **`CSS: Open extension settings`**: Quickly open the configuration panel.

---

# CSS/SCSS Unused Detector (Español)

Una extensión de Visual Studio Code de alto rendimiento que detecta y resalta automáticamente **selectores CSS/SCSS/SASS no utilizados** en todo tu proyecto. Diseñada para ser rápida, precisa y compatible con cualquier framework.

---

## 🌟 Características Pro

- **Detección en tiempo real**: Analiza tu código mientras escribes, con un retardo inteligente (debouncing) para mantener el editor fluido.
- **Detalles en hover inteligente**: Pasa el cursor sobre cualquier clase CSS, ID o etiqueta HTML para ver exactamente qué archivos la están usando y cuántas veces.
- **Análisis de etiquetas HTML**: Detecta y cuenta automáticamente las referencias para selectores de etiquetas HTML (ej. `body`, `div`, `span`, `p`) tanto en plantillas como en APIs del DOM estándar.
- **Soluciones rápidas (Code Actions)**: ¿Ves un selector que quieres ignorar? Haz clic en el icono 💡 (Quick Fix) para añadir un comentario `/* css-unused-ignore */`. ¡Incluso puedes ignorar todos los selectores no utilizados en un archivo entero con un solo clic!
- **Panel explorador lateral**: Una vista de árbol dedicada en la barra lateral de VS Code agrupa todo el CSS no utilizado por archivo. Haz clic en un selector para saltar instantáneamente a esa línea de código.
- **Barra de estado interactiva**: Un indicador discreto en la esquina inferior derecha muestra el estado de salud de tu CSS de un vistazo.
- **Resaltado visual**: Los bloques de CSS no utilizados se resaltan sutilmente para que puedas identificar y eliminar fácilmente el código muerto.
- **CodeLens de Referencias**: Muestra el número exacto de veces que se utiliza una clase CSS, ID o etiqueta HTML justo encima del selector, con un icono que se adapta a la gravedad de diagnóstico configurada.
- **Descripciones bilingües en el IDE**: Todos los ajustes de configuración ahora muestran descripciones simultáneas en inglés y español (`[EN] ... / [ES] ...`) directamente en el panel de configuración para garantizar que la localización funcione perfectamente.

## 🚀 Frameworks y lenguajes soportados

Escaneamos todo lo que le pongas delante. La extensión analiza tus archivos CSS/SCSS y extrae las clases/IDs/etiquetas, luego busca sus usos en tu código. Es compatible con:

- **HTML y Plantillas**: `<tag-name class="..." id="...">`
- **React / JSX / TSX**: `className="..."`, `className={'...'}`
- **Vue.js**: `:class="{...}"`, `v-bind:class="..."`
- **Angular**: `[class]="..."`, `[ngClass]="{'...': expr}"`
- **Svelte**: directivas `class:name`
- **Astro**: `class:list={[...]}`
- **Pug / Jade**: `.class-name`
- **API DOM JS Estándar**: `classList.add()`, `querySelector()`, `getElementById()`, `getElementsByTagName()`, `createElement()`
- **CSS-in-JS**: `css\`.class { }\`` dentro de archivos de código
- **Estilos en línea**: bloques `<style>` dentro de `.vue`, `.svelte`, `.astro`, etc.

## ⚙️ Configuración

Abre los Ajustes de VS Code (UI) y busca `cssUnusedDetector` para acceder a estas opciones:

### Apariencia

- **Color de resaltado (`cssUnusedDetector.highlightColor`)**: Personaliza el color de fondo de los bloques CSS no utilizados mediante un selector de color nativo. Por defecto es `#ff000026`.
- **Activar resaltado (`cssUnusedDetector.highlightEnabled`)**: Activa o desactiva el resaltado de fondo.
- **Activar CodeLens (`cssUnusedDetector.codeLensEnabled`)**: Activa o desactiva el contador de referencias.
- **Activar diagnósticos (`cssUnusedDetector.diagnosticsEnabled`)**: Muestra advertencias/errores en el panel de Problemas.
- **Severidad del diagnóstico (`cssUnusedDetector.diagnosticSeverity`)**: Elige entre `error`, `warning`, `information` o `hint`. El icono de CodeLens se adaptará a tu elección.

### Disparadores de análisis

- **Analizar al guardar (`cssUnusedDetector.analyzeOnSave`)**: Ejecuta el análisis al guardar un archivo.
- **Analizar al escribir (`cssUnusedDetector.analyzeOnType`)**: Ejecuta el análisis mientras escribes.
- **Retraso de rebote (`cssUnusedDetector.debounceDelay`)**: Ajusta el retardo (en ms) antes de que se active el análisis automático tras dejar de escribir. Por defecto es `800`.

### Opciones de escaneo

- **Escanear etiquetas (`cssUnusedDetector.scanTags`)**: Activa o desactiva el escaneo y comprobación de selectores de nombres de etiquetas HTML/XML (como `body`, `div`, `span`). Por defecto es `true`.
- **Escanear API DOM (`cssUnusedDetector.scanDomApi`)**: Escanea el uso de la API DOM de JavaScript estándar (`classList`, `querySelector`, etc.).
- **Escanear bloques de estilo (`cssUnusedDetector.scanStyleBlocks`)**: Extrae selectores de los bloques `<style>` en archivos de plantilla.
- **Escanear CSS-in-JS (`cssUnusedDetector.scanCssInJs`)**: Escanea usos de plantillas de texto de CSS-in-JS `css\`.class { }\``.

### Archivos incluidos / excluidos

- **Incluir extensiones (`cssUnusedDetector.includeFileExtensions`)**: Especifica qué extensiones de archivo escanear para buscar usos de clases/IDs/etiquetas.
- **Excluir carpetas (`cssUnusedDetector.excludeFolders`)**: Carpetas a ignorar (ej. `node_modules`, `dist`, `.git`).
- **Excluir archivos (`cssUnusedDetector.excludeFiles`)**: Patrones de glob específicos a ignorar (ej. `**/*.min.css`).

## 🛠 Comandos

Puedes acceder a ellos a través de la Paleta de Comandos (`Ctrl+Shift+P` o `Cmd+Shift+P`):

- **`CSS: Detectar selectores no utilizados`**: Activa manualmente un análisis completo del workspace.
- **`CSS: Abrir panel de análisis`**: Abre el explorador lateral para revisar los selectores no utilizados.
- **`CSS: Abrir ajustes de la extensión`**: Abre rápidamente el panel de configuración.

---

*Made with ❤️ by alex-web.dev*
