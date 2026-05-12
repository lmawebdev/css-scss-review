"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsManager = void 0;
const vscode = __importStar(require("vscode"));
class DiagnosticsManager {
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('css-unused');
    }
    updateDiagnostics(results) {
        this.diagnosticCollection.clear();
        // Group unused selectors by file
        const diagnosticsByFile = new Map();
        for (const selector of results.unused) {
            const filePath = selector.file.fsPath;
            if (!diagnosticsByFile.has(filePath)) {
                diagnosticsByFile.set(filePath, []);
            }
            const range = new vscode.Range(new vscode.Position(selector.line, 0), new vscode.Position(selector.line, selector.selector.length));
            const diagnostic = new vscode.Diagnostic(range, `Selector no utilizado: "${selector.selector}"`, vscode.DiagnosticSeverity.Warning);
            diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
            diagnostic.source = 'CSS Unused Detector';
            diagnosticsByFile.get(filePath).push(diagnostic);
        }
        // Set diagnostics for each file
        for (const [filePath, diagnostics] of diagnosticsByFile) {
            this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
        }
    }
    dispose() {
        this.diagnosticCollection.dispose();
    }
}
exports.DiagnosticsManager = DiagnosticsManager;
//# sourceMappingURL=diagnostics.js.map