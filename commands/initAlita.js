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

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { workspaceService } = require("../services");
const onConfigChange = require("./onConfigChange");
const defaultPrompts = require("../constants/defaultPrompts");

module.exports = async function () {
  const { promptLib, workspacePath } = workspaceService.getWorkspaceConfig();
  if (!fs.existsSync(path.join(workspacePath, promptLib))) {
    fs.mkdirSync(path.join(workspacePath, promptLib));
  }
  if (!fs.existsSync(path.join(workspacePath, promptLib, "./prompts.json"))) {
    var prompts = {};
    for (const promptKey of Object.keys(defaultPrompts)) {
      const promptName = promptKey.replace(/_/g, " ") + "_prompt";
      const promptDescription = defaultPrompts[promptKey].description;
      delete defaultPrompts[promptKey].description;
      workspaceService.writeContent(
        path.join(workspacePath, promptLib, `${promptKey}.yaml`),
        defaultPrompts[promptKey]
      );
      prompts[promptName] = {
        description: promptDescription,
        template: `${promptKey}.yaml`,
        external: false,
      };
    }
    fs.writeFileSync(path.join(workspacePath, promptLib, "./prompts.json"), JSON.stringify(prompts, null, 2));
  }
  await vscode.commands.executeCommand("setContext", "eliteacode.init", true);
  return await onConfigChange();
};
