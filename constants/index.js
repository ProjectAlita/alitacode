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

module.exports = {
  ERROR: {
    ADD_EXAMPLE: {
      NO_INPUT_OR_OUTPUT: `Content should have input: and output: in selected text`,
    },
    COMMON: {
      READ_FILE: (filePath, error) =>
        `Couldn't read file in next path: ${filePath}.\nError: ${JSON.stringify(
          error,
          null,
          2
        )}`,
      WRITE_FILE: (filePath, error) =>
        `Couldn't write content in next path: ${filePath}\nError: ${JSON.stringify(
          error,
          null,
          2
        )}`,
      SHOULD_HAVE_PROMPT: `Selected prompt doesn't have template, please specify template!`,
      SHOULD_HAVE_ITEMS: "Should have items",
      SHOULD_HAVE_BASE_PATH: "Should have basePath",
      SHOULD_HAVE_AT_LEAST: (len = 1) => `Should have at least ${len} symbols`,
      FILE_NOT_EXISTS: (path, error) =>
        `File in next path ${path} doesn't exists.\nError: ${JSON.stringify(
          error,
          null,
          2
        )}\n`,
    },
  },
  WORKSPACE: {
    EXTENSION: {
      NAME: "alitacode",
      PARAM: {
        ENABLE: "enable",
        PROMPT_LIB: "promptLib",
        LLM_SERVER_URL: "LLMServerUrl",
        LLM_TOKEN: "LLMAuthToken",
        LLM_PROVIDER_TYPE: "serviceProviderForLLM",
        LLM_MODEL_NAME: "LLMModelName",
        LLM_API_VERSION: "apiVersion",
        TOP_P: "topP",
        TOP_K: "topK",
        MAX_TOKENS: "maxTokens",
        TEMPERATURE: "temperature",
        PROJECTID: "projectId",
        INTEGRATIONID: "integrationUid",
        DEFAULT_TOKENS: "customModelSize",
        DISPLAY_TYPE: "displayType",
        VERIFY_SSL: "verifySsl"
      },
    },
  },
  COMMAND: {
    INIT_ALITA: "alitacode.initAlita",
    SYNC_PROMPTS: "alitacode.syncPrompts",
    ADD_EXAMPLE: "alitacode.addExample",
    ADD_CONTEXT: "alitacode.addContext",
    CREATE_PROMPT: "alitacode.createPrompt",
    PREDICT: "alitacode.predict",
    OPEN_SETTINGS: "workbench.action.openSettings",
    ADD_GOOD_PREDICTION: "alitacode.addGoodPrediction",
    GET_AVAILABLE_AI_MODELS: "alitacode.getAvailableAIModels",
  },
  TEXT: {
    ALITA_ACTIVATED: "Alita was activated! Please specify configuration",
    ENTER_PROMPT_NAME: "Enter prompt name",
    ENTER_PROMPT_DESCRIPTION: "Enter prompt description",
    ENTER_PROMPT_CONTEXT: "Enter context",
  },
  BUTTON: {
    SETTINGS: "Settings",
  },
  MESSAGE: {
    CONTEXT_WAS_ADDED: (label) => `Context was added to ${label} prompt!`,
  },
  EXTERNAL_PROMPTS_PROVIDERS: ["Alita", "DigitalPlatform"],
  LOCAL_PROMPTS_BLOCKERS: ["DigitalPlatform"],
};
