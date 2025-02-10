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
const path = require("path");
const LlmServiceProvider = require("./base.provider");

module.exports = class CarrierServiceProvider extends LlmServiceProvider {
  constructor() {
    super();
    this.getPromptsUrl = `${this.config.LLMserverURL}/prompts/prompts/default/${this.config.projectID}`;
    this.updatePromptsUrl = `${this.config.LLMserverURL}/prompts/prompts`;
    this.predictUrl = `${this.config.LLMserverURL}/prompts/predict/default/${this.config.projectID}`;
    this.getEmbeddingsUrl = `${this.config.LLMserverURL}/embeddings/embedding/default/${this.config.projectID}`;
    this.sumilarityUrl = `${this.config.LLMserverURL}/embeddings/similarity/default/${this.config.projectID}`;
    this.authToken = this.config.LLMauthToken;
    this.authType = "Bearer";
  }

  async init() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Elitea is getting prompts ...",
        cancellable: false,
      },
      (progress) => {
        const p = new Promise((resolve) => {
          progress.report({ increment: 0 });
          this.syncPrompts()
            .then(() => {
              progress.report({ increment: 70 });
            })
            .catch((ex) => {
              resolve();
            });
          resolve();
        });
        return p;
      }
    );
  }

  async getEmbeddings() {
    try {
      const response = await this.request(this.getEmbeddingsUrl)
        .method("GET")
        .headers({ "Content-Type": "application/json" })
        .auth(this.authType, this.authToken)
        .send();
      return response.data;
    } catch (ex) {
      console.log(ex);
      return "Error";
    }
  }

  async syncPrompts() {
    const prompts = await this.getPrompts();
    const _addedPrompts = [];
    for (var i = 0; i < prompts.length; i++) {
      var prompt = prompts[i];
      var tags = prompt.tags.map((tag) => tag.tag.toLowerCase());
      if (tags.includes("code")) {
        _addedPrompts.push(prompt.name);
        await this.addPrompt(
          prompt.name,
          prompt.description ? prompt.description : "",
          { prompt_id: prompt.id, integration_uid: prompt.integration_uid },
          [],
          {},
          true
        );
      }
    }
    const workspaceConfig = this.workspaceService.getWorkspaceConfig();
    var promptsMapping = await this.workspaceService.readContent(
      path.join(workspaceConfig.workspacePath, workspaceConfig.promptLib, "./prompts.json"),
      true
    );
    for (const [key, value] of Object.entries(promptsMapping)) {
      if (!_addedPrompts.includes(key) && value.external) {
        await this.removePrompt(key);
      }
    }
  }

  async syncEmbeddings() {
    const embeddings = await this.getEmbeddings();
    for (const embedding of embeddings) {
      await this.addEmbedding(
        embedding.library_name,
        embedding.description ? embedding.description : "",
        embedding.source_extension,
        5, // top_k
        0.0 // cutoff
      );
    }
  }

  async predict(template, prompt, prompt_template = undefined) {
    const config = this.workspaceService.getWorkspaceConfig();
    var prompt_data = {};
    var display_type = "append";
    if (template.external) {
      prompt_data = {
        project_id: config.projectID,
        prompt_id: template.prompt_id,
        integration_uid: template.integration_uid || config.integrationID,
        input: prompt,
      };
      if (template.userSettings) {
        display_type = template.userSettings.display_type ? template.userSettings.display_type : "append";

        if (template.userSettings.temperature) {
          prompt_data.temperature = template.userSettings.temperature;
        }
        if (template.userSettings.maxTokens) {
          prompt_data.max_tokens = template.userSettings.maxTokens;
          prompt_data.max_decode_steps = template.userSettings.maxTokens;
        }
        if (template.userSettings.topP) {
          prompt_data.top_p = template.userSettings.topP;
        }
        if (template.userSettings.topK) {
          prompt_data.top_k = template.userSettings.topK;
        }
        if (template.userSettings.modelName) {
          prompt_data.model_name = template.userSettings.modelName;
        }
      }
    } else {
      if (!prompt_template) {
        prompt_template = await this.getPromptTemplate(config, template.template);
      }
      prompt_data = {
        integration_id: prompt_template.integration_id ? prompt_template.integration_id : config.integrationID,
        project_id: config.projectID,
        integration_settings: {
          model_name: prompt_template.model_name ? prompt_template.model_name : config.LLMmodelName,
          temperature: prompt_template.temperature ? prompt_template.temperature : config.temperature,
          max_tokens: prompt_template.maxTokens ? prompt_template.maxTokens : config.maxTokens,
          max_decode_steps: prompt_template.maxTokens ? prompt_template.maxTokens : config.maxTokens,
          top_p: prompt_template.topP ? prompt_template.topP : config.topP,
          top_k: prompt_template.topK ? prompt_template.topK : config.topK,
        },
        context: prompt_template.context,
        input: prompt,
        variables: Object.assign({}, this.getTemplateDefaults()),
      };
      if (prompt_template.examples) {
        prompt_data.examples = prompt_template.examples;
      }
      if (prompt_template.chat_history) {
        prompt_data.chat_history = prompt_template.chat_history;
      }
    }
    display_type =
      prompt_template && prompt_template.display_type
        ? prompt_template.display_type
        : this.workspaceService.getWorkspaceConfig().DisplayType;
    const response = await this.request(this.predictUrl)
      .method("POST")
      .headers({ "Content-Type": "application/json" })
      .body(prompt_data)
      .auth(this.authType, this.authToken)
      .send();
    // escape $ sign as later it try to read it as template variable
    const resp_data = response.data.messages.map((message) => message.content.replace(/\$/g, "\\$")).join("\n");
    return {
      content: resp_data,
      type: display_type,
    };
  }

  async getPrompts() {
    const response = await this.request(this.getPromptsUrl)
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    return response.data;
  }

  async similarity(embedding, input, top_k, cutoff) {
    try {
      input = JSON.parse(input);
    } catch (ex) {
      input = input.split("\n");
    }

    const request_data = {
      search: input,
      cutoff: cutoff,
      top_k: top_k,
      library_name: embedding,
      as_file: false,
    };
    try {
      const response = await this.request(this.sumilarityUrl)
        .method("POST")
        .headers({ "Content-Type": "application/json" })
        .body(request_data)
        .auth(this.authType, this.authToken)
        .send();
      try {
        let resp = "";
        for (const similarity of response.data.similarities) {
          resp += `$LINE_COMMENT ${similarity.input}\n`;
          resp += similarity.output.map((output) => output.similar).join("\n");
          resp += "\n";
        }
        return resp;
      } catch (ex) {
        return response.data;
      }
    } catch (ex) {
      return ex;
    }
  }
};
