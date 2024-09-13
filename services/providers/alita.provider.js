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

const apiPath = "/api/v1"
const socketPath = "/socket.io"

const removeTrailingSlash = (url) => {
    return url.replace(/\/$/, "");
};

module.exports = class AlitaServiceProvider extends CarrierServiceProvider {
    constructor() {
        super();
        const apiBasePath = removeTrailingSlash(this.config.LLMserverURL).concat(apiPath);
        this.codeTagId = -1;
        this.getCodeTagUrl = `${apiBasePath}/prompt_lib/tags/prompt_lib/${this.config.projectID}`
        this.getPromptsUrl = `${apiBasePath}/prompt_lib/prompts/prompt_lib/${this.config.projectID}`;
        this.getPromptDetailUrl = `${apiBasePath}/prompt_lib/prompt/prompt_lib/${this.config.projectID}`
        this.getDatasourcesUrl =
            `${apiBasePath}/datasources/datasources/prompt_lib/${this.config.projectID}`;
        this.getDatasourceDetailUrl =
            `${apiBasePath}/datasources/datasource/prompt_lib/${this.config.projectID}`;
        this.getApplicationsUrl =
            `${apiBasePath}/applications/applications/prompt_lib/${this.config.projectID}`;
        this.getApplicationDetailUrl =
            `${apiBasePath}/applications/application/prompt_lib/${this.config.projectID}`;
        this.updatePromptsUrl = `${apiBasePath}/prompt_lib/version/prompt_lib/${this.config.projectID}`;
        this.predictUrl = `${apiBasePath}/prompt_lib/predict/prompt_lib/${this.config.projectID}`;
        this.getEmbeddingsUrl =
            `${apiBasePath}/integrations/integrations/default/${this.config.projectID}`;
        this.sumilarityUrl = `${apiBasePath}/datasources/deduplicate/prompt_lib/${this.config.projectID}`;
        this.chatWithDatasourceUrl =
            `${apiBasePath}/datasources/predict/prompt_lib/${this.config.projectID}`;
        this.stopApplicationTaskUrl =
            `${apiBasePath}/applications/task/prompt_lib/${this.config.projectID}`;
        this.stopDatasourceTaskUrl =
            `${apiBasePath}/datasources/task/prompt_lib/${this.config.projectID}`;
        this.getDeploymentsUrl =
            `${apiBasePath}/integrations/integrations/default/${this.config.projectID}?section=ai`;
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
            token: this.authToken
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
        }
    }

    async predict(template, prompt, prompt_template = undefined) {
        const config = this.workspaceService.getWorkspaceConfig();
        var prompt_data = {}
        var display_type = "append"
        var response = {}
        if (template.external) {
            prompt_data = template.label.endsWith("_datasource") ? { input: prompt } : {
                model_settings: this.getModelSettings(),
                user_input: prompt,
                chat_history: template.chat_history
            };
            if (template.userSettings) {
                display_type = template.userSettings.display_type ? template.userSettings.display_type : "append"

                if (template.userSettings.temperature) {
                    prompt_data.temperature = template.userSettings.temperature
                }
                if (template.userSettings.maxTokens) {
                    prompt_data.max_tokens = template.userSettings.maxTokens
                    prompt_data.max_decode_steps = template.userSettings.maxTokens
                }
                if (template.userSettings.topP) {
                    prompt_data.top_p = template.userSettings.topP
                }
                if (template.userSettings.topK) {
                    prompt_data.top_k = template.userSettings.topK
                }
                if (template.userSettings.modelName) {
                    prompt_data.model_name = template.userSettings.modelName
                }
            }

            // datasource by default
            let base_url = this.chatWithDatasourceUrl;
            let prompt_id = template.prompt_id;
            if (!template.label.endsWith("_datasource")) {
                // prompt predict
                base_url = this.predictUrl;
                let version_details_response = await this.getPromptDetail(prompt_id, template.version.name);
                let external_variables = version_details_response.version_details.variables.reduce((acc, item) => {
                    acc[item.name] = item.value;
                    return acc;
                }, {});
                if (external_variables) {
                    let configured_variables = await this.handleVars(external_variables);
                    prompt_data.variables = Object.entries((configured_variables) ? configured_variables : [])
                        .map(([key, value]) => ({ name: key, value: value }));
                }        
                prompt_id = template.version.id;
            }

            // datasouce predict
            response = await this.request(base_url + "/" + prompt_id)
                .method("POST")
                .headers({ "Content-Type": "application/json", })
                .body(prompt_data)
                .auth(this.authType, this.authToken)
                .send();
        } else {
            if (!prompt_template) {
                prompt_template = await this.getPromptTemplate(config, template.template);
            }
            prompt_data = {
                project_id: config.projectID,
                model_settings: {
                    model: {
                        model_name: prompt_template.model_name ? prompt_template.model_name : config.LLMmodelName,
                        integration_uid:
                            prompt_template.integration_id ? prompt_template.integration_id : config.integrationID,
                    },
                    temperature: prompt_template.temperature ? prompt_template.temperature : config.temperature,
                    max_tokens: prompt_template.maxTokens ? prompt_template.maxTokens : config.maxTokens,
                    top_p: prompt_template.topP ? prompt_template.topP : config.topP,
                    top_k: prompt_template.topK ? prompt_template.topK : config.topK,
                    stream: true,
                },
                context: prompt_template.context,
                user_input: prompt,
                variables: (Object.entries(prompt_template.variables ? prompt_template.variables 
                    : this.getTemplateDefaults())
                    .map(([key, value]) => ({ name: key, value: value }))),
                chat_history: prompt_template.chat_history
            };
            response = await this.request(this.predictUrl)
                .method("POST")
                .headers({ "Content-Type": "application/json", })
                .body(prompt_data)
                .auth(this.authType, this.authToken)
                .send();
        }
        display_type = (prompt_template && prompt_template.display_type) ?
            prompt_template.display_type :
            this.workspaceService.getWorkspaceConfig().DefaultViewMode;
        // escape $ sign as later it try to read it as template variable
        const resp_data = response.data.response ? response.data.response.replace(/\$/g, "\\$") : response.data.messages.map((message) => message.content.replace(/\$/g, "\\$")).join("\n")
        return {
            "content": resp_data,
            "type": display_type
        };
    }

    async syncPrompts() {
        const prompts = [];
        let promptData = [];
        let datasourceData = [];
        promptData = (await this.getPrompts({})).map(prompt => ( {...prompt, name: prompt.name + "_prompt" }));
        datasourceData = (await this.getDatasources({})).map(ds => ( {...ds, name: ds.name + "_datasource" }));
        prompts.push(...promptData);
        prompts.push(...datasourceData);


        const _addedPrompts = []
        for (var i = 0; i < prompts.length; i++) {
            var prompt = prompts[i]
            var tags = prompt.tags.map((tag) => tag.name.toLowerCase())
            if (tags.includes("code")) {
                _addedPrompts.push(prompt.name)
                await this.addPrompt(
                    prompt.name,
                    prompt.description ? prompt.description : "",
                    { "prompt_id": prompt.id, "integration_uid": prompt.integration_uid }, [], {}, true
                )
            }
        }
        const workspaceConfig = this.workspaceService.getWorkspaceConfig();
        var promptsMapping = await this.workspaceService.readContent(
            path.join(workspaceConfig.workspacePath, workspaceConfig.promptLib, "./prompts.json"),
            true
        );
        for (const [key, value] of Object.entries(promptsMapping)) {
            if (!_addedPrompts.includes(key) && value.external) {
                await this.removePrompt(key)
            }
        }
    }

    async getPromptDetail(promptId, version_name) {
        const response = await this.request(this.getPromptDetailUrl + "/" + promptId + 
            (version_name ? "/" + version_name : ""))
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.data;
    }

    async getCodeTagId() {
        if (this.codeTagId > 0) return

        const tagsResponse = await this.request(this.getCodeTagUrl, {
            params: { 
                query: "code", 
                offset: 0, 
                limit: 1000
            }})
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        this.codeTagId = (tagsResponse.data.rows.find((tag) => tag.name === "code") || {}).id
    }

    async checkIfHasCodeTag() {
        await this.getCodeTagId();
        return this.codeTagId && this.codeTagId !== -1;
    }

    async getPrompts() {
        const response = await this.request(this.getPromptsUrl, {
            params: {
                offset: 0
            }
        })
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.data.rows.filter(row => row.tags.some(tag => tag.name === "code")) || [];
    }

    async getDatasourceDetail(id) {
        const response = await this.request(this.getDatasourceDetailUrl + "/" + id)
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.data;
    }

    async getDatasources() {
        const response = await this.request(this.getDatasourcesUrl, {
            params: {
                // remove after BE alignment
                limit: 1000,
                offset: 0
            }
        })
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.data.rows.filter(row => row.tags.some(tag => tag.name === "code")) || [];
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
        const hasCodeTag = await this.checkIfHasCodeTag();
        if (hasCodeTag) {
            const response = await this.request(this.getApplicationsUrl, {
                params: {
                    tags: this.codeTagId
                }
            })
                .method("GET")
                .headers({ "Content-Type": "application/json" })
                .auth(this.authType, this.authToken)
                .send();
            return response.data.rows || [];
        }
        return []
    }

    async chat({
        prompt_id,
        datasource_id,
        user_input,
        chat_history
    }) {
        let url
        let body

        if (prompt_id) {
            url = this.predictUrl + "/" + prompt_id
            body = {
                user_input,
                chat_history
            }
        } else if (datasource_id) {
            url = this.chatWithDatasourceUrl + "/" + datasource_id
            body = {
                input: user_input,
                chat_history,
            }
        } else {
            url = this.predictUrl
            body = {
                user_input,
                chat_history,
                model_settings: this.getModelSettings()
            }
        }

        const response = await this.request(url)
            .method("POST")
            .headers({ "Content-Type": "application/json" })
            .body(body)
            .auth(this.authType, this.authToken)
            .send();
        return datasource_id ? {
            ...response.data,
            content: response.data.response,
        } : (response.data.messages && response.data.messages[0]);
    }

    async stopApplicationTask(taskId) {
        const response = await this.request(this.stopApplicationTaskUrl + "/" + taskId)
            .method("DELETE")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.status;
    }

    async stopDatasourceTask(taskId) {
        const response = await this.request(this.stopDatasourceTaskUrl + "/" + taskId)
            .method("DELETE")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.status;
    }

    async getDeployments() {
        const response = await this.request(this.getDeploymentsUrl)
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.data;
    }

    async getEmbeddings() {
        const response = await this.request(this.getEmbeddingsUrl)
            .method("GET")
            .headers({ "Content-Type": "application/json" })
            .auth(this.authType, this.authToken)
            .send();
        return response.data;
    }
}
