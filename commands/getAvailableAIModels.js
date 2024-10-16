// Copyright 2023 EPAM Systems
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


const { alitaService } = require("../services");
const vscode = require("vscode");

module.exports = async function () {
  const avaiableModels = createAIProvidersOptions(await alitaService.getAIModelNames());
  const selectedModel = await showInputBox(avaiableModels, "Please select a LLM model:");
  if (selectedModel) {
    const configuration = vscode.workspace.getConfiguration();
    const { label: modelName, description: groupName } = selectedModel;
    const integrationName = await alitaService.getAIModelIntegrationName(groupName, true);
    const uid = await alitaService.getAIModelUid(groupName, true);
    if (vscode.workspace.workspaceFolders) {

      // 2) Getting the Configuration target
      const target = await vscode.window.showQuickPick(
        [
          { label: "User", description: "User Settings", target: vscode.ConfigurationTarget.Global },
          { label: "Workspace", description: "Workspace Settings", target: vscode.ConfigurationTarget.Workspace }
        ],
        { placeHolder: "Select the view to show when opening a window." });

      if (modelName && target) {

        // 3) Update the configuration value in the target
        await configuration.update("alitacode.LLMModelName", modelName, target.target);       
        await configuration.update("alitacode.integrationName",integrationName.toString(), target.target );       
        await configuration.update("alitacode.integrationUid", uid.toString(), target.target);
      }
    } else {
      // 2) Update the configuration value in User Setting in case of no workspace folders
      await configuration.update("alitacode.LLMModelName", modelName, vscode.ConfigurationTarget.Global);       
      await configuration.update("alitacode.integrationName",integrationName.toString(),
       vscode.ConfigurationTarget.Global);       
      await configuration.update("alitacode.integrationUid", uid.toString(),vscode.ConfigurationTarget.Global);
    }
    vscode.window.showInformationMessage(`You selected: ${modelName}  [${groupName}]`);
  } else {
    vscode.window.showInformationMessage("Operation cancelled.");
  }
};

function createAIProvidersOptions(providerItems) {
  return providerItems.map(item => {
    const key = Object.keys(item)[0];
    const value = item[key];
    return { label: value, description: key }
  })
}

function showInputBox(options, placeHolder) {
  return vscode.window.showQuickPick(options, { placeHolder });
}