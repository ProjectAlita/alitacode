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

const path = require("path");
const {
  workspaceService,
  windowService,
} = require("../services");
const { TEXT } = require("../constants");

module.exports = async function (items, {promptName= "", promptDescription= "", context="", variables, integration_settings}) {
  const { promptLib, workspacePath } = workspaceService.getWorkspaceConfig();
  /*const promptName = await windowService.showInputBox({
    title: TEXT.ENTER_PROMPT_NAME,
  });
  const promptDescription = await windowService.showInputBox({
    title: TEXT.ENTER_PROMPT_DESCRIPTION,
  });
  const context = await windowService.showInputBox({
    title: TEXT.ENTER_PROMPT_CONTEXT,
  })
  if (!promptName || !promptDescription || !context) return;*/

  const normalizedPromptName = promptName.replace(/[^\w\d]/g, "_");
  const newPromptFileName = `${normalizedPromptName}.yaml`;

  const promptContent= {context}
  if(variables){
    promptContent.variables = variables
  }
  if(integration_settings){
    promptContent.integration_settings = integration_settings
  }
  await workspaceService.writeContent(
      path.join(workspacePath, promptLib, newPromptFileName),
      promptContent
  );
  const promptsMapping = await workspaceService.readContent(
      path.join(workspacePath, promptLib, "./prompts.json"),
      true
  );
  promptsMapping[promptName] = {
    description: promptDescription,
    template: newPromptFileName,
    external: false
  };
  await workspaceService.writeContent(
      path.join(workspacePath, promptLib, "./prompts.json"),
      promptsMapping,
      true
  );

  items.add({ label: promptName, description: promptDescription, template: newPromptFileName });
  // await alitaService.uploadPrompts(
  //   path.join(workspacePath, promptLib, newPromptFileName),
  //   uploadedPrompts,
  //   promptName
  // );
};