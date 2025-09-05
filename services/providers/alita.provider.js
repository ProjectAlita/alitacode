// Copyright 2024 EPAM Systems
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

const CarrierServiceProvider = require("./carrier.provider");
const path = require("path");
const { URL } = require("url");

const apiPath = "/api/v1";
const socketPath = "/socket.io";

const removeTrailingSlash = (url) => {
  return url.replace(/\/$/, "");
};

module.exports = class AlitaServiceProvider extends CarrierServiceProvider {
  constructor() {
    super();
    const apiBasePath = removeTrailingSlash(this.config.LLMserverURL).concat(apiPath);
    this.codeTagId = -1;
    this.getCodeTagUrl = `${apiBasePath}/prompt_lib/tags/prompt_lib/${this.config.projectID}`;
    this.getApplicationsUrl = `${apiBasePath}/applications/applications/prompt_lib/${this.config.projectID}?agents_type=classic`;
    this.getApplicationDetailUrl = `${apiBasePath}/applications/application/prompt_lib/${this.config.projectID}`;
    this.predictUrl = `${apiBasePath}/applications/predict_llm/prompt_lib/${this.config.projectID}`;
    this.applicationPredictUrl = `${apiBasePath}/applications/predict/prompt_lib/${this.config.projectID}`;
    this.getConfigurationsUrl = `${apiBasePath}/configurations/configurations/${this.config.projectID}?include_shared=true&section=llm`;
    this.sumilarityUrl = `${apiBasePath}/datasources/deduplicate/prompt_lib/${this.config.projectID}`;
    this.getConversationUrl = `${apiBasePath}/chat/conversations/prompt_lib/${this.config.projectID}`;
    this.stopApplicationTaskUrl = `${apiBasePath}/applications/task/prompt_lib/${this.config.projectID}`;
    this.getDeploymentsUrl = `${apiBasePath}/integrations/integrations/default/${this.config.projectID}?section=ai`;
  }

  getSocketConfig() {
    const config = this.workspaceService.getWorkspaceConfig();
    const socketUrl = config.LLMserverURL;
    const socketPrefix = socketUrl.indexOf("https") === 0 ? "wss://" : "ws://";
    const urlObject = new URL(socketUrl);
    return {
      projectId: config.projectID,
      host: socketPrefix + removeTrailingSlash(urlObject.host),
      path: removeTrailingSlash(urlObject.pathname).concat(socketPath),
      token: this.authToken,
    };
  }

  getModelSettings() {
    const config = this.workspaceService.getWorkspaceConfig();
    return {
      model: {
        model_name: config.LLMmodelName,
        integration_uid: config.integrationID,
      },
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      top_k: config.topK,
      stream: true,
    };
  }

  async predict(template, prompt, prompt_template = undefined) {
    const config = this.workspaceService.getWorkspaceConfig();
    var prompt_data = {};
    var display_type = "append";
    var response = {};
    var resp_data = {}
    if (!template) {
      prompt_data = {
        llm_settings: {
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          top_p: config.topP,
          top_k: config.topK,
          model_name: config.LLMmodelName
        },
        user_input: prompt,
        chat_history: []
      }
      response = await this.request(this.predictUrl)
        .method("POST")
        .headers({ "Content-Type": "application/json" })
        .body(prompt_data)
        .auth(this.authType, this.authToken)
        .send();
      resp_data = response.data.result.chat_history.filter((chat) => chat.role == "assistant")[0].content
    } else {

      let version_details_response = await this.getAppllicationDetail(template.id);
      let external_variables = version_details_response.version_details.variables.reduce((acc, item) => {
        acc[item.name] = item.value;
        return acc;
      }, {});
      let configured_variables
      if (external_variables) {
        configured_variables = await this.handleVars(external_variables);
      }
      prompt_data = {
        project_id: config.projectID,
        model_settings: {
          model: {
            model_name: config.LLMmodelName,
            integration_uid: config.integrationID,
          },
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          top_p: config.topP,
          top_k: config.topK,
          stream: true,
        },
        user_input: prompt,
        variables: Object.entries(configured_variables ? configured_variables : []).map(
          ([key, value]) => ({ name: key, value: value })
        ),
        chat_history: [],
      };
      response = await this.request(this.applicationPredictUrl.concat(`/${template.version.id}`))
        .method("POST")
        .headers({ "Content-Type": "application/json" })
        .body(prompt_data)
        .auth(this.authType, this.authToken)
        .send();
      resp_data = response.data.chat_history.filter((chat) => chat.role == "assistant")[0].content
    }
    display_type = this.workspaceService.getWorkspaceConfig().DisplayType;
    // escape $ sign as later it try to read it as template variable

    return {
      content: resp_data,
      type: display_type,
    };
  }

  async getCodeTagId() {
    if (this.codeTagId > 0) return;

    const tagsResponse = await this.request(this.getCodeTagUrl, {
      params: {
        query: "code",
        offset: 0,
        limit: 1000,
      },
    })
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    this.codeTagId = (tagsResponse.data.rows.find((tag) => tag.name === "code") || {}).id;
  }

  async checkIfHasCodeTag() {
    await this.getCodeTagId();
    return this.codeTagId && this.codeTagId !== -1;
  }

  async getAppllicationDetail(id) {
    const response = await this.request(this.getApplicationDetailUrl + "/" + id)
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    return response.data;
  }

  async getApplications() {
    const response = await this.request(this.getApplicationsUrl, {
      params: {
        offset: 0,
        limit: 1000,
      },
    })
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    return response.data.rows.filter((row) => row.tags.some((tag) => tag.name === "code")) || [];
  }

  async chat({ prompt_id, datasource_id, user_input, chat_history }) {
    const url = this.predictUrl;
    const config = this.workspaceService.getWorkspaceConfig();
    const body = {
      llm_settings: {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        top_k: config.topK,
        model_name: config.LLMmodelName
      },
      user_input,
      chat_history
    }

    const response = await this.request(url)
      .method("POST")
      .headers({ "Content-Type": "application/json" })
      .body(body)
      .auth(this.authType, this.authToken)
      .send();
    return response.data.chat_history
      && response.data.chat_history.filter((chat) => chat.role == "assistant")[0].content
  }

  async stopApplicationTask(taskId) {
    const response = await this.request(this.stopApplicationTaskUrl + "/" + taskId)
      .method("DELETE")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    return response.status;
  }

  async createConversation(conversationName) {
    const response = await this.request(this.getConversationUrl)
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();

    const existingConversation = response.data.rows.find((conv) => conv.name === conversationName);
    if (existingConversation) {
      await this.request(this.getConversationUrl + "/" + existingConversation.id)
        .method("DELETE")
        .headers({ "Content-Type": "application/json" })
        .auth(this.authType, this.authToken)
        .send();
    }
    const body = {
      name: conversationName,
      is_private: true,
      participants: []
    }

    const createdConversationResponse = await this.request(this.getConversationUrl)
      .method("POST")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .body(body)
      .send();
    return createdConversationResponse.data;

  }

  async stopDatasourceTask(taskId) {
    const response = await this.request(this.stopDatasourceTaskUrl + "/" + taskId)
      .method("DELETE")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    return response.status;
  }

  async getEmbeddings() {
    const response = await this.request(this.getConfigurationsUrl)
      .method("GET")
      .headers({ "Content-Type": "application/json" })
      .auth(this.authType, this.authToken)
      .send();
    return response.data;
  }
};
