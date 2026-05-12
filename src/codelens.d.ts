import * as vscode from 'vscode';
import { AnalysisResult } from './analyzer';
export declare class CSSCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses;
    readonly onDidChangeCodeLenses: vscode.Event<void>;
    private results;
    constructor();
    updateResults(results: AnalysisResult): void;
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]>;
}
//# sourceMappingURL=codelens.d.ts.map