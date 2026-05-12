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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const analyzer_1 = require("./analyzer");
const diagnostics_1 = require("./diagnostics");
const codelens_1 = require("./codelens");
let analyzr;
let diagnosticsManager;
let codeLensProvider;
async function activate(context) {
    console.log('CSS Unused Detector extension is now active');
    analyzr = new analyzer_1.CSSAnalyzer();
    diagnosticsManager = new diagnostics_1.DiagnosticsManager();
    codeLensProvider = new codelens_1.CSSCodeLensProvider();
    // Register CodeLens Provider
    context.subscriptions.push(vscode.languages.registerCodeLensProvider([
        { scheme: 'file', language: 'css' },
        { scheme: 'file', language: 'scss' },
        { scheme: 'file', language: 'sass' }
    ], codeLensProvider));
    // Register the analyze command
    let analyzeCommand = vscode.commands.registerCommand('css-unused-detector.analyze', async () => {
        await runAnalysis();
    });
    // Register the open panel command
    let openPanelCommand = vscode.commands.registerCommand('css-unused-detector.openPanel', () => {
        vscode.commands.executeCommand('setContext', 'cssUnusedDetector.hasAnalysis', true);
    });
    context.subscriptions.push(analyzeCommand);
    context.subscriptions.push(openPanelCommand);
    // Run analysis on extension activation
    await runAnalysis();
    // Watch for file changes and re-run analysis
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{css,scss,sass,jsx,tsx,js,ts,vue,html}');
    fileWatcher.onDidCreate(() => {
        setTimeout(() => runAnalysis(), 1000);
    });
    fileWatcher.onDidChange(() => {
        setTimeout(() => runAnalysis(), 1000);
    });
    fileWatcher.onDidDelete(() => {
        setTimeout(() => runAnalysis(), 1000);
    });
    context.subscriptions.push(fileWatcher);
}
exports.activate = activate;
async function runAnalysis() {
    if (!vscode.workspace.workspaceFolders) {
        return;
    }
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const results = await analyzr.analyzeWorkspace(workspaceFolder);
        diagnosticsManager.updateDiagnostics(results);
        codeLensProvider.updateResults(results);
        if (results.unused.length > 0) {
            vscode.commands.executeCommand('setContext', 'cssUnusedDetector.hasAnalysis', true);
            const message = `Se encontraron ${results.unused.length} selectores CSS/SCSS no utilizados`;
            vscode.window.showInformationMessage(message);
        }
    }
    catch (error) {
        console.error('Error during CSS analysis:', error);
        vscode.window.showErrorMessage('Error al analizar CSS/SCSS');
    }
}
function deactivate() {
    diagnosticsManager?.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map