import * as vscode from 'vscode';

export type Language = 'en' | 'es';

interface Translations {
  [key: string]: { en: string; es: string };
}

const translations: Translations = {
  // === Status messages ===
  'extensionActive': {
    en: 'CSS Unused Detector extension is now active',
    es: 'La extensión CSS Unused Detector está activa'
  },
  'analyzingWorkspace': {
    en: 'Analyzing workspace...',
    es: 'Analizando el workspace...'
  },
  'unusedSelectorsFound': {
    en: '{count} unused CSS/SCSS selectors found',
    es: '{count} selectores CSS/SCSS no utilizados encontrados'
  },
  'analysisError': {
    en: 'Error analyzing CSS/SCSS',
    es: 'Error al analizar CSS/SCSS'
  },
  'noUnusedSelectors': {
    en: 'No unused CSS/SCSS selectors found',
    es: 'No se encontraron selectores CSS/SCSS sin usar'
  },

  // === Status Bar ===
  'statusBarUnused': {
    en: '$(paintcan) CSS: {count} unused',
    es: '$(paintcan) CSS: {count} sin usar'
  },
  'statusBarClean': {
    en: '$(check) CSS: Clean',
    es: '$(check) CSS: Limpio'
  },

  // === CodeLens ===
  'references': {
    en: '{count} reference{plural}',
    es: '{count} referencia{plural}'
  },
  'referencePlural': {
    en: 's',
    es: 's'
  },
  'noReferences': {
    en: '{icon} 0 references (unused)',
    es: '{icon} 0 referencias (no utilizado)'
  },
  'viewReferences': {
    en: 'View references',
    es: 'Ver referencias'
  },
  'noReferencesFound': {
    en: 'No references found',
    es: 'No se encontraron referencias'
  },

  // === Diagnostics ===
  'unusedSelector': {
    en: 'Unused selector: "{selector}"',
    es: 'Selector no utilizado: "{selector}"'
  },

  // === Hover Provider ===
  'hoverUsedIn': {
    en: '*Used in:*',
    es: '*Usado en:*'
  },
  'hoverNotUsed': {
    en: '*This selector does not appear to be used anywhere in the workspace.*',
    es: '*Este selector no parece estar usado en ninguna parte del workspace.*'
  },

  // === Commands ===
  'cmdAnalyze': {
    en: 'CSS: Detect unused selectors',
    es: 'CSS: Detectar selectores no utilizados'
  },
  'cmdOpenPanel': {
    en: 'CSS: Open analysis panel',
    es: 'CSS: Abrir panel de análisis'
  },
  'cmdOpenSettings': {
    en: 'CSS: Open settings',
    es: 'CSS: Abrir ajustes'
  },
  'cmdIgnoreSelector': {
    en: 'Ignore unused CSS selector "{selector}"',
    es: 'Ignorar selector CSS no utilizado "{selector}"'
  },
  'cmdIgnoreAll': {
    en: 'Ignore all unused CSS selectors in this file',
    es: 'Ignorar todos los selectores CSS no utilizados en este archivo'
  },

  // === Settings descriptions (used for documentation) ===
  'settingLanguageDesc': {
    en: 'Extension display language',
    es: 'Idioma de la extensión'
  },
};

let currentLanguage: Language = 'es';

export function initLanguage(): void {
  const config = vscode.workspace.getConfiguration('cssUnusedDetector');
  currentLanguage = config.get<Language>('language', 'es');
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function t(key: string, replacements?: Record<string, string | number>): string {
  const entry = translations[key];
  if (!entry) {
    return key;
  }

  let text = entry[currentLanguage] || entry['en'] || key;

  if (replacements) {
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(`{${placeholder}}`, String(value));
    }
  }

  return text;
}
