import * as vscode from 'vscode';
import { AnalysisResult } from './analyzer';
import { getConfig } from './config';
import { confidenceIcon } from './confidence';
import { t } from './i18n';

export class CSSCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
  private results: AnalysisResult | undefined;

  constructor() {
    // empty
  }

  public updateResults(results: AnalysisResult) {
    this.results = results;
    this._onDidChangeCodeLenses.fire();
  }

  public invalidate() {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const cfg = getConfig();
    if (!cfg.codeLensEnabled || !this.results) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];
    const filePath = document.uri.fsPath;

    // Combine used and unused, then keep deterministic ordering by file position
    const allSelectors = [...this.results.used, ...this.results.unused]
      .filter(selector => selector.file.fsPath === filePath)
      .sort((a, b) => {
        if (a.line !== b.line) {
          return a.line - b.line;
        }

        const aChar = a.range?.start.character ?? 0;
        const bChar = b.range?.start.character ?? 0;
        return aChar - bChar;
      });

    // Remove duplicates based on line to avoid multiple codelenses for same line
    const seenLines = new Set<number>();

    for (const selector of allSelectors) {
      if (token.isCancellationRequested) {
        return [];
      }
      if (seenLines.has(selector.line)) {
        continue;
      }
      seenLines.add(selector.line);

      const range = selector.range ?? new vscode.Range(
        new vscode.Position(selector.line, 0),
        new vscode.Position(selector.line, Math.max(selector.selector.length, 1))
      );

      const useCount = selector.useCount || 0;
      const plural = useCount > 1 ? t('referencePlural') : '';

      let icon = '⚠️';
      if (cfg.diagnosticSeverity === 'error') icon = '🔴';
      else if (cfg.diagnosticSeverity === 'information') icon = 'ℹ️';
      else if (cfg.diagnosticSeverity === 'hint') icon = '💡';

      let title = useCount === 0
        ? t('noReferences', { icon })
        : t('references', { count: useCount, plural });

      if (selector.confidence !== undefined) {
        title += ` ${confidenceIcon(selector.confidence)} ${selector.confidence}%`;
      } else if (selector.status === 'probable') {
        title += t('codeLensProbable');
      }

      const command: vscode.Command = {
        title: title,
        command: useCount > 0 ? "css-unused-detector.showReferences" : "",
        arguments: useCount > 0 ? [
          document.uri,
          range.start,
          selector.locations || []
        ] : undefined,
        tooltip: useCount > 0 ? t('viewReferences') : t('noReferencesFound')
      };

      lenses.push(new vscode.CodeLens(range, command));
    }

    return lenses;
  }
}
