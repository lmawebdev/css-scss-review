import * as vscode from 'vscode';
import { t } from './i18n';

export class CSSIgnoreCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Filter diagnostics that belong to our extension
    const diagnostics = context.diagnostics.filter(d => d.source === 'CSS Unused Detector');

    if (diagnostics.length > 0) {
      // 1. Single fix for each diagnostic
      for (const diagnostic of diagnostics) {
        const match = diagnostic.message.match(/"([^"]+)"/);
        const selector = match ? match[1] : 'selector';

        const title = t('cmdIgnoreSelector', { selector }) !== 'cmdIgnoreSelector' 
          ? t('cmdIgnoreSelector', { selector })
          : `Ignore unused CSS selector "${selector}"`;

        const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        
        const lineText = document.lineAt(diagnostic.range.start.line).text;
        const leadingSpaces = lineText.match(/^\s*/)?.[0] || '';
        const commentText = `${leadingSpaces}/* css-unused-ignore */\n`;
          
        fix.edit.insert(document.uri, new vscode.Position(diagnostic.range.start.line, 0), commentText);
        
        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;
        actions.push(fix);
      }

      // 2. "Fix all" action for the whole file
      if (diagnostics.length > 1) {
        const titleAll = t('cmdIgnoreAll') !== 'cmdIgnoreAll' ? t('cmdIgnoreAll') : 'Ignore all unused CSS selectors in this file';
        const fixAll = new vscode.CodeAction(titleAll, vscode.CodeActionKind.QuickFix);
        fixAll.edit = new vscode.WorkspaceEdit();
        
        // Use a set to avoid inserting multiple comments on the same line if multiple selectors share it
        const linesToComment = new Set<number>();
        for (const diagnostic of diagnostics) {
          linesToComment.add(diagnostic.range.start.line);
        }

        // Sort lines descending so inserts don't mess up subsequent line numbers
        const sortedLines = Array.from(linesToComment).sort((a, b) => b - a);

        for (const line of sortedLines) {
          const lineText = document.lineAt(line).text;
          const leadingSpaces = lineText.match(/^\s*/)?.[0] || '';
          fixAll.edit.insert(document.uri, new vscode.Position(line, 0), `${leadingSpaces}/* css-unused-ignore */\n`);
        }

        fixAll.diagnostics = [...diagnostics];
        actions.push(fixAll);
      }
    }

    return actions;
  }
}
