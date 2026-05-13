import * as vscode from 'vscode';
import { AnalysisResult, CSSSelector } from './analyzer';
import { t } from './i18n';

/**
 * Removes unused CSS rules from the current file.
 * Handles both standalone CSS/SCSS files and inline <style> blocks.
 */
export async function removeUnusedInFile(
  document: vscode.TextDocument,
  results: AnalysisResult
): Promise<number> {
  const filePath = document.uri.fsPath;
  const unusedInFile = results.unused.filter(s => s.file.fsPath === filePath && s.range);

  if (unusedInFile.length === 0) {
    return 0;
  }

  // Sort by range start descending so we delete from bottom-up (line numbers stay stable)
  const sorted = [...unusedInFile].sort((a, b) => {
    const lineDiff = b.range!.start.line - a.range!.start.line;
    if (lineDiff !== 0) { return lineDiff; }
    return b.range!.start.character - a.range!.start.character;
  });

  // Deduplicate by range (multiple selectors from same rule share the same range)
  const seenRanges = new Set<string>();
  const uniqueRules: CSSSelector[] = [];
  for (const s of sorted) {
    const key = `${s.range!.start.line}:${s.range!.start.character}:${s.range!.end.line}:${s.range!.end.character}`;
    if (!seenRanges.has(key)) {
      seenRanges.add(key);
      uniqueRules.push(s);
    }
  }

  const edit = new vscode.WorkspaceEdit();

  for (const selector of uniqueRules) {
    const range = selector.range!;
    const deleteRange = expandRangeToFullLines(document, range);
    edit.delete(document.uri, deleteRange);
  }

  await vscode.workspace.applyEdit(edit);
  return uniqueRules.length;
}

/**
 * Removes unused CSS rules across all workspace files.
 */
export async function removeUnusedGlobally(
  results: AnalysisResult
): Promise<{ filesChanged: number; rulesRemoved: number }> {
  const unusedByFile = new Map<string, CSSSelector[]>();

  for (const s of results.unused) {
    if (!s.range) { continue; }
    const key = s.file.fsPath;
    if (!unusedByFile.has(key)) {
      unusedByFile.set(key, []);
    }
    unusedByFile.get(key)!.push(s);
  }

  let totalRules = 0;
  let filesChanged = 0;

  const edit = new vscode.WorkspaceEdit();

  for (const [filePath, selectors] of unusedByFile) {
    const uri = vscode.Uri.file(filePath);
    let doc: vscode.TextDocument;
    try {
      doc = await vscode.workspace.openTextDocument(uri);
    } catch {
      continue;
    }

    // Sort descending, deduplicate
    const sorted = [...selectors].sort((a, b) => {
      const lineDiff = b.range!.start.line - a.range!.start.line;
      if (lineDiff !== 0) { return lineDiff; }
      return b.range!.start.character - a.range!.start.character;
    });

    const seenRanges = new Set<string>();
    let fileRules = 0;

    for (const s of sorted) {
      const key = `${s.range!.start.line}:${s.range!.start.character}:${s.range!.end.line}:${s.range!.end.character}`;
      if (seenRanges.has(key)) { continue; }
      seenRanges.add(key);

      const deleteRange = expandRangeToFullLines(doc, s.range!);
      edit.delete(uri, deleteRange);
      fileRules++;
    }

    if (fileRules > 0) {
      filesChanged++;
      totalRules += fileRules;
    }
  }

  await vscode.workspace.applyEdit(edit);

  return { filesChanged, rulesRemoved: totalRules };
}

/**
 * Expands a range to include the full lines (and trailing blank lines/comment above).
 * This ensures we remove the entire rule + any preceding css-unused-ignore comment.
 */
function expandRangeToFullLines(document: vscode.TextDocument, range: vscode.Range): vscode.Range {
  let startLine = range.start.line;
  const endLine = range.end.line;

  // Include preceding css-unused-ignore comment if present
  if (startLine > 0) {
    const prevLineText = document.lineAt(startLine - 1).text.trim();
    if (prevLineText === '/* css-unused-ignore */') {
      startLine--;
    }
  }

  // Include preceding blank line if it exists (cleaner removal)
  if (startLine > 0 && document.lineAt(startLine - 1).isEmptyOrWhitespace) {
    startLine--;
  }

  // Delete up to the start of the next line (include trailing newline)
  const nextLine = endLine + 1;
  if (nextLine < document.lineCount) {
    return new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(nextLine, 0)
    );
  }

  // Last line of file
  return new vscode.Range(
    new vscode.Position(startLine, 0),
    new vscode.Position(endLine, document.lineAt(endLine).text.length)
  );
}
