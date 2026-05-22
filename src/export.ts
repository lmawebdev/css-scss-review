import * as vscode from 'vscode';
import { AnalysisResult, CSSSelector } from './analyzer';
import { formatSpecificity, calculateSpecificity } from './specificity';

export type ExportFormat = 'json' | 'csv' | 'html';

export async function exportResults(
  results: AnalysisResult,
  format: ExportFormat
): Promise<void> {
  const content = format === 'json'
    ? exportToJSON(results)
    : format === 'csv'
      ? exportToCSV(results)
      : exportToHTML(results);

  const ext = format === 'html' ? 'html' : format;
  const defaultUri = vscode.workspace.workspaceFolders?.[0]
    ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, `css-analysis.${ext}`)
    : undefined;

  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      [format.toUpperCase()]: [ext]
    }
  });

  if (!uri) return;

  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
  vscode.window.showInformationMessage(`Analysis exported to ${vscode.workspace.asRelativePath(uri)}`);
}

function selectorToRow(s: CSSSelector, relativePath: string) {
  const spec = calculateSpecificity(s.selector);
  return {
    selector: s.selector,
    file: relativePath,
    line: s.line + 1,
    status: s.status ?? (s.used ? 'used' : 'unused'),
    useCount: s.useCount,
    confidence: (s as any).confidence ?? 0,
    specificity: formatSpecificity(spec),
    source: s.source,
    scoped: s.scoped ?? false
  };
}

function exportToJSON(results: AnalysisResult): string {
  const all = [...results.unused, ...results.used];
  const rows = all.map(s => {
    const relativePath = vscode.workspace.asRelativePath(s.file);
    return selectorToRow(s, relativePath);
  });

  return JSON.stringify({
    generated: new Date().toISOString(),
    summary: {
      total: results.total,
      used: results.used.length,
      unused: results.unused.length,
      coverage: results.total > 0 
        ? ((results.used.length / results.total) * 100).toFixed(1) + '%' 
        : '100%'
    },
    selectors: rows
  }, null, 2);
}

function exportToCSV(results: AnalysisResult): string {
  const all = [...results.unused, ...results.used];
  const headers = ['Selector', 'File', 'Line', 'Status', 'Use Count', 'Confidence', 'Specificity', 'Source', 'Scoped'];
  const rows = all.map(s => {
    const relativePath = vscode.workspace.asRelativePath(s.file);
    const row = selectorToRow(s, relativePath);
    return [
      `"${row.selector.replace(/"/g, '""')}"`,
      row.file,
      row.line,
      row.status,
      row.useCount,
      row.confidence,
      row.specificity,
      row.source,
      row.scoped
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function exportToHTML(results: AnalysisResult): string {
  const unusedCount = results.unused.length;
  const usedCount = results.used.length;
  const total = results.total;
  const coverage = total > 0 ? ((usedCount / total) * 100).toFixed(1) : '100';

  const unusedRows = results.unused.map(s => {
    const relativePath = vscode.workspace.asRelativePath(s.file);
    const spec = calculateSpecificity(s.selector);
    return `<tr>
      <td><code>${escapeHtml(s.selector)}</code></td>
      <td>${escapeHtml(relativePath)}</td>
      <td>${s.line + 1}</td>
      <td>${formatSpecificity(spec)}</td>
      <td>${s.source}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Analysis Report</title>
  <style>
    :root { --bg: #1e1e2e; --surface: #313244; --text: #cdd6f4; --accent: #89b4fa; --red: #f38ba8; --green: #a6e3a1; --yellow: #f9e2af; --border: #45475a; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; }
    h1 { color: var(--accent); margin-bottom: 0.5rem; font-size: 1.8rem; }
    .subtitle { color: #a6adc8; margin-bottom: 2rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat { background: var(--surface); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--border); }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-label { color: #a6adc8; font-size: 0.85rem; margin-top: 0.25rem; }
    .stat-value.green { color: var(--green); }
    .stat-value.red { color: var(--red); }
    .stat-value.yellow { color: var(--yellow); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; }
    th { background: #45475a; text-align: left; padding: 0.75rem 1rem; font-weight: 600; color: var(--accent); }
    td { padding: 0.6rem 1rem; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    code { background: rgba(0,0,0,0.3); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
    .section-title { font-size: 1.2rem; margin: 2rem 0 1rem; color: var(--red); }
  </style>
</head>
<body>
  <h1>CSS Analysis Report</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
  
  <div class="stats">
    <div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Total Selectors</div></div>
    <div class="stat"><div class="stat-value green">${usedCount}</div><div class="stat-label">Used</div></div>
    <div class="stat"><div class="stat-value red">${unusedCount}</div><div class="stat-label">Unused</div></div>
    <div class="stat"><div class="stat-value yellow">${coverage}%</div><div class="stat-label">Coverage</div></div>
  </div>

  <h2 class="section-title">Unused Selectors (${unusedCount})</h2>
  <table>
    <thead><tr><th>Selector</th><th>File</th><th>Line</th><th>Specificity</th><th>Source</th></tr></thead>
    <tbody>${unusedRows || '<tr><td colspan="5" style="text-align:center;color:var(--green)">No unused selectors found! 🎉</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
