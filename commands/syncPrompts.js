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

const vscode = require("vscode");
const { alitaService, workspaceService } = require("../services");

module.exports = async function () {
  try {
    alitaService.checkLLMConfig();
    await alitaService.serviceProvider.syncPrompts();
    alitaService.init_done = 1;
    await workspaceService.updatePrompts();
    vscode.window.showInformationMessage("External prompts were synchronized");
  } catch (e) {
    await vscode.window.showErrorMessage(
      `Alita is not able to sync prompt with ${alitaService.serviceProvider.getPromptsUrl}. Error: ${e}`
    );
  }
};
