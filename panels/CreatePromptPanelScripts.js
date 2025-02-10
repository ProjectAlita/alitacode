const vscode = acquireVsCodeApi();
const basicElementsArray = ["promptName", "promptDescription", "context"];
const integrationElementsArray = Object.create({});
(integrationElementsArray["temperature"] = 0.8),
  (integrationElementsArray["LLMModelName"] = "gpt-4"),
  (integrationElementsArray["maxTokens"] = 1024),
  (integrationElementsArray["topP"] = 40),
  (integrationElementsArray["topK"] = 0.8);

function useProjectIntegrationFields(state) {
  const elements = Object.keys(integrationElementsArray);
  if (!state.checked) {
    elements.forEach((element) => {
      document.getElementsByName(element)[0].removeAttribute("disabled");
      document.getElementsByName(element)[0].value = integrationElementsArray[element];
    });
  } else {
    elements.forEach((element) => {
      document.getElementsByName(element)[0].setAttribute("disabled", "true");
      document.getElementsByName(element)[0].value = "";
    });
  }
}

function addVariable() {
  const dataGrid = document.getElementById("variables");
  const varName = document.getElementById("varName").value;
  const varVal = document.getElementById("varVal").value;

  if (varName !== "" && varVal !== "") {
    const existingRows = document.querySelectorAll("vscode-data-grid-row");
    const row = document.createElement("vscode-data-grid-row");
    const rowId = `delete-${existingRows && existingRows.length}`;
    row.setAttribute("id", rowId);
    row.setAttribute("row-type", "data");

    row.innerHTML = `
      <vscode-data-grid-cell grid-column="1">
        ${varName}
      </vscode-data-grid-cell>
      <vscode-data-grid-cell grid-column="2">
        ${varVal}
      </vscode-data-grid-cell>
      <vscode-data-grid-cell grid-column="3">
        <vscode-button
        appearance="secondary"
        name="delete-var"
        onclick="(() => {document.getElementById('${rowId}').remove()})()"
        >Delete</vscode-button>
      </vscode-data-grid-cell>`;
    dataGrid.append(row);
  }
}

function cleanUp() {
  basicElementsArray.forEach((element) => {
    document.getElementsByName(element)[0].value = "";
  });
  Object.keys(integrationElementsArray).forEach((element) => {
    document.getElementsByName(element)[0].value = "";
  });
  document.getElementById("variables").rowsData = [];
  document.getElementById("varName").value = "";
  document.getElementById("varVal").value = "";
  document.getElementById("useProjectIntegration").checked = false;
}

function validateAndSavePrompt() {
  const promptName = document.getElementById("promptName").value.trim();
  const promptNameError = document.getElementById("promptNameError");

  if (!promptName) {
    promptNameError.style.display = "block";
  } else {
    promptNameError.style.display = "none";
    savePrompt();
  }
}


function savePrompt() {
  const promptSettings = Object.create({});
  basicElementsArray.forEach((element) => {
    promptSettings[element] = document.getElementsByName(element)[0].value;
  });
  if (document.getElementById("useProjectIntegration").checked) {
    promptSettings.integration_settings = Object.create({});
    Object.keys(integrationElementsArray).forEach((element) => {
      const val = document.getElementsByName(element)[0].value;
      promptSettings.integration_settings[element] = element === "LLMModelName" ? val : +val;
    });
  }
  const rowsData = document.querySelectorAll("vscode-data-grid-row[row-type='data']");
  if (rowsData.length >= 1) {
    promptSettings.variables = Object.create({});
    rowsData.forEach((element) => {
      const name = element
        .querySelector("vscode-data-grid-cell[grid-column='1']")
        .textContent.replace(/^\s+|\r\n|\n|\r|\s+$/gm, "");
      const value = element
        .querySelector("vscode-data-grid-cell[grid-column='2']")
        .textContent.replace(/^\s+|\r\n|\n|\r|\s+$/gm, "");
      console.log({ name, value });
      const regex = new RegExp("^\\d+$");
      promptSettings.variables[name] = regex.test(value) ? +value : value;
    });
  }
  vscode.postMessage({
    command: "save",
    promptSettings,
  });
  console.log("alitacode prompt created!");
  cleanUp();
}
