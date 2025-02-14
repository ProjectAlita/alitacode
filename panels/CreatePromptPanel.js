import { getUri } from "../utils/getUri";
import { createPrompt } from "../commands";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

export class CreatePromptPanel {
  constructor(panel, extensionUri) {
    this._panel = panel;
    this._disposables = [];
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
  }

  static render(context, workspaceServicePrompts) {
    if (CreatePromptPanel.currentPanel) {
      CreatePromptPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("alitacode", "Create Prompt", vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "out")],
      });

      CreatePromptPanel.currentPanel = new CreatePromptPanel(panel, context.extensionUri);
      CreatePromptPanel.currentPanel._addReceiveMessageHandler(context, workspaceServicePrompts);
    }
  }

  _addReceiveMessageHandler(context, workspaceServicePrompts) {
    CreatePromptPanel.currentPanel._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "save":
            await createPrompt(workspaceServicePrompts, message.promptSettings);
            vscode.window.showInformationMessage("Prompt saved!");
            return;
          case "getSettings":
            const settings = {
              LLMModelName: vscode.workspace.getConfiguration().get("eliteacode.LLMModelName"),
              topP: vscode.workspace.getConfiguration().get("eliteacode.topP"),
              topK: vscode.workspace.getConfiguration().get("eliteacode.topK"),
              temperature: vscode.workspace.getConfiguration().get("eliteacode.temperature"),
              maxTokens: vscode.workspace.getConfiguration().get("eliteacode.maxTokens")
            };
            CreatePromptPanel.currentPanel._panel.webview.postMessage({ command: "populateFields", settings });
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  dispose() {
    CreatePromptPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  _getWebviewContent(webview, extensionUri) {
    const webviewUri = getUri(webview, extensionUri, ["out", "webview.js"]);
    const htmlBody = fs.readFileSync(path.resolve(__dirname, "../panels/CreatePromptPanel.html"), "utf8");
    const htmlScripts = fs.readFileSync(path.resolve(__dirname, "../panels/CreatePromptPanelScripts.js"), "utf8");
    return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Create Prompt</title>
    </head>
    <body>
        <script>
           ${htmlScripts}
        </script>
        <script type="module" src="${webviewUri}"></script>
        ${htmlBody}
        <script>
          // Request settings when the webview is loaded
          window.addEventListener('load', () => {
            vscode.postMessage({ command: 'getSettings' });
          });
        </script>
    </body>
    </html>
    `;
  }
}
