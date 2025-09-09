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
const vscode = require("vscode");
const WorkspaceService = require("../workspace.service");
const Request = require("../../http/request");
var Sqrl = require("squirrelly");

module.exports = class LlmServiceProvider {
  constructor() {
    this.request = (url, options) => new Request(url, options);
    this.workspaceService = new WorkspaceService();
    this.config = this.workspaceService.getWorkspaceConfig();
    this.getPromptsUrl = "";
    this.updatePromptsUrl = "";
    this.predictUrl = "";
    this.prompts = [];
    this.authType = "";
    this.authToken = "";
  }

  async init() {
    console.log("Not Implemented");
  }

  sanitize_input() {
    console.log("Not Implemented");
  }

  getSocketConfig() {
    throw new Error("Not implemented");
  }

  getModelSettings() {
    throw new Error("Not implemented");
  }

  async predict(template, prompt) {
    throw new Error("Not implemented");
  }

  async getPrompts() {
    throw new Error("Not implemented");
  }

  async getDatasources() {
    throw new Error("Not implemented");
  }

  async chat() {
    throw new Error("Not implemented");
  }

  async createPrompt() {
    throw new Error("Not implemented");
  }

  mergePrompts() {
    throw new Error("Not implemented");
  }

  async getEmbeddings() {
    throw new Error("Not implemented");
  }

  async createEmbedding() {
    throw new Error("Not implemented");
  }

  async updateEmbedding() {
    throw new Error("Not implemented");
  }

  async similarity() {
    throw new Error("Not implemented");
  }

  async deduplication() {
    throw new Error("Not implemented");
  }

  getTemplateDefaults() {
    try {
      return {
        vsLanguage: vscode.window.activeTextEditor.document.languageId,
        vsFileName: vscode.window.activeTextEditor.document.fileName,
        vsWorkspaceFolder: vscode.workspace.workspaceFolders[0].uri.fsPath,
        vsWorkspaceName: vscode.workspace.name,
      };
    } catch (ex) {
      return {
        vsLanguage: "",
        vsFileName: "",
        vsWorkspaceFolder: vscode.workspace.workspaceFolders[0].uri.fsPath,
        vsWorkspaceName: vscode.workspace.name,
      };
    }
  }

  async getPromptTemplate(config, template) {
    //
    // Structure of prompt_templates
    // {
    //    "context": "",
    //    "examples": [
    //        {"input": "text", "output": "text" },
    //    ],
    //    "variables": { "name": "value" }
    // }
    //  or plain text, if not a JSON or strutcure is invalid
    //
    try {
      const prompt_template = await this.workspaceService.readContent(
        path.join(config.workspacePath, config.promptLib, template)
      );
      try {
        if (prompt_template.context === undefined) {
          return { context: prompt_template };
        }
        //Checking if variables in template and showing form to fill them
        try {
          if (prompt_template.variables !== undefined) {
            prompt_template.variables = await this.handleVars(prompt_template.variables);
          }
        } catch (er) {
          console.log(er);
        }
        return prompt_template;
      } catch (ex) {
        return { context: prompt_template };
      }
    } catch (err) {
      return { context: "" };
    }
  }

  async handleVars(prompt_vars) {
    for (const variable of Object.keys(prompt_vars)) {
      const variableValue = await vscode.window.showInputBox({
        title: `Enter value for ${variable}`,
        value: prompt_vars[variable],
      });
      prompt_vars[variable] = variableValue;
    }
    return prompt_vars;
  }

  chatify_template(prompt_template, prompt) {
    const content_role = "system";
    const user_role = "user";
    const assistant_role = "assistant";
    const chat_template = [];
    if (prompt_template.variables) {
      prompt_template.context = this.renderContent(prompt_template.context, prompt_template.variables);
    }
    chat_template.push({ role: content_role, content: prompt_template.context });
    if (prompt_template.examples) {
      prompt_template.examples.forEach((example) => {
        chat_template.push({ role: assistant_role, content: example.input });
        chat_template.push({ role: assistant_role, content: example.output });
      });
    }
    chat_template.push({ role: user_role, content: prompt });
    return chat_template;
  }

  renderContent(content, additional_vars) {
    if (typeof additional_vars != "object") {
      return Sqrl.Render(content, this.getTemplateDefaults());
    } else {
      for (const [key, value] of Object.entries(this.getTemplateDefaults())) {
        additional_vars[key] = value;
      }
      return Sqrl.Render(content, additional_vars);
    }
  }

  async checkPromptExists(promptName, promptDetails) {
    const { promptLib, workspacePath } = this.workspaceService.getWorkspaceConfig();
    const normalizedPromptName = promptName.replace(/[^\w\d]/g, "_");
    const newPromptFileName = `${normalizedPromptName}.json`;
    try {
      await this.workspaceService.checkThatFileExists(path.join(workspacePath, promptLib, newPromptFileName));
      return true;
    } catch (err) {
      const promptData = await this.workspaceService.readContent(
        path.join(workspacePath, promptLib, newPromptFileName),
        true
      );
      // TODO: some merge logic should be here
      if (promptData == promptDetails) {
        true;
      } else {
        return false;
      }
    }
  }

  async removeExternalPrompts() {
    const { promptLib, workspacePath } = this.workspaceService.getWorkspaceConfig();
    var promptsMapping = await this.workspaceService.readContent(
      path.join(workspacePath, promptLib, "./prompts.json"),
      true
    );
    for (const [key, value] of Object.entries(promptsMapping)) {
      if (value.external) {
        vscode.workspace.fs.delete(vscode.Uri.file(path.join(workspacePath, promptLib, value.template)));
        delete promptsMapping[key];
      }
    }
    await this.workspaceService.writeContent(
      path.join(workspacePath, promptLib, "./prompts.json"),
      promptsMapping,
      true
    );
  }

  async clearEmbeddings() {
    const { promptLib, workspacePath } = this.workspaceService.getWorkspaceConfig();
    return await this.workspaceService.writeContent(
      path.join(workspacePath, promptLib, "./embeddings.json"),
      "{}",
      true
    );
  }

  async addPrompt(promptName, promptDescription, context, examples = [], variables = {}, overwrite = false) {
    const { promptLib, workspacePath } = this.workspaceService.getWorkspaceConfig();
    const promptDetails = { context: context, examples: examples, variables: variables };
    if (overwrite || this.checkPromptExists(promptName, promptDetails)) {
      var promptsMapping = await this.workspaceService.readContent(
        path.join(workspacePath, promptLib, "./prompts.json"),
        true
      );
      var userSettings = {};
      if (promptsMapping[promptName] != undefined && promptsMapping[promptName].userSettings) {
        userSettings = Object.assign({}, promptsMapping[promptName].userSettings);
      }
      promptsMapping[promptName] = {
        description: promptDescription,
        external: true,
        userSettings: userSettings,
        prompt_type: promptName.endsWith("_prompt") ? "PROMPT" : "DATASOURCE",
      };
      for (const [key, value] of Object.entries(context)) {
        promptsMapping[promptName][key] = value;
      }
      await this.workspaceService.writeContent(
        path.join(workspacePath, promptLib, "./prompts.json"),
        promptsMapping,
        true
      );
    } else {
      await vscode.window.showErrorMessage("Could not sync prompt, as it is already exists");
    }
  }

  async removePrompt(promptName) {
    const { promptLib, workspacePath } = this.workspaceService.getWorkspaceConfig();
    var promptsMapping = await this.workspaceService.readContent(
      path.join(workspacePath, promptLib, "./prompts.json"),
      true
    );
    delete promptsMapping[promptName];
    await this.workspaceService.writeContent(
      path.join(workspacePath, promptLib, "./prompts.json"),
      promptsMapping,
      true
    );
  }

  async addEmbedding(embeddingName, embeddingDescription, extension, top_k, cutoff) {
    const { promptLib, workspacePath } = this.workspaceService.getWorkspaceConfig();
    const embeddingDetails = {
      description: embeddingDescription,
      extension: extension,
      top_k: top_k,
      cutoff: cutoff,
    };
    var embeddings = await this.workspaceService.readContent(
      path.join(workspacePath, promptLib, "./embeddings.json"),
      true
    );
    embeddings[embeddingName] = embeddingDetails;
    await this.workspaceService.writeContent(
      path.join(workspacePath, promptLib, "./embeddings.json"),
      embeddings,
      true
    );
  }
};
