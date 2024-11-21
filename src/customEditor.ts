import * as vscode from 'vscode';

export class FirefoxProfilerCustomDocument implements vscode.CustomDocument {
    constructor(public uri: vscode.Uri, private fileData: Uint8Array) {}

    async saveAs(targetResource: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.writeFile(targetResource, this.fileData);
    }

    get buffer(): ArrayBuffer {
        return this.fileData.buffer;
    }

    dispose(): void {
        // Nothing to do
    }
}

export class FirefoxProfilerCustomEditor implements vscode.CustomEditorProvider<FirefoxProfilerCustomDocument> {
    public static readonly viewType = 'firefox-profiler.viewer';
    private static readonly profilerOrigin = "https://deploy-preview-5170--perf-html.netlify.app/";

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            FirefoxProfilerCustomEditor.viewType,
            new FirefoxProfilerCustomEditor(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
            }
        );
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<FirefoxProfilerCustomDocument>> | vscode.Event<vscode.CustomDocumentContentChangeEvent<FirefoxProfilerCustomDocument>> = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<FirefoxProfilerCustomDocument>>().event;

    async saveCustomDocument(document: FirefoxProfilerCustomDocument, cancellation: vscode.CancellationToken): Promise<void> {
        // The document is never dirtied, nothing to do
        return;
    }

    async saveCustomDocumentAs(document: FirefoxProfilerCustomDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
        return document.saveAs(destination);
    }

    async revertCustomDocument(document: FirefoxProfilerCustomDocument, cancellation: vscode.CancellationToken): Promise<void> {
        // This should never be triggered as the document is never dirtied
        throw new Error('Method not implemented.');
    }

    async backupCustomDocument(document: FirefoxProfilerCustomDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
        // This should never be triggered as the document is never dirtied
        throw new Error('Method not implemented.');
    }

    async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<FirefoxProfilerCustomDocument> {
        try {
            let fileData: Uint8Array;

            if (openContext.untitledDocumentData) {
                fileData = openContext.untitledDocumentData;
            } else {
                const fileUri = uri.scheme === "untitled" ? vscode.Uri.file(uri.fsPath): uri;
                fileData = await vscode.workspace.fs.readFile(fileUri);
            }

            return new FirefoxProfilerCustomDocument(uri, fileData);
        } catch (e) {
            throw e;
        }
    }

    async resolveCustomEditor(document: FirefoxProfilerCustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        webviewPanel.webview.html = this.getWebviewContent(FirefoxProfilerCustomEditor.profilerOrigin);

        let isProfilerReady = false;
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            console.log("VS Code Received message", message);
            switch (message.name) {
                case "ready:response":
                    // Ready response coming from the profiler
                    isProfilerReady = true;
                    break;
                default:
                    console.error("Unknown message", message);
                    break;
            }
        });

        (async () => {
            // Wait for the profiler to be ready before injecting the profile
            while (!isProfilerReady) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                webviewPanel.webview.postMessage({ name: 'ready:request' });
            }

            // Inject the profile into the profiler
            webviewPanel.webview.postMessage({ name: 'inject-profile', profile: document.buffer });
        })();
    }

    getWebviewContent(profilerOrigin: string): string {
        return `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Firefox Profiler</title>
    </head>
    <body style="padding: 0">
        <script>
        (async function() {
            const profilerOrigin = "${profilerOrigin}";
            document.body.style.padding = '0';
            document.body.style.overflow = 'hidden';

            var iframe = document.createElement('iframe');
            iframe.src = profilerOrigin + "/from-post-message/";
            iframe.style.width = '100vw';
            iframe.style.height = '100vh';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const vscode = acquireVsCodeApi();
            window.addEventListener('message', (message) => {
                // Forward messages between VS Code and the profiler iframe
                if (message.source === iframe.contentWindow) {
                    vscode.postMessage(message.data);
                } else {
                    iframe.contentWindow.postMessage(message.data, profilerOrigin);
                }
            });
        })();
        </script>
    </body>
`;
    }
}
