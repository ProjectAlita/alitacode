const WorkspaceService = require("./workspace.service");
const Request = require("../http/request");
const vscode = require("vscode");
const llmServierProvider = require("./providers/index");

module.exports = class AlitaService {
  constructor() {
    this.request = (url, options) => new Request(url, options);
    this.workspaceService = new WorkspaceService();
    this.currentProvider = this.workspaceService.getWorkspaceConfig().LLMProvider
    this.serviceProvider = undefined;
    this.init_done = 0;
  }

  checkLLMConfig() {
    const newProvier = this.workspaceService.getWorkspaceConfig().LLMProvider
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
      }
    } catch (ex) {
      console.log(ex)
      this.serviceProvider = undefined;
    }
    console.log(this.serviceProvider)
  }

  async askAlita({ prompt, template, prompt_template=undefined}) {
    try {
      this.checkLLMConfig()
      return await this.serviceProvider.predict(template, prompt, prompt_template)
    } catch (ex) {
      await vscode.window.showErrorMessage(`Alita is not able to connect ${ex.stack}`);
      return "You need to configure LLM Provider first"
    }
  }

  async askOptions({ embedding, prompt, top_k, cutoff, type="append" }) {
    let result = await this.serviceProvider.similarity(embedding, prompt.trim(), top_k, cutoff )
    return {
      content: result.trim(),
      type: type
    }
  }
};
