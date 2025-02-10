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

function maskAuthorizationHeader(headers) {
  const maskedHeaders = { ...headers };

  if (maskedHeaders.Authorization) {
    const token = maskedHeaders.Authorization.split(" ")[1];
    const tokenLength = token.length;
    let maskedToken;
    if (tokenLength > 4) {
      maskedToken = "*".repeat(tokenLength - 4) + token.slice(-4);
    } else {
      maskedToken = token;
    }

    maskedHeaders.Authorization = `Bearer ${maskedToken}`;
  }

  return maskedHeaders;
}

module.exports = class OutputService {
  static activate() {
    if (this._outputChannel) return;

    this._outputChannel = vscode.window.createOutputChannel("Elitea Code");
  }

  static getChannel() {
    if (!this._outputChannel) this.activate();

    return this._outputChannel;
  }

  static logRequest(config) {
    this._outputChannel.appendLine(`\n--- Request ---`);
    this._outputChannel.appendLine(`Method: ${config.method.toUpperCase()}`);
    this._outputChannel.appendLine(`URL: ${config.url}`);
    this._outputChannel.appendLine(`Headers: ${JSON.stringify(maskAuthorizationHeader(config.headers), null, 2)}`);

    if (config.data) {
      this._outputChannel.appendLine(`Data: ${JSON.stringify(config.data, null, 2)}`);
    }
  }

  static logResponse(response) {
    this._outputChannel.appendLine(`\n--- Response ---`);
    this._outputChannel.appendLine(`Status: ${response.status}`);
    this._outputChannel.appendLine(`Status Text: ${response.statusText}`);
    this._outputChannel.appendLine(`Headers: ${JSON.stringify(response.headers, null, 2)}`);

    if (response.data) {
      this._outputChannel.appendLine(`Data: ${JSON.stringify(response.data, null, 2)}`);
    }
  }

  static logResponseError(error) {
    this._outputChannel.appendLine(`\n--- Response Error ---`);
    this._outputChannel.appendLine(`Message: ${error.message}`);
    this._outputChannel.appendLine(`Stack: ${error.stack}`);
  }

  static show() {
    if (!this._outputChannel) this.activate();

    this._outputChannel.show();
  }

  static dispose() {
    if (!this._outputChannel) return;

    this._outputChannel.dispose();
  }
};
