import * as vscode from 'vscode';
export interface CSSSelector {
    selector: string;
    file: vscode.Uri;
    line: number;
    used: boolean;
    usedIn?: string[];
    useCount?: number;
}
export interface AnalysisResult {
    unused: CSSSelector[];
    used: CSSSelector[];
    total: number;
}
export declare class CSSAnalyzer {
    private cssFiles;
    private codeFiles;
    private selectors;
    analyzeWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<AnalysisResult>;
    private findFiles;
    private extractSelectors;
    private extractSelectorsFromRule;
    private checkUsage;
    private createSearchPatterns;
    private getResults;
}
//# sourceMappingURL=analyzer.d.ts.map