import * as vscode from 'vscode';
import { AnalysisResult } from './analyzer';
import { getConfig, getSeverity } from './config';
import { t } from './i18n';

export class DiagnosticsManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationType: vscode.TextEditorDecorationType | undefined;
  private currentResults: AnalysisResult | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('css-unused');
    this.recreateDecorationType();

    // Re-apply decorations when the active text editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && this.currentResults) {
          this.applyDecorations(editor, this.currentResults);
        }
      })
    );

    // Recreate decoration type when settings change
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('cssUnusedDetector.highlightColor') ||
            e.affectsConfiguration('cssUnusedDetector.highlightEnabled')) {
          this.recreateDecorationType();
          // Re-apply if we have results
          if (this.currentResults) {
            for (const editor of vscode.window.visibleTextEditors) {
              this.applyDecorations(editor, this.currentResults);
            }
          }
        }
      })
    );
  }

  private recreateDecorationType(): void {
    // Dispose old one
    if (this.decorationType) {
      this.decorationType.dispose();
    }

    const cfg = getConfig();
    if (cfg.highlightEnabled) {
      this.decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: cfg.highlightColor,
        isWholeLine: false,
        overviewRulerColor: cfg.highlightColor,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
      });
    } else {
      this.decorationType = undefined;
    }
  }

  updateDiagnostics(results: AnalysisResult): void {
    const cfg = getConfig();
    this.currentResults = results;
    this.diagnosticCollection.clear();

    if (cfg.diagnosticsEnabled) {
      // Group unused selectors by file
      const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();
      const severity = getSeverity(cfg.diagnosticSeverity);

      for (const selector of results.unused) {
        const confidence = selector.confidence ?? 0;
        if (confidence > cfg.confidenceThreshold) {
          continue; // Skip diagnostics for items we are somewhat confident are used
        }

        const filePath = selector.file.fsPath;

        if (!diagnosticsByFile.has(filePath)) {
          diagnosticsByFile.set(filePath, []);
        }

        const range = selector.range ?? new vscode.Range(
          new vscode.Position(selector.line, 0),
          new vscode.Position(selector.line, selector.selector.length)
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          t('unusedSelector', { selector: selector.selector }),
          severity
        );

        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostic.source = 'CSS Unused Detector';

        diagnosticsByFile.get(filePath)!.push(diagnostic);
      }

      // Set diagnostics for each file
      for (const [filePath, diagnostics] of diagnosticsByFile) {
        this.diagnosticCollection.set(
          vscode.Uri.file(filePath),
          diagnostics
        );
      }
    }

    // Apply decorations to all visible editors
    for (const editor of vscode.window.visibleTextEditors) {
      this.applyDecorations(editor, results);
    }
  }

  private applyDecorations(editor: vscode.TextEditor, results: AnalysisResult): void {
    if (!this.decorationType) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const ranges: vscode.Range[] = [];

    for (const selector of results.unused) {
      if (selector.file.fsPath === filePath && selector.range) {
        ranges.push(selector.range);
      }
    }

    editor.setDecorations(this.decorationType, ranges);
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
    this.decorationType?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
