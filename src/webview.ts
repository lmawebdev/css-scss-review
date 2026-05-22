import * as vscode from 'vscode';
import { AnalysisResult } from './analyzer';
import { confidenceIcon } from './confidence';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, results: AnalysisResult) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getHtmlForWebview(results);
  }

  public static show(results: AnalysisResult) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      DashboardPanel.currentPanel.update(results);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'cssUnusedDashboard',
      'CSS Unused Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, results);
  }

  public update(results: AnalysisResult) {
    this._panel.webview.html = this._getHtmlForWebview(results);
  }

  public dispose() {
    DashboardPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  private _getHtmlForWebview(results: AnalysisResult): string {
    const unusedCount = results.unused.length;
    const usedCount = results.used.length;
    const total = results.total;
    const coverage = total > 0 ? Math.round((usedCount / total) * 100) : 100;
    
    // SVG Donut Chart calculation
    const dasharray = `${coverage} ${100 - coverage}`;

    const sortedUnused = [...results.unused].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    
    let tableRows = '';
    for (const s of sortedUnused) {
      const relativePath = vscode.workspace.asRelativePath(s.file);
      const conf = s.confidence ?? 0;
      const icon = confidenceIcon(conf);
      tableRows += `
        <tr>
          <td><code class="selector">${this._escape(s.selector)}</code></td>
          <td>${this._escape(relativePath)}</td>
          <td>${s.line + 1}</td>
          <td>
            <div class="conf-bar-container">
              <div class="conf-bar-wrapper">
                <div class="conf-bar" style="width: ${conf}%; background: var(--conf-${conf >= 80 ? 'green' : conf >= 50 ? 'yellow' : 'red'})"></div>
              </div>
              <span class="conf-text">${icon} ${conf}%</span>
            </div>
          </td>
        </tr>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Unused Dashboard</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border);
      --surface: var(--vscode-editorWidget-background);
      --accent: var(--vscode-textLink-foreground);
      --conf-green: #a6e3a1;
      --conf-yellow: #f9e2af;
      --conf-red: #f38ba8;
      font-family: var(--vscode-font-family), system-ui, sans-serif;
    }
    body { margin: 0; padding: 2.5rem; background: var(--bg); color: var(--fg); }
    h1 { font-size: 2.2rem; margin-bottom: 2rem; font-weight: 800; background: linear-gradient(90deg, var(--accent), #b4befe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    
    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card { background: var(--surface); padding: 1.8rem; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.25); }
    .stat-card h3 { margin: 0; font-size: 0.85rem; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .stat-value { font-size: 3rem; font-weight: 800; margin-top: 1rem; color: var(--fg); }
    
    /* Chart */
    .chart-container { display: flex; align-items: center; justify-content: center; position: relative; width: 140px; height: 140px; margin: 1rem auto 0; }
    .chart-svg { transform: rotate(-90deg); width: 100%; height: 100%; drop-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .chart-circle-bg { fill: none; stroke: var(--border); stroke-width: 3.5; }
    .chart-circle { fill: none; stroke: var(--accent); stroke-width: 3.5; stroke-dasharray: ${dasharray}; stroke-linecap: round; animation: fillChart 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    @keyframes fillChart { from { stroke-dasharray: 0 100; } }
    .chart-text { position: absolute; font-size: 1.8rem; font-weight: 800; color: var(--accent); }
    
    /* Table */
    .table-container { background: var(--surface); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 1.2rem 1.5rem; border-bottom: 2px solid var(--border); color: var(--vscode-descriptionForeground); font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; }
    td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); font-size: 0.95rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(255,255,255,0.03); }
    
    code.selector { background: rgba(0,0,0,0.2); padding: 0.3rem 0.6rem; border-radius: 6px; font-family: var(--vscode-editor-font-family); color: var(--accent); font-weight: 600; border: 1px solid rgba(255,255,255,0.05); }
    
    /* Confidence Bar */
    .conf-bar-container { display: flex; align-items: center; gap: 1rem; }
    .conf-bar-wrapper { flex: 1; height: 6px; background: rgba(0,0,0,0.2); border-radius: 3px; overflow: hidden; }
    .conf-bar { height: 100%; border-radius: 3px; transition: width 1s cubic-bezier(0.2, 0.8, 0.2, 1); }
    .conf-text { font-size: 0.95rem; font-weight: 600; white-space: nowrap; min-width: 60px; text-align: right; }
  </style>
</head>
<body>
  <h1>CSS Analyzer Dashboard</h1>
  
  <div class="stats-grid">
    <div class="stat-card" style="align-items: center;">
      <h3>Coverage</h3>
      <div class="chart-container">
        <svg viewBox="0 0 36 36" class="chart-svg">
          <circle class="chart-circle-bg" cx="18" cy="18" r="15.915"></circle>
          <circle class="chart-circle" cx="18" cy="18" r="15.915"></circle>
        </svg>
        <div class="chart-text">${coverage}%</div>
      </div>
    </div>
    <div class="stat-card">
      <h3>Used Selectors</h3>
      <div class="stat-value" style="color: var(--conf-green)">${usedCount}</div>
    </div>
    <div class="stat-card">
      <h3>Unused Selectors</h3>
      <div class="stat-value" style="color: var(--conf-red)">${unusedCount}</div>
    </div>
    <div class="stat-card">
      <h3>Total Analyzed</h3>
      <div class="stat-value">${total}</div>
    </div>
  </div>

  <h2 style="margin-top: 2rem; margin-bottom: 1rem; color: var(--accent); font-size: 1.5rem;">Unused Selectors Detail</h2>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Selector</th>
          <th>File Location</th>
          <th>Line</th>
          <th>Probability of Usage (Confidence)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="4" style="text-align:center;padding:3rem;color:var(--conf-green);font-size:1.1rem;font-weight:600;">No unused selectors found! Workspace is clean. 🎉</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  private _escape(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
