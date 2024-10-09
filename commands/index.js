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

const addContext = require("./addContext");
const addExample = require("./addExample");
const createPrompt = require("./createPrompt");
const predict = require("./predict");
const addGoodPrediction = require("./addGoodPrediction");
const suggest = require("./suggest");
const initAlita = require("./initAlita");
const syncPrompts = require("./syncPrompts");
const syncEmbeddings = require("./syncEmbeddings");
const onConfigChange = require("./onConfigChange");
const getAvailableAIModels = require("./getAvailableAIModels");

module.exports = {
  addExample,
  addContext,
  createPrompt,
  predict,
  addGoodPrediction,
  suggest,
  initAlita,
  syncPrompts,
  syncEmbeddings,
  onConfigChange,
  getAvailableAIModels,
};
