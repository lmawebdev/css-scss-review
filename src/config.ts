import * as vscode from 'vscode';

export interface ExtensionConfig {
  // Display
  language: 'en' | 'es';
  highlightColor: string;
  highlightEnabled: boolean;
  codeLensEnabled: boolean;
  diagnosticsEnabled: boolean;
  diagnosticSeverity: 'error' | 'warning' | 'information' | 'hint';

  // Analysis triggers
  analyzeOnSave: boolean;
  analyzeOnType: boolean;
  debounceDelay: number;

  // Scan options
  scanDomApi: boolean;
  scanAngularPatterns: boolean;
  scanSveltePatterns: boolean;
  scanAstroPatterns: boolean;
  scanPugPatterns: boolean;
  scanStyleBlocks: boolean;
  scanCssInJs: boolean;

  // Include / Exclude
  excludeFolders: string[];
  excludeFiles: string[];
  includeFileExtensions: string[];
  cssFileExtensions: string[];
}

const DEFAULT_EXCLUDE_FOLDERS = [
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.angular',
  'vendor', '__pycache__', 'coverage', '.cache', '.parcel-cache', '.svelte-kit'
];

const DEFAULT_CSS_EXTENSIONS = ['css', 'scss', 'sass', 'less', 'styl'];

const DEFAULT_INCLUDE_EXTENSIONS = [
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts',
  'vue', 'html', 'htm', 'xhtml',
  'astro', 'svelte',
  'php', 'phtml', 'twig',
  'hbs', 'handlebars', 'ejs',
  'pug', 'jade', 'slim',
  'erb', 'haml',
  'marko', 'riot', 'liquid',
  'njk', 'nunjucks', 'mustache',
  'jinja', 'jinja2',
  'mdx',
  'cshtml', 'razor',
  'latte', 'tpl', 'ftl',
  'jsp', 'asp', 'aspx'
];

export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('cssUnusedDetector');

  return {
    language: config.get<'en' | 'es'>('language', 'es'),
    highlightColor: config.get<string>('highlightColor', '#ff000026'),
    highlightEnabled: config.get<boolean>('highlightEnabled', true),
    codeLensEnabled: config.get<boolean>('codeLensEnabled', true),
    diagnosticsEnabled: config.get<boolean>('diagnosticsEnabled', true),
    diagnosticSeverity: config.get<'error' | 'warning' | 'information' | 'hint'>('diagnosticSeverity', 'warning'),

    analyzeOnSave: config.get<boolean>('analyzeOnSave', true),
    analyzeOnType: config.get<boolean>('analyzeOnType', true),
    debounceDelay: config.get<number>('debounceDelay', 800),

    scanDomApi: config.get<boolean>('scanDomApi', true),
    scanAngularPatterns: config.get<boolean>('scanAngularPatterns', true),
    scanSveltePatterns: config.get<boolean>('scanSveltePatterns', true),
    scanAstroPatterns: config.get<boolean>('scanAstroPatterns', true),
    scanPugPatterns: config.get<boolean>('scanPugPatterns', true),
    scanStyleBlocks: config.get<boolean>('scanStyleBlocks', true),
    scanCssInJs: config.get<boolean>('scanCssInJs', true),

    excludeFolders: config.get<string[]>('excludeFolders', DEFAULT_EXCLUDE_FOLDERS),
    excludeFiles: config.get<string[]>('excludeFiles', []),
    includeFileExtensions: config.get<string[]>('includeFileExtensions', DEFAULT_INCLUDE_EXTENSIONS),
    cssFileExtensions: config.get<string[]>('cssFileExtensions', DEFAULT_CSS_EXTENSIONS),
  };
}

export function getSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error': return vscode.DiagnosticSeverity.Error;
    case 'warning': return vscode.DiagnosticSeverity.Warning;
    case 'information': return vscode.DiagnosticSeverity.Information;
    case 'hint': return vscode.DiagnosticSeverity.Hint;
    default: return vscode.DiagnosticSeverity.Warning;
  }
}
