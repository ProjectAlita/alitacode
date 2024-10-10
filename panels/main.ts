const { provideVSCodeDesignSystem, allComponents, DataGrid, DataGridCell} = require("@vscode/webview-ui-toolkit");
provideVSCodeDesignSystem().register(allComponents);

window.addEventListener("load", main);


function main() {
  const dataGrid = document.getElementById("variables") as DataGrid;
  /*dataGrid.rowsData = [
    {
      name: "",
      value: ""
    }
  ];*/
  dataGrid.columnDefinitions = [
    { columnDataKey: "name", title: "Name" },
    { columnDataKey: "value", title: "Value" }
  ];
}
