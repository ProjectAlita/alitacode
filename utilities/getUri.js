export function getUri(webview, extensionUri, pathList) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}