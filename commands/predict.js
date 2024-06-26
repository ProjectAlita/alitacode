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
const { alitaService, workspaceService, windowService } = require("../services");

module.exports = async function () {
  alitaService.checkLLMConfig()
  if (alitaService.init_done === 0) {
    try{
      await alitaService.serviceProvider.init()
      alitaService.init_done = 1;
    } catch (ex) {
      alitaService.init_done = 0;
      await vscode.window.showErrorMessage(
        `Alita is not able to connect to ${alitaService.serviceProvider.getPromptsUrl}`);
      return;
    }    
  }
  
  const promptsList = await workspaceService.updatePrompts();
  // renderring list
  const entities = [...promptsList].map(prompt =>
  ({
    label: prompt.label.replace(/(_prompt|_datasource)$/, ""),
    description: prompt.description,
    iconPath: new vscode.ThemeIcon(prompt.label.endsWith("_datasource")
      ? "folder-library"
      : (prompt.external ? "terminal" : "remote-explorer")),
    full_name: prompt.label
  }));
  let selection = await windowService.showQuickPick([...entities]);
  selection = [...promptsList].find(prompt => prompt.label === selection.full_name)
  if (!selection) return;

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    title: "Alita is baking your answer...",
    cancellable: false
  }, (progress) => {
    const p = new Promise(resolve => {
      progress.report({ increment: 0 });
      const { sel_start, sel_end, selText } = windowService.getSelectedText();
      vscode.window.activeTextEditor.selection = new vscode.Selection(
        sel_end,
        sel_end
      );
      progress.report({ increment: 5 });
      alitaService.askAlita({
        prompt: selText,
        template: selection,
      }).then((answer) => {
        progress.report({ increment: 90 });
        if (answer.type  == "split")  {
          const editor = vscode.window.activeTextEditor;
          const languageId = editor.document.languageId
          vscode.workspace.openTextDocument({ language: languageId }).then(doc => {
            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside, true).then(editor => {
              editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), answer.content);
              })
            })
          })
        } else if (answer.type  == "replace") {
          vscode.window.activeTextEditor.edit(editBuilder => {
            editBuilder.replace(
              new vscode.Range(sel_start, sel_end),
              answer.content
            );
          });
        } else if (answer.type  == "prepend") {
          vscode.window.activeTextEditor.insertSnippet(
            new vscode.SnippetString(`${answer.content}\n`),
            sel_start
          );
        } else {
          vscode.window.activeTextEditor.insertSnippet(
            new vscode.SnippetString(`\n${answer.content}`),
            sel_end
          );
        }
        progress.report({ increment: 5 });
        resolve()
    }).catch((ex) => {
      vscode.window.showErrorMessage(`Alita is not able to connected to ${alitaService.serviceProvider.getPromptsUrl}`);
      resolve()
    });
  });
  return p;
});
}
