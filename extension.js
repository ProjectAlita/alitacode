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
const { workspaceService, alitaService } = require("./services");
const { COMMAND, EXTERNAL_PROMPTS_PROVIDERS } = require("./constants/index");
const {
  addContext,
  addExample,
  createPrompt,
  predict,
  addGoodPrediction,
  initAlita,
  syncPrompts,
  onConfigChange,
  getAvailableAIModels
} = require("./commands");
const OutputService = require("./services/output.service");

async function activate(context) {
  await vscode.commands.executeCommand("setContext", "alitacode.ExtentablePlatforms", EXTERNAL_PROMPTS_PROVIDERS);
  try {
    await onConfigChange();
  } catch (error) {
    console.error(error);
  }

  vscode.workspace.onDidChangeConfiguration(async () => {
    await onConfigChange();
  });

  const predictSub = vscode.commands.registerCommand(COMMAND.PREDICT, predict.bind(null));

  const initAlitaSub = vscode.commands.registerCommand(COMMAND.INIT_ALITA, initAlita);

  const syncPromptsSub = vscode.commands.registerCommand(COMMAND.SYNC_PROMPTS, syncPrompts);

  const createPromptSub = vscode.commands.registerCommand(
    COMMAND.CREATE_PROMPT,
    createPrompt.bind(null, workspaceService.promptsList)
  );

  const addContextSub = vscode.commands.registerCommand(
    COMMAND.ADD_CONTEXT,
    addContext.bind(null, workspaceService.promptsList)
  );

  const addExampleSub = vscode.commands.registerCommand(
    COMMAND.ADD_EXAMPLE,
    addExample.bind(null, workspaceService.promptsList)
  );

  const addGoodPredictionSub = vscode.commands.registerCommand(
    COMMAND.ADD_GOOD_PREDICTION,
    addGoodPrediction
  );

  const getAvailableModelsSub = vscode.commands.registerCommand(
    COMMAND.GET_AVAILABLE_AI_MODELS,
    getAvailableAIModels
  );

  context.subscriptions.push(predictSub);
  context.subscriptions.push(createPromptSub);
  context.subscriptions.push(addContextSub);
  context.subscriptions.push(addExampleSub);
  context.subscriptions.push(addGoodPredictionSub);
  context.subscriptions.push(initAlitaSub);
  context.subscriptions.push(syncPromptsSub);

  context.subscriptions.push(OutputService.getChannel());
  context.subscriptions.push(getAvailableModelsSub);

  const api = {
    alitaService,
    workspaceService,
  };
  return api;
}

function deactivate() {
  OutputService.dispose();
}

module.exports = {
  activate,
  deactivate,
};
