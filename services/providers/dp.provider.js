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

const LlmServiceProvider = require("./base.provider");
const vscode = require("vscode");

module.exports = class DigitalPlatform extends LlmServiceProvider {
  constructor() {
    super();
    this.configUrl = `${this.config.LLMserverURL}/config`;
    this.getPromptsUrl = this.configUrl;
    this.predictUrl = `${this.config.LLMserverURL}/generate`;
    this.authToken = this.config.LLMauthToken;
    (this.modelName = this.config.LLMmodelName), (this.authType = "Bearer");
  }

  sanitize_input(prompt) {
    prompt = prompt.replace(/(\s+)\#+|^#/g, "$1");
    return prompt;
  }

  async init() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Elitea is getting prompts ...",
        cancellable: false,
      },
      (progress) => {
        progress.report({ increment: 0 });
        this.removeExternalPrompts().then(() => {
          progress.report({ increment: 15 });
          this.syncPrompts().then(() => {
            progress.report({ increment: 100 });
          });
        });

        const p = new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 500);
        });

        return p;
      }
    );
  }

  async syncPrompts() {
    const predict_config = await this.request(this.configUrl)
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    for (var i = 0; i < predict_config.data.scopes.length; i++) {
      var scope = predict_config.data.scopes[i];
      var scopeModels = scope.models;
      var scopeId = scope.scope.id;
      var scopeName = scope.scope.name;

      for (var j = 0; j < scope.templates.length; j++) {
        var template = scope.templates[j];
        await this.addPrompt(
          `${scopeName}_${template.name}`,
          template.description,
          {
            scope_id: scopeId,
            template_id: template.id,
            models: scopeModels,
          },
          [],
          {},
          true
        );
      }
    }
  }

  async predict(template, prompt) {
    const prompt_data = {
      input_data: this.sanitize_input(prompt),
      config: {
        raw_prompt: "False",
        scope_id: template.scope_id,
        model_id: 0,
      },
    };
    try {
      const response = await this.request(this.predictUrl)
        .method("POST")
        .headers({ "Content-Type": "application/json" })
        .body(prompt_data)
        .auth(this.authType, this.authToken)
        .send();

      if (response.data.bdd_scenario) {
        return response.data.bdd_scenario.replace(/\$/g, "\\$");
      }
      return {
        content: response.data.assistant,
        type: "append",
      };
    } catch (err) {
      return JSON.stringify(err.response);
    }
  }
};
