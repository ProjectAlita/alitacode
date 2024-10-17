import {getUri} from "../utils/getUri";
import {createPrompt} from "../commands";

const vscode = require("vscode");
export class CreatePromptPanel {
 /* private _panel: any;
  private _disposables: any[];
  private static currentPanel: any;*/

  constructor(panel, extensionUri) {
    this._panel = panel;
    this._disposables = []
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
  }

  static render(context, workspaceServicePrompts) {
    if (CreatePromptPanel.currentPanel) {
      CreatePromptPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("alitacode", "Create Prompt", vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "out")]
      });

      CreatePromptPanel.currentPanel = new CreatePromptPanel(panel, context.extensionUri);
      CreatePromptPanel.currentPanel._addReceiveMessageHandler(context, workspaceServicePrompts)
    }
  }

  _addReceiveMessageHandler(context, workspaceServicePrompts) {
    CreatePromptPanel.currentPanel._panel.webview.onDidReceiveMessage(
        async message => {
          switch (message.command) {
            case "save":
              await createPrompt(workspaceServicePrompts, message.promptSettings)
              vscode.window.showInformationMessage( "Prompt saved!");
              return;
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
          const vscode = acquireVsCodeApi();
           const basicElementsArray = [
              "promptName", "promptDescription", "context"
            ]
            const integrationElementsArray = Object.create({})
            integrationElementsArray["temperature"] = 0.8,
            integrationElementsArray["LLMModelName"] = "gpt-4" ,
            integrationElementsArray["maxTokens"] = 1024,
            integrationElementsArray["topP"] = 40,
            integrationElementsArray["topK"] = 0.8
            
          function useProjectIntegrationFields(state) {
            const elements = Object.keys(integrationElementsArray)
            if(!state.checked){
              elements.forEach(
               (element) => {
                 document.getElementsByName(element)[0].removeAttribute("disabled");
                 document.getElementsByName(element)[0].value = integrationElementsArray[element];
               })
            } else {
              elements.forEach(
               (element) => document.getElementsByName(element)[0].setAttribute("disabled", "true"))
            }
          }
          
          function addVariable() {
             const dataGrid = document.getElementById("variables")
             const varName = document.getElementById("varName").value
             const varVal = document.getElementById("varVal").value
             if(varName !== '' && varVal !== ''){
               dataGrid.rowsData = [...dataGrid.rowsData, 
                {
                  name: varName,
                  value: varVal
                }
              ];
            }
          }
          
          function cleanUp(){
             basicElementsArray.forEach(
                (element) => { document.getElementsByName(element)[0].value = '' })
             Object.keys(integrationElementsArray).forEach(
                (element) => { document.getElementsByName(element)[0].value = '' })
             document.getElementById('variables').rowsData = []
             document.getElementById("varName").value = ''
             document.getElementById("varVal").value = ''
             document.getElementById('useProjectIntegration').checked = false
          }
          
          function savePrompt() {
            const promptSettings = Object.create({})
            basicElementsArray.forEach(
                (element) => { promptSettings[element] = document.getElementsByName(element)[0].value })
            if(document.getElementById('useProjectIntegration').checked){
              promptSettings.integration_settings = Object.create({})
              Object.keys(integrationElementsArray).forEach(
                  (element) => { 
                    const val = document.getElementsByName(element)[0].value;
                    promptSettings.integration_settings[element] = element === 'LLMModelName' ? val: +val
                  })
              }
            const dataGrid = document.getElementById("variables")
            if(dataGrid.rowsData.length >= 1){
              promptSettings.variables = Object.create({})
              dataGrid.rowsData.forEach(
                  (element) => { 
                    const regex = new RegExp('^\\\\d+$');
                    promptSettings.variables[element.name] = regex.test(element.value) ? +element.value : element.value
                  })
            }
            vscode.postMessage({
                command: 'save',
                promptSettings
            })
            console.log('alitacode prompt created!')
            cleanUp()
          }
        </script>
        <script type="module" src="${webviewUri}"></script>
        <vscode-text-field name="promptName">Name</vscode-text-field>
        <br />
        <vscode-text-field name="promptDescription">Description</vscode-text-field>
        <br />
        <vscode-text-area name="context" rows="4" cols="50">Context</vscode-text-area>
        <br />
        <label>
          Variables
          <br />
          <vscode-text-field id="varName">Name</vscode-text-field>
          <vscode-text-field id="varVal">Value</vscode-text-field>
          <vscode-button style="position: relative;top: -12px;" appearance="secondary" name="add-var" onclick="addVariable()">Add</vscode-button>
          <vscode-data-grid id="variables" aria-label="Basic"></vscode-data-grid>
        </label>
        <br />
        <label>
          <vscode-checkbox id="useProjectIntegration" onclick="useProjectIntegrationFields(this)" class="ws-input" />
          Use project integration settings in context file
        </label>
        <br />
        <vscode-text-field disabled="true" name="LLMModelName">Model</vscode-text-field>
        <br />
        <vscode-text-field disabled="true" name="topP">Top P</vscode-text-field>
        <br />
        <vscode-text-field disabled="true" name="topK">Top K</vscode-text-field>
        <br />
        <vscode-text-field disabled="true" name="temperature">Temperature</vscode-text-field>
        <br />
       <vscode-text-field disabled="true" name="maxTokens">Max Tokens</vscode-text-field>
       <br />
       <vscode-button appearance="primary" name="save-prompt" onclick="savePrompt()">Save</vscode-button>
    </body>
    </html>
    `;
  }
}