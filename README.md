# CSS/SCSS Unused Detector

A high-performance Visual Studio Code extension that automatically detects and highlights **unused CSS/SCSS/SASS selectors** across your entire project. It's built to be fast, accurate, and framework-agnostic.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/dashboard.webp" alt="CSS Analyzer Dashboard" width="700">
</p>

### 📸 Screenshots & Previews

| **Dashboard & Coverage** | **Reference CodeLens** | **Unused Coverage Details** |
| :---: | :---: | :---: |
| <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/dashboard.webp" width="220" alt="Dashboard View"> | <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/references.webp" width="220" alt="References CodeLens"> | <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/coverage.webp" width="220" alt="Unused Coverage Highlight"> |

---

## 🌟 Pro Features

- **Interactive Status Dashboard**: A full-featured webview dashboard displaying your style coverage, total/used/unused selectors, an SVG donut chart, and a detailed interactive table with filtering and selector sorting by confidence scores.
- **Smart Heuristics Confidence Score**: Every selector is evaluated using an advanced confidence algorithm (0-100%) to calculate the probability of being unused, keeping false positives to an absolute minimum.
- **Real-time Detection**: Analyzes your code as you type, with smart debouncing to keep the editor smooth.
- **Smart Hover Details**: Hover over any CSS class, ID, or HTML tag to see exactly which files are using it and how many times.
- **HTML Tag Analysis**: Automatically detects and counts references for HTML tag selectors (e.g. `body`, `div`, `span`, `p`) in both templates and standard DOM APIs.
- **Quick Fixes (Code Actions)**: See a selector you want the detector to ignore? Click the 💡 icon (Quick Fix) to add a `/* css-unused-ignore */` comment. You can even choose to ignore all unused selectors in an entire file with one click!
- **Sidebar Explorer Panel**: A dedicated Tree View in your VS Code sidebar groups all unused CSS by file. Click a selector to jump instantly to that line of code.
- **Interactive Status Bar**: A discrete indicator in the bottom-right corner shows the health of your CSS at a glance.
- **Visual Highlights**: Unused CSS blocks are subtly highlighted so you can easily spot and remove dead code.
- **Reference CodeLens**: Displays the exact number of times a CSS class, ID, or HTML tag is used right above the selector, with an icon matching your configured diagnostic severity.
- **Results Exporting**: Easily export your analysis reports straight to a JSON file for CI/CD tracking or deep-dive code reviews.
- **Bilingual IDE Descriptions**: All configuration settings now display side-by-side English/Spanish (`[EN] ... / [ES] ...`) descriptions directly in the settings panel to guarantee localization works perfectly.

## 🚀 Supported Frameworks & Languages

We scan everything you throw at it. The extension analyzes your CSS/SCSS files and extracts the classes/IDs/tags, then searches for usages in your codebase. It uses specialized, modular high-performance extractors for:

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

### Appearance & Heuristics

- **Highlight Color (`cssUnusedDetector.highlightColor`)**: Customize the background color of unused CSS blocks using a native color picker. Default is `#ff000026`.
- **Enable Highlight (`cssUnusedDetector.highlightEnabled`)**: Turn the background highlighter on/off.
- **Enable CodeLens (`cssUnusedDetector.codeLensEnabled`)**: Turn the reference counter on/off.
- **Enable Diagnostics (`cssUnusedDetector.diagnosticsEnabled`)**: Show warnings/errors in the Problems panel.
- **Diagnostic Severity (`cssUnusedDetector.diagnosticSeverity`)**: Choose between `error`, `warning`, `information`, or `hint`. The CodeLens icon will adapt to your choice.
- **Confidence Threshold (`cssUnusedDetector.confidenceThreshold`)**: The minimum confidence percentage (0-100) required to consider a selector as a match. Low probability selectors will be highlighted as unused. Default is `50`.

### Performance & Limits

- **Concurrency Limit (`cssUnusedDetector.concurrencyLimit`)**: Configure the number of files to read and parse concurrently to optimize performance. Default is `8`.
- **Max File Size MB (`cssUnusedDetector.maxFileSizeMB`)**: Maximum file size in megabytes to scan for references to avoid memory leak or high CPU usage. Default is `1`.

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
- **`CSS: Export analysis results`**: Export detailed selector usage metrics directly to a file.

---

# CSS/SCSS Unused Detector (Español)

Una extensión de Visual Studio Code de alto rendimiento que detecta y resalta automáticamente **selectores CSS/SCSS/SASS no utilizados** en todo tu proyecto. Diseñada para ser rápida, precisa y compatible con cualquier framework.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/dashboard.webp" alt="CSS Analyzer Dashboard" width="700">
</p>

### 📸 Capturas de Pantalla y Previsualizaciones

