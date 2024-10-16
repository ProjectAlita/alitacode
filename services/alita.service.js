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

const Notifications = require("../utils/notifications");
const WorkspaceService = require("./workspace.service");
const Request = require("../http/request");
const llmServierProvider = require("./providers/index");

module.exports = class AlitaService {
  constructor() {
    this.request = (url, options) => new Request(url, options);
    this.workspaceService = new WorkspaceService();
    this.currentProvider = this.workspaceService.getWorkspaceConfig().LLMProvider;
    this.serviceProvider = undefined;
    this.init_done = 0;
  }

  checkLLMConfig() {
    const newProvier = this.workspaceService.getWorkspaceConfig().LLMProvider;
    try {
      if (newProvier !== this.currentProvider && newProvier !== undefined) {
        this.serviceProvider = new llmServierProvider[newProvier]();
        this.currentProvider = newProvier;
        this.init_done = 0;
      } else if (newProvier === undefined) {
        this.currentProvider = undefined;
        this.serviceProvider = undefined;
      } else if (this.serviceProvider === undefined) {
        this.serviceProvider = new llmServierProvider[newProvier]();
        this.currentProvider = newProvier;
        this.init_done = 0;
        this.integrationData = undefined;
      }
    } catch (ex) {
      console.log(ex);
      this.serviceProvider = undefined;
    }
    console.log(this.serviceProvider);
  }

  async invokeMethod(functionName, fnDesc, params) {
    try {
      this.checkLLMConfig();
      if (this.serviceProvider[functionName]) {
        const result = await this.serviceProvider[functionName](params);
        return result;
      } else {
        return `${fnDesc} not supported by this LLM Provider`;
      }
    } catch (error) {
      await Notifications.showError({ error, message: `Alita Code ${functionName}`, showOutputButton: true });
      return "You need to configure LLM Provider first";
    }
  }

  async askAlita({ prompt, template, prompt_template = undefined }) {
    try {
      this.checkLLMConfig();
      return await this.serviceProvider.predict(template, prompt, prompt_template);
    } catch (error) {
      await Notifications.showError({ error, message: "Alita is not able to connect", showOutputButton: true });
      return "You need to configure LLM Provider first";
    }
  }

  getSocketConfig() {
    return this.invokeMethod("getSocketConfig", "Get socket config");
  }

  getModelSettings() {
    return this.invokeMethod("getModelSettings", "Get model settings");
  }

  async getPrompts({ page = 0, query }) {
    return await this.invokeMethod("getPrompts", "List prompts", { page, query });
  }

  async getPromptDetail(promptId) {
    return await this.invokeMethod("getPromptDetail", "Get prompt detail", promptId);
  }

  async getDatasourceDetail(id) {
    return await this.invokeMethod("getDatasourceDetail", "Get prompt detail", id);
  }

  async getDatasources() {
    return await this.invokeMethod("getDatasources", "List datasources");
  }

  async getApplicationDetail(id) {
    return await this.invokeMethod("getAppllicationDetail", "Get application detail", id);
  }

  async getApplications() {
    return await this.invokeMethod("getApplications", "List applications");
  }

  async getDeployments() {
    return await this.invokeMethod("getDeployments", "Get deployments");
  }

  async stopApplicationTask(taskId) {
    return await this.invokeMethod("stopApplicationTask", "Stop application task", taskId);
  }

  async stopDatasourceTask(taskId) {
    return await this.invokeMethod("stopDatasourceTask", "Stop datasource task", taskId);
  }

  async chat(params) {
    return await this.invokeMethod("chat", "Chat", params);
  }

  async getEmbeddings() {
    return await this.invokeMethod("getEmbeddings", "Get available integrations")
  }

  async getAIModelNames() {
    this.integrationData = await this.getEmbeddings();
    const array = [];
    this.integrationData.forEach(entry => {
      if (entry.settings && Array.isArray(entry.settings.models)) {
        entry.settings.models.forEach(model => {
          if (model.name && entry.name) {
            array.push({ [entry.config.name]: model.name });
          }
        });
      }
    });
    return array;
  }

  async getAIModelUid(integrationConfigName, isUsedCashedData) {
    const data = isUsedCashedData ? this.integrationData : await this.getEmbeddings();
    return data
      .filter(integration => integration.config.name === integrationConfigName)
      .map(integration => integration.uid);
  }

  async getAIModelIntegrationName(integrationConfigName, isUsedCashedData) {
    const data = isUsedCashedData ? this.integrationData : await this.getEmbeddings();
    return data
      .filter(integration => integration.config.name === integrationConfigName)
      .map(integration => integration.name);
  }
};
