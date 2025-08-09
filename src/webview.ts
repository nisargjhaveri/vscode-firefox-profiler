export function getFirefoxProfilerWebviewContent(path: string): string {
    const profilerOrigin: string = "https://profiler.firefox.com/";

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
            iframe.src = profilerOrigin + "/${path}";
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
</html>
`;
    }
