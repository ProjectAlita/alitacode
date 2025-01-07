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
const fs = require("fs/promises");
const p = require("path");
const { alitaService, workspaceService, windowService } = require("../services");

const OUTPUT_DIR = ".output";
/**
 * @param {import('vscode').Uri} uri - The URI object representing a resource in VS Code
 * @returns {Promise<void>} A promise that resolves when the operation is complete
 **/
module.exports = async function (uri) {
  if (!uri) {
    return;
  }

  try {
    await ensureAlitaInitialized();
  } catch (err) {
    await vscode.window.showErrorMessage(err.message);
    return;
  }

  const { path } = uri;
  const pathStat = await fs.stat(path);
  const basePath = pathStat.isFile() ? p.dirname(path) : path;
  const outputPath = pathStat.isFile()
    ? p.join(p.dirname(path), OUTPUT_DIR)
    : p.join(p.dirname(path), OUTPUT_DIR, p.basename(path));
  // generate file tree relative to path passed
  const nodes = await traverseFileTree(path, basePath, outputPath);

  // grab user input on predict
  const template = await askUserForPrediction();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: "Alita prediction...",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0 });

      // iterate over nodes, ask predict for each one and then write to fs
      // seq for now, can be used with Promise.all further to improve performance
      for (const node of nodes) {
        const answer = await alitaService.askAlita({
          prompt: node.content,
          template,
        });
        progress.report({ increment: 100 / nodes.length });
        console.log(answer);
      }
    }
  );
};

/**
 * @param {string} path
 * @returns {Promise<{ path: string; outputPath: string; content: string }[]>}
 **/
async function traverseFileTree(path, basePath, baseOutputPath, acc = []) {
  const stat = await fs.stat(path);
  if (stat.isFile()) {
    const content = await fs.readFile(path);
    const outputPath = path.replace(basePath, baseOutputPath);
    return [...acc, { path, content, outputPath }];
  } else {
    const contents = await fs.readdir(path);
    const fullPaths = contents.map((item) => p.join(path, item));
    const traversed = await Promise.all(fullPaths.map((it) => traverseFileTree(it, basePath, baseOutputPath, acc)));
    return [...acc, ...traversed.flat()];
  }
}

async function ensureAlitaInitialized() {
  alitaService.checkLLMConfig();
  if (alitaService.init_done !== 0) {
    return;
  }
  try {
    await alitaService.serviceProvider.init();
    alitaService.init_done = 1;
  } catch (err) {
    alitaService.init_done = 0;
    throw new Error(`Alita is not able to connect to ${alitaService.serviceProvider.getPromptsUrl}`);
  }
}

/**
 * @param {import('vscode').Uri} uri - The URI object representing a resource in VS Code
 * @returns {Promise<void>} A promise that resolves when the operation is complete
 **/
async function askUserForPrediction() {
  const promptsList = await workspaceService.updatePrompts();
  // renderring list
  const entities = [...promptsList]
    .filter((it) => !it.external)
    .map((prompt) => ({
      label: prompt.label.replace(/(_prompt|_datasource)$/, ""),
      description: prompt.description,
      iconPath: new vscode.ThemeIcon(
        prompt.label.endsWith("_datasource") ? "database" : prompt.external ? "terminal" : "remote-explorer"
      ),
      full_name: prompt.label,
    }));

  let selection = await windowService.showQuickPick([...entities]);
  selection = [...promptsList].find((prompt) => prompt.label === selection.full_name);

  if (!selection) return;

  // select required version
  if (!selection.label.endsWith("_datasource") && selection.external) {
    var prompt_details_response = await alitaService.getPromptDetail(selection.prompt_id);

    // if prompt has 2+ versions - show them
    selection.version =
      prompt_details_response.versions.length === 1
        ? prompt_details_response.versions[0]
        : await handleVersions(prompt_details_response.versions);
  }

  return selection;
}

async function handleVersions(versions) {
  let available_versions = versions.map((prompt_version) => ({
    label: prompt_version.name,
    description: "id: " + prompt_version.id,
  }));
  let selection = await windowService.showQuickPick([...available_versions]);
  return versions.find((prompt_version) => prompt_version.name === selection.label);
}
