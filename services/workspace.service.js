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

const { workspace, Uri, window } = require("vscode");
const vscode = require("vscode");
const path = require("path");
const { WORKSPACE, TEXT, BUTTON, COMMAND, ERROR, MESSAGE } = require("../constants");
const {parse, stringify} = require("yaml")

module.exports = class WorkspaceService {
  constructor() {
    this.promptsList = new Set();
    this.embeddingsList = new Set();
  }

  getWorkspaceConfig() {
    const folders = vscode.workspace.workspaceFolders;
    return {
      enable: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.ENABLE),
      promptLib: ".promptLib",
      LLMserverURL: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.LLM_SERVER_URL),
      LLMauthToken: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.LLM_TOKEN),
      LLMProvider: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.LLM_PROVIDER_TYPE, "Alita"),
      DisplayType: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.DISPLAY_TYPE),
      LLMmodelName: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.LLM_MODEL_NAME),
      DEFAULT_TOKENS: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.DEFAULT_TOKENS),
      LLMApiVersion: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.LLM_API_VERSION, "2023-12-01-preview"),
      topP: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.TOP_P),
      topK: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.TOP_K),
      maxTokens: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.MAX_TOKENS),
      temperature: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.TEMPERATURE),
      projectID: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.PROJECTID),
      integrationID: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.INTEGRATIONID),
      verifySsl: workspace
        .getConfiguration(WORKSPACE.EXTENSION.NAME)
        .get(WORKSPACE.EXTENSION.PARAM.VERIFY_SSL),
      workspacePath: folders && folders.length > 0 ? folders[0].uri.fsPath : null,
    };
  }

  async readContent(filePath, isJson=false) {
    try {
      const content = await workspace.fs.readFile(Uri.file(filePath));
      const ext = filePath.split(".").pop();
      try {
        if (isJson || ext == "json"){
          return JSON.parse(content)
        } else if (["yaml","yml"].includes(ext)) {
          return parse(Buffer.from(content).toString())
        } else {
          return Buffer.from(content).toString();  
        }
      } catch (ex) {
        return Buffer.from(content).toString();
      }
    } catch (error) {
      await window.showErrorMessage(ERROR.COMMON.READ_FILE(filePath, error));
      throw new Error(ERROR.COMMON.READ_FILE(filePath, error));
    } 
  }

  async writeContent(filePath, content, isJson=false) {
    const ext = filePath.split(".").pop();
    if (typeof(content) == "object") {
      if (isJson || ext == "json"){
        content = JSON.stringify(content, null, 2)
      } else if (["yaml","yml"].includes(ext)) {
        content = stringify(content)
      } 
    }
    try {
      await workspace.fs.writeFile(
        Uri.file(filePath),
        new Uint8Array(Buffer.from(content))
      );
    } catch (error) {
      await window.showErrorMessage(ERROR.COMMON.WRITE_FILE(filePath, error));
      throw new Error(ERROR.COMMON.WRITE_FILE(filePath, error));
    }
  }

  async addContentToTemplate({ items, basePath, selText, templateKey } = {}) {
    if (!items.size) throw new Error(ERROR.COMMON.SHOULD_HAVE_ITEMS);
    if (!basePath) throw new Error(ERROR.COMMON.SHOULD_HAVE_BASE_PATH);
    if (!selText) throw new Error(ERROR.COMMON.SHOULD_HAVE_AT_LEAST());

    const { label, template } = await vscode.window.showQuickPick([...items]);
    if (!template) {
      await vscode.window.showErrorMessage(ERROR.COMMON.SHOULD_HAVE_PROMPT);
      throw new Error(ERROR.COMMON.SHOULD_HAVE_PROMPT);
    }
    const pathToFile = path.join(basePath, template);
    var templateContent = await this.readContent(pathToFile);
    if  (typeof(templateContent) == "object") {
      switch (templateKey) {
        case "context":
          templateContent[templateKey] = templateContent[templateKey] + "\n" + selText;
          break;
        case "examples":
          if (templateContent[templateKey] == undefined) {
            templateContent[templateKey] = []
          }
          templateContent[templateKey].push(selText);
          break;
      }
    } else {
      templateContent = templateContent + "\n" + selText;
    }
    await this.writeContent(pathToFile, templateContent);
    await vscode.window.showInformationMessage(
      MESSAGE.CONTEXT_WAS_ADDED(label)
    );
  }

  async checkThatFileExists(pathToFile) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(pathToFile));
    } catch (error) {
      throw new Error(ERROR.COMMON.FILE_NOT_EXISTS(pathToFile, error));
    }
  }

  async updatePrompts() {
    let prompts = {};
    const workspaceConfig = this.getWorkspaceConfig();
    try {
      prompts = await this.readContent(
        path.join(workspaceConfig.workspacePath, workspaceConfig.promptLib, "./prompts.json"),
        true
      );
    } catch (e) {
      await this.showSettings();
    }
    this.promptsList.clear();
    if (prompts) {
      for (const key of Object.keys(prompts)) {
        this.promptsList.add({
          label: key,
          description: prompts[key].description,
          template: prompts[key].template,
          external: prompts[key].external ? prompts[key].external : false,
          prompt_id: prompts[key].prompt_id ? prompts[key].prompt_id : "",
          integration_uid: prompts[key].integration_uid ? prompts[key].integration_uid : "",
          scope_id: prompts[key].scope_id ? prompts[key].scope_id : "",
          template_id: prompts[key].template_id ? prompts[key].template_id : "",
          models: prompts[key].models ? prompts[key].models : [],
          userSettings: prompts[key].userSettings ? prompts[key].userSettings : {},
        });
      }
    }
    return this.promptsList;
  }

  async showSettings() {
    const choice = await vscode.window.showInformationMessage(
      TEXT.ALITA_ACTIVATED,
      BUTTON.SETTINGS
    );
    if (!choice) return;
    return await vscode.commands.executeCommand(
      COMMAND.OPEN_SETTINGS,
      WORKSPACE.EXTENSION.NAME
    );
  }

  async updateEmbeddings() {
    const workspaceConfig = this.getWorkspaceConfig();
    let embeddings
    try {
      embeddings = await this.readContent(
        path.join(workspaceConfig.workspacePath, workspaceConfig.promptLib, "./embeddings.json"),
        true
      );
    } catch (e) {
      await this.showSettings();
    }
    this.embeddingsList.clear();
    if (embeddings) {
      for (const embedding of Object.keys(embeddings)) {
        this.embeddingsList.add({
          label: embedding,
          description: embeddings[embedding].description,
          extension: embeddings[embedding].extension,
          top_k: embeddings[embedding].top_k,
          cutoff: embeddings[embedding].cutoff
        });
      }
    }
    return this.embeddingsList;
  }
};
