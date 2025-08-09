import * as vscode from 'vscode';
import { FirefoxProfilerCustomEditor } from './customEditor';
import { getFirefoxProfilerWebviewContent } from './webview';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    FirefoxProfilerCustomEditor.register(context);

    vscode.commands.registerCommand('firefox-profiler.show-uploads', async () => {
        const panel = vscode.window.createWebviewPanel(
            "firefox-profiler.show-uploads",
            "Uploaded Profiles",
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        panel.webview.html = getFirefoxProfilerWebviewContent("uploaded-recordings");
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
