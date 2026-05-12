import * as vscode from 'vscode';
import { AnalysisResult } from './analyzer';
import { t } from './i18n';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'css-unused-detector.openPanel';
    this.statusBarItem.tooltip = t('cmdOpenPanel');
  }

  public updateResults(results: AnalysisResult) {
    const unusedCount = results.unused.length;
    
    if (unusedCount > 0) {
      this.statusBarItem.text = t('statusBarUnused', { count: unusedCount });
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.show();
    } else {
      this.statusBarItem.text = t('statusBarClean');
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.show();
    }
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
