import * as vscode from 'vscode';
import { CSSAnalyzer } from './analyzer';
import { DiagnosticsManager } from './diagnostics';
import { CSSCodeLensProvider } from './codelens';
import { getConfig } from './config';
import { initLanguage, t } from './i18n';
import { StatusBarManager } from './statusbar';
import { CSSHoverProvider } from './hover';
import { CSSUnusedTreeProvider } from './treeview';
import { CSSIgnoreCodeActionProvider } from './codeactions';

let analyzer: CSSAnalyzer;
let diagnosticsManager: DiagnosticsManager;
let codeLensProvider: CSSCodeLensProvider;
let hoverProvider: CSSHoverProvider;
let statusBarManager: StatusBarManager;
let treeProvider: CSSUnusedTreeProvider;

let analysisTimer: NodeJS.Timeout | undefined;
let isAnalyzing = false;

export async function activate(context: vscode.ExtensionContext) {
  // Initialize language from settings
  initLanguage();

  console.log(t('extensionActive'));

  analyzer = new CSSAnalyzer();
  diagnosticsManager = new DiagnosticsManager();
  codeLensProvider = new CSSCodeLensProvider();
  hoverProvider = new CSSHoverProvider();
  statusBarManager = new StatusBarManager();
  treeProvider = new CSSUnusedTreeProvider();

  // Register Tree View
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('cssUnusedDetector', treeProvider)
  );

  // Register CodeLens Provider
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { scheme: 'file', language: 'css' },
        { scheme: 'file', language: 'scss' },
        { scheme: 'file', language: 'sass' },
        { scheme: 'file', language: 'less' },
        { scheme: 'file', language: 'vue' },
        { scheme: 'file', language: 'svelte' },
        { scheme: 'file', language: 'astro' },
        { scheme: 'file', language: 'html' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'javascriptreact' },
        { scheme: 'file', language: 'typescriptreact' },
        { scheme: 'file', language: 'php' },
        { scheme: 'file', language: 'pug' },
        { scheme: 'file', language: 'jade' },
        { scheme: 'file', language: 'erb' },
        { scheme: 'file', language: 'handlebars' },
        { scheme: 'file', language: 'twig' }
      ],
      codeLensProvider
    )
  );

  // Register Hover Provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [
        { scheme: 'file', language: 'css' },
        { scheme: 'file', language: 'scss' },
        { scheme: 'file', language: 'sass' },
        { scheme: 'file', language: 'less' },
        { scheme: 'file', language: 'vue' },
        { scheme: 'file', language: 'svelte' },
        { scheme: 'file', language: 'astro' },
        { scheme: 'file', language: 'html' }
      ],
      hoverProvider
    )
  );

  // Register CodeAction Provider (Quick Fixes)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { scheme: 'file', language: 'css' },
        { scheme: 'file', language: 'scss' },
        { scheme: 'file', language: 'sass' },
        { scheme: 'file', language: 'less' },
        { scheme: 'file', language: 'vue' },
        { scheme: 'file', language: 'svelte' },
        { scheme: 'file', language: 'astro' },
        { scheme: 'file', language: 'html' }
      ],
      new CSSIgnoreCodeActionProvider(),
      {
        providedCodeActionKinds: CSSIgnoreCodeActionProvider.providedCodeActionKinds
      }
    )
  );

  context.subscriptions.push(statusBarManager);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('css-unused-detector.analyze', async () => {
      await runAnalysis(true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('css-unused-detector.openPanel', () => {
      vscode.commands.executeCommand('setContext', 'cssUnusedDetector.hasAnalysis', true);
      // Focus the view in the explorer
      vscode.commands.executeCommand('cssUnusedDetector.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('css-unused-detector.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'cssUnusedDetector');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'css-unused-detector.showReferences',
      (uri: vscode.Uri, position: vscode.Position, locations: vscode.Location[]) => {
        vscode.commands.executeCommand('editor.action.showReferences', uri, position, locations);
      }
    )
  );

  // Run initial analysis
  await runAnalysis(false);

  // === Auto-refresh triggers ===

  // 1. On document text change (while typing) — debounced
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => {
      const cfg = getConfig();
      if (cfg.analyzeOnType && e.document.uri.scheme === 'file') {
        scheduleAnalysis(cfg.debounceDelay);
      }
    })
  );

  // 2. On document save — immediate refresh
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      const cfg = getConfig();
      if (cfg.analyzeOnSave && doc.uri.scheme === 'file') {
        scheduleAnalysis(100);
      }
    })
  );

  // 3. On file create/delete — re-scan
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  fileWatcher.onDidCreate(() => scheduleAnalysis(500));
  fileWatcher.onDidDelete(() => scheduleAnalysis(500));
  context.subscriptions.push(fileWatcher);

  // 4. On configuration change — re-analyze and reinitialize language
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('cssUnusedDetector')) {
        initLanguage();
        scheduleAnalysis(200);
      }
    })
  );
}

function scheduleAnalysis(delayMs: number) {
  if (analysisTimer) {
    clearTimeout(analysisTimer);
  }
  analysisTimer = setTimeout(() => {
    runAnalysis(false);
  }, delayMs);
}

async function runAnalysis(showMessage: boolean) {
  if (!vscode.workspace.workspaceFolders || isAnalyzing) {
    return;
  }

  isAnalyzing = true;
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const results = await analyzer.analyzeWorkspace(workspaceFolder);

    diagnosticsManager.updateDiagnostics(results);
    codeLensProvider.updateResults(results);
    hoverProvider.updateResults(results);
    statusBarManager.updateResults(results);
    treeProvider.updateResults(results);

    if (showMessage) {
      vscode.commands.executeCommand('setContext', 'cssUnusedDetector.hasAnalysis', true);
      if (results.unused.length > 0) {
        vscode.window.showInformationMessage(
          t('unusedSelectorsFound', { count: results.unused.length })
        );
      } else {
        vscode.window.showInformationMessage(t('noUnusedSelectors'));
      }
    }
  } catch (error) {
    console.error('Error during CSS analysis:', error);
    if (showMessage) {
      vscode.window.showErrorMessage(t('analysisError'));
    }
  } finally {
    isAnalyzing = false;
  }
}

export function deactivate() {
  if (analysisTimer) {
    clearTimeout(analysisTimer);
  }
  diagnosticsManager?.dispose();
  statusBarManager?.dispose();
}