| **Dashboard e Indicador de Cobertura** | **CodeLens de Referencias** | **Detalle de Cobertura No Usada** |
| :---: | :---: | :---: |
| <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/dashboard.webp" width="220" alt="Vista del Dashboard"> | <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/references.webp" width="220" alt="CodeLens de Referencia"> | <img src="https://raw.githubusercontent.com/lmawebdev/css-scss-review/main/coverage.webp" width="220" alt="Resaltado de Cobertura"> |

---

## 🌟 Características Pro

- **Dashboard de Estado Interactivo**: Un dashboard webview completo que muestra la cobertura de estilos, selectores totales/usados/no usados, un gráfico de donut SVG interactivo y una tabla detallada con ordenamiento por índice de confianza.
- **Algoritmo de Confianza Avanzado**: Cada selector es evaluado por un algoritmo heurístico de confianza (0-100%) para calcular la probabilidad real de no estar siendo utilizado, minimizando falsos positivos.
- **Detección en tiempo real**: Analiza tu código mientras escribes, con un retardo inteligente (debouncing) para mantener el editor fluido.
- **Detalles en hover inteligente**: Pasa el cursor sobre cualquier clase CSS, ID o etiqueta HTML para ver exactamente qué archivos la están usando y cuántas veces.
- **Análisis de etiquetas HTML**: Detecta y cuenta automáticamente las referencias para selectores de etiquetas HTML (ej. `body`, `div`, `span`, `p`) tanto en plantillas como en APIs del DOM estándar.
- **Soluciones rápidas (Code Actions)**: ¿Ves un selector que quieres ignorar? Haz clic en el icono 💡 (Quick Fix) para añadir un comentario `/* css-unused-ignore */`. ¡Incluso puedes ignorar todos los selectores no utilizados en un archivo entero con un solo clic!
- **Panel explorador lateral**: Una vista de árbol dedicada en la barra lateral de VS Code agrupa todo el CSS no utilizado por archivo. Haz clic en un selector para saltar instantáneamente a esa línea de código.
- **Barra de estado interactiva**: Un indicador discreto en la esquina inferior derecha muestra el estado de salud de tu CSS de un vistazo.
- **Resaltado visual**: Los bloques de CSS no utilizados se resaltan sutilmente para que puedas identificar y eliminar fácilmente el código muerto.
- **CodeLens de Referencias**: Muestra el número exacto de veces que se utiliza una clase CSS, ID o etiqueta HTML justo encima del selector, con un icono que se adapta a la gravedad de diagnóstico configurada.
- **Exportación de Resultados**: Exporta los reportes detallados directamente a un archivo JSON para auditorías o integraciones de CI/CD.
- **Descripciones bilingües en el IDE**: Todos los ajustes de configuración ahora muestran descripciones simultáneas en inglés y español (`[EN] ... / [ES] ...`) directamente en el panel de configuración para garantizar que la localización funcione perfectamente.

## 🚀 Frameworks y lenguajes soportados

Escaneamos todo lo que le pongas delante. La extensión utiliza extractores modulares de alto rendimiento diseñados específicamente para:

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

### Apariencia y Heurística

- **Color de resaltado (`cssUnusedDetector.highlightColor`)**: Personaliza el color de fondo de los bloques CSS no utilizados mediante un selector de color nativo. Por defecto es `#ff000026`.
- **Activar resaltado (`cssUnusedDetector.highlightEnabled`)**: Activa o desactiva el resaltado de fondo.
- **Activar CodeLens (`cssUnusedDetector.codeLensEnabled`)**: Activa o desactiva el contador de referencias.
- **Activar diagnósticos (`cssUnusedDetector.diagnosticsEnabled`)**: Muestra advertencias/errores en el panel de Problemas.
- **Severidad del diagnóstico (`cssUnusedDetector.diagnosticSeverity`)**: Elige entre `error`, `warning`, `information` o `hint`. El icono de CodeLens se adaptará a tu elección.
- **Umbral de Confianza (`cssUnusedDetector.confidenceThreshold`)**: Puntuación de confianza mínima (0-100) para considerar válida una coincidencia probable. Los diagnósticos solo se mostrarán para selectores por debajo de este umbral. Por defecto es `50`.

### Rendimiento y Límites

- **Límite de Concurrencia (`cssUnusedDetector.concurrencyLimit`)**: Número de archivos que se leerán y procesarán en paralelo para optimizar la velocidad. Por defecto es `8`.
- **Tamaño Máximo de Archivo MB (`cssUnusedDetector.maxFileSizeMB`)**: Tamaño de archivo máximo en megabytes para escanear referencias con el fin de evitar problemas de memoria o uso de CPU excesivo. Por defecto es `1`.

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
- **`CSS: Exportar resultados del análisis`**: Exporta las métricas de uso de selectores directamente a un archivo.

---

*Made with ❤️ by alex-web.dev*

