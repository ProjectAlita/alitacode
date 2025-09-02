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
        this.configurationData = undefined;
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
      console.log(error)
      await Notifications.showError({ error, message: `Elitea Code ${functionName}`, showOutputButton: true });
      return "You need to configure LLM Provider first";
    }
  }

  async askAlita({ prompt, template, prompt_template = undefined }) {
    try {
      this.checkLLMConfig();
      return await this.serviceProvider.predict(template, prompt, prompt_template);
    } catch (error) {
      await Notifications.showError({ error, message: "Elitea is not able to connect", showOutputButton: true });
      return "You need to configure LLM Provider first";
    }
  }

  getSocketConfig() {
    return this.invokeMethod("getSocketConfig", "Get socket config");
  }

  getModelSettings() {
    return this.invokeMethod("getModelSettings", "Get model settings");
  }


  async getApplicationDetail(id) {
    return await this.invokeMethod("getAppllicationDetail", "Get application detail", id);
  }

  async getApplications() {
    return await this.invokeMethod("getApplications", "List applications");
  }

  async createConversation(name) {
    return await this.invokeMethod("createConversation", "Create conversation", name);
  }

  async getDeployments() {
    return await this.invokeMethod("getDeployments", "Get deployments");
  }

  async stopApplicationTask(taskId) {
    return await this.invokeMethod("stopApplicationTask", "Stop application task", taskId);
  }

  async chat(params) {
    return await this.invokeMethod("chat", "Chat", params);
  }

  async getEmbeddings() {
    return await this.invokeMethod("getEmbeddings", "Get available integrations");
  }

  async getAIModelNames() {
    this.configurationData = await this.getEmbeddings();
    const array = [];
    if (this.configurationData.shared && Array.isArray(this.configurationData.shared.items)) {
      this.configurationData.shared.items.forEach((model) => {
        if (model.data.name && model.alita_title) {
          array.push({ [model.alita_title]: model.data.name });
        }
      });
    }
    return array;
  }

  async getAIModelUid(integrationConfigName, isUsedCashedData) {
    const data = isUsedCashedData ? this.configurationData : await this.getEmbeddings();
    return data.shared.items
      .filter((configuration) => configuration.alita_title === integrationConfigName)
      .map((configuration) => configuration.uuid);
  }

  async getAIModelIntegrationName(integrationConfigName, isUsedCashedData) {
    const data = isUsedCashedData ? this.configurationData : await this.getEmbeddings();
    return data.shared.items
      .filter((configuration) => configuration.alita_title === integrationConfigName)
      .map((configuration) => configuration.data.name);
  }

  async getEmbeddings() {
    return await this.invokeMethod("getEmbeddings", "Get available integrations");
  }


  async getAIModelNames() {
    const data = await this.getEmbeddings();
    const array = [];
    if (data.shared && Array.isArray(data.shared.items)) {
      data.shared.items.forEach((model) => {
        if (model.data.name && model.alita_title) {
          array.push({ [model.alita_title]: model.data.name });
        }
      });
    }
    return array;
  }

  async getAIModelUid(integrationConfigName) {
    const data = await this.getEmbeddings();
    return data.shared.items
      .filter((configuration) => configuration.alita_title === integrationConfigName)
      .map((configuration) => configuration.uuid);
  }

  async getAIModelIntegrationName(integrationConfigName) {
    const data = await this.getEmbeddings();
    return data.shared.items
      .filter((configuration) => configuration.alita_title === integrationConfigName)
      .map((configuration) => configuration.data.name);
  }
};
