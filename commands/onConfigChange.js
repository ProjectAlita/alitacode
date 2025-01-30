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

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { LOCAL_PROMPTS_BLOCKERS } = require("../constants/index");
const https = require("https");

function parseJwt(token) {
  try {
    if (token && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
      const parts = token.split(".");
      const base64UrlToJson = (base64Url) => {
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64).split("").map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          }).join("")
        );
        return JSON.parse(jsonPayload);
      };

      const header = base64UrlToJson(parts[0]);
      const payload = base64UrlToJson(parts[1]);
      const signature = parts[2]; // Signature is not decoded as it is used for verification

      return {
        header,
        payload,
        signature
      };
    } else {
      vscode.window.showErrorMessage("ELITEA Code: Invalid LLMAuth JWT token");
    }
  } catch (e) {
    vscode.window.showErrorMessage("ELITEA Code: Invalid LLMAuth JWT token");
  }
}

function verifyToken(parsedToken) {
  if(parsedToken) {
    if (parsedToken.payload.expires === undefined) return;
    if (parsedToken.payload.expires === "null" || parsedToken.payload.expires === null) {
      vscode.window.showInformationMessage("ELITEA Code: LLMAuth Token is valid");
      return;
    }
    let currentDate = new Date();
    let parsedDate = new Date(parsedToken.payload.expires);
    let currentDateUTC = new Date(currentDate.getTime() + currentDate.getTimezoneOffset() * 60000);
    if (currentDateUTC.getTime() > parsedDate.getTime()) {
      const message = "ELITEA Code: LLMAuth Token expired"
      console.error(message);
      vscode.window.showErrorMessage(message);
    } else {
      const message = `ELITEA Code: LLMAuth Token valid till ${parsedDate}`
      console.log(message);
      vscode.window.showInformationMessage(message);
    }
  }
}

module.exports = async function () {
  const { workspaceService, alitaService } = require("../services");
  const { promptLib, workspacePath, LLMProvider, verifySsl, LLMauthToken } = workspaceService.getWorkspaceConfig();
  verifyToken(parseJwt(LLMauthToken));
  https.globalAgent.options.rejectUnauthorized = verifySsl;
  await vscode.commands.executeCommand("setContext", "alitacode.LLMProvider", LLMProvider);
  await vscode.commands.executeCommand(
    "setContext",
    "alitacode.LocalPrompts",
    !LOCAL_PROMPTS_BLOCKERS.includes(LLMProvider)
  );
  alitaService.serviceProvider = undefined;
  if (promptLib && fs.existsSync(path.join(workspacePath, promptLib, "./prompts.json"))) {
    await vscode.commands.executeCommand("setContext", "alita.init", true);
    return await workspaceService.updatePrompts();
  } else {
    return await vscode.commands.executeCommand("setContext", "alita.init", false);
  }
};
