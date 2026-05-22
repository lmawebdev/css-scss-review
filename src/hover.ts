import * as vscode from 'vscode';
import { AnalysisResult, CSSSelector } from './analyzer';
import { confidenceIcon, confidenceLabel } from './confidence';
import { formatSpecificity } from './specificity';
import { t } from './i18n';

export class CSSHoverProvider implements vscode.HoverProvider {
  private results: AnalysisResult | undefined;

  public updateResults(results: AnalysisResult) {
    this.results = results;
  }

  public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    if (!this.results) {
      return null;
    }

    const filePath = document.uri.fsPath;
    const line = position.line;

    // Find if the hovered line contains any selector we analyzed
    const allSelectors = [...this.results.used, ...this.results.unused];
    const selectorsOnLine = allSelectors.filter(s => s.file.fsPath === filePath && s.line === line);

    if (selectorsOnLine.length === 0) {
      return null;
    }

    // Usually there might be one or more selectors on the line. We find the exact one based on position char if possible
    // For simplicity, we just gather info for all selectors on that line
    const hoverContents: vscode.MarkdownString[] = [];

    for (const selector of selectorsOnLine) {
      const md = new vscode.MarkdownString();
      md.isTrusted = true;

      if (selector.useCount && selector.useCount > 0) {
        // Group locations by file
        const fileCounts = new Map<string, number>();
        if (selector.locations) {
          for (const loc of selector.locations) {
            const relativePath = vscode.workspace.asRelativePath(loc.uri);
            fileCounts.set(relativePath, (fileCounts.get(relativePath) || 0) + 1);
          }
        }

        const countText = selector.useCount === 1 
          ? t('references', { count: 1, plural: '' }) 
          : t('references', { count: selector.useCount, plural: t('referencePlural') });

        md.appendMarkdown(`✅ **${selector.selector}**: ${countText}\n\n`);

        if (selector.specificity) {
          md.appendMarkdown(`${t('hoverSpecificity', { spec: formatSpecificity(selector.specificity) })}\n\n`);
        }

        if (selector.confidence !== undefined) {
          md.appendMarkdown(`${t('hoverConfidence', { 
            icon: confidenceIcon(selector.confidence), 
            score: selector.confidence,
            label: confidenceLabel(selector.confidence)
          })}\n\n`);
        } else if (selector.status === 'probable') {
          md.appendMarkdown(`⚠️ ${t('hoverProbable')}\n\n`);
        }

        if (fileCounts.size > 0) {
          md.appendMarkdown(`${t('hoverUsedIn')}\n`);
          for (const [file, count] of fileCounts) {
            md.appendMarkdown(`- \`${file}\` (${count})\n`);
          }
        }
      } else {
        md.appendMarkdown(`❌ **${selector.selector}**: ${t('noReferencesFound')}\n\n`);
        
        if (selector.specificity) {
          md.appendMarkdown(`${t('hoverSpecificity', { spec: formatSpecificity(selector.specificity) })}\n\n`);
        }
        
        md.appendMarkdown(t('hoverNotUsed'));
      }

      hoverContents.push(md);
    }

    return new vscode.Hover(hoverContents);
  }
}
