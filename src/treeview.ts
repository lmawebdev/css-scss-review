import * as vscode from 'vscode';
import { AnalysisResult, CSSSelector } from './analyzer';
import { t } from './i18n';

export class CSSUnusedTreeProvider implements vscode.TreeDataProvider<CSSUnusedTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CSSUnusedTreeItem | undefined | null | void> = new vscode.EventEmitter<CSSUnusedTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CSSUnusedTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private results: AnalysisResult | undefined;

  public updateResults(results: AnalysisResult) {
    this.results = results;
    this.refresh();
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CSSUnusedTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CSSUnusedTreeItem): Thenable<CSSUnusedTreeItem[]> {
    if (!this.results || this.results.unused.length === 0) {
      if (!element) {
        return Promise.resolve([new CSSUnusedTreeItem(t('noUnusedSelectors'), vscode.TreeItemCollapsibleState.None, 'info')]);
      }
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level: Group by file
      const filesMap = new Map<string, CSSSelector[]>();
      for (const selector of this.results.unused) {
        const filePath = selector.file.fsPath;
        if (!filesMap.has(filePath)) {
          filesMap.set(filePath, []);
        }
        filesMap.get(filePath)!.push(selector);
      }

      const fileItems: CSSUnusedTreeItem[] = [];
      for (const [filePath, selectors] of filesMap) {
        const fileName = vscode.workspace.asRelativePath(filePath);
        fileItems.push(new CSSUnusedTreeItem(
          `${fileName} (${selectors.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'file',
          vscode.Uri.file(filePath),
          undefined,
          selectors
        ));
      }
      return Promise.resolve(fileItems.sort((a, b) => a.label.localeCompare(b.label)));
    } else if (element.type === 'file' && element.selectors) {
      // Child level: Selectors inside the file
      const selectorItems = element.selectors.map(s => {
        return new CSSUnusedTreeItem(
          s.selector,
          vscode.TreeItemCollapsibleState.None,
          'selector',
          s.file,
          new vscode.Position(s.line, 0)
        );
      });
      return Promise.resolve(selectorItems);
    }

    return Promise.resolve([]);
  }
}

export class CSSUnusedTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'file' | 'selector' | 'info',
    public readonly resourceUri?: vscode.Uri,
    public readonly position?: vscode.Position,
    public readonly selectors?: CSSSelector[]
  ) {
    super(label, collapsibleState);

    this.tooltip = this.label;
    
    if (this.type === 'file') {
      this.iconPath = new vscode.ThemeIcon('file-code');
    } else if (this.type === 'selector') {
      this.iconPath = new vscode.ThemeIcon('symbol-class');
      this.description = `Line ${this.position!.line + 1}`;
      
      // Command to open the file and jump to the selector
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [
          this.resourceUri,
          {
            selection: new vscode.Range(this.position!, this.position!)
          }
        ]
      };
    } else {
      this.iconPath = new vscode.ThemeIcon('check');
    }
  }
}
