import * as vscode from 'vscode';
import { FirefoxProfilerCustomEditor } from './customEditor';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    FirefoxProfilerCustomEditor.register(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
