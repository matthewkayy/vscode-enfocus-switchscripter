import * as vscode from "vscode";
import { PropertyNode } from "./propertyNode";
import { XmlResultInstance } from "./xmlResult";

export class XmlParserViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "enfocusSwitchScripterView";

  private _view?: vscode.WebviewView;
  // ← keep track of the currently shown node so we can write edits into it
  private _currentNode: PropertyNode | null = null;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this.getWebviewContent(null);

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case "propChanged":
          console.log("User edited:", msg.data);
          if (this._currentNode) {
            for (const [key, val] of Object.entries(msg.data)) {
				if (key === "__nodeKey") {
					// skip the virtual field
					continue;
				}

				this._currentNode.node.$[key] = val;
            }
          }
          break;
        case "save":
          vscode.commands.executeCommand(
            "enfocusSwitchScripter.saveProperties"
          );
          break;
      }
    });
  }

  public updateContent(node: PropertyNode) {
    // remember which node is showing so propChanged can find it
    this._currentNode = node;
    if (this._view) {
      this._view.webview.html = this.getWebviewContent(node);
    }
  }

  private getWebviewContent(node: PropertyNode | null): string {
    if (!node) {
      return `<!DOCTYPE html><html><body><p>No property selected.</p></body></html>`;
    }

    const rawAttrs = node.node.$ || {};
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawAttrs)) {
      if (k === "Subtype" || k === "Type" || k === "UserDefined") {
        continue;
      }
      attrs[k] = v as string;
    }

    const preferred = [
      "__nodeKey",
      "LocalizedTagName",
      "Tooltip",
      "Editor",
      "Default",
      "Dependency",
      "DependencyCondition",
      "Dependencyvalue",
      "Dependencytype",
      "Validation",
      "DetailedInfo",
    ];

    const displayMap: Record<string, string> = {
      LocalizedTagName: "Name",
      Tooltip: "Tooltip",
      Editor: "Editor",
      Default: "Default",
      Dependency: "Dependancy",
      Dependencyvalue: "Master value",
      DependencyCondition: "Show if master",
      DetailedInfo: "Default info",
    };

    const rows: string[] = [];
    const pushRow = (
      key: string,
      val: string,
      readonly = false,
      labelOverride?: string
    ) => {
      const label = labelOverride ?? displayMap[key] ?? key;
      rows.push(`
        <tr>
          <td class="label">${label}</td>
          <td class="input">
            <input id="${key}" type="text" value="${val}" ${
        readonly ? "readonly" : ""
      }/>
          </td>
        </tr>`);
    };

    for (const key of preferred) {
      if (key === "__nodeKey") {
        pushRow("__nodeKey", node.key, false, "Tag");
      } else if (attrs[key] !== undefined) {
        pushRow(key, attrs[key]);
        delete attrs[key];
      }
    }

    for (const key of Object.keys(attrs).sort()) {
      pushRow(key, attrs[key]);
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' vscode-resource:;">
		<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        :root {
          --font: var(--vscode-font-family);
          --fontsize: var(--vscode-font-size);
          --bg: var(--vscode-sideBar-background);
          --fg: var(--vscode-sideBar-foreground);
          --header-bg: var(--vscode-sideBarSectionHeader-background);
          --border: var(--vscode-sideBarSectionHeader-border);
          --input-bg: var(--vscode-input-background);
          --input-fg: var(--vscode-input-foreground);
          --input-border: var(--vscode-input-border);
          --focus: var(--vscode-focusBorder);
        }
        body {
          margin:0; padding:10px;
          background:var(--bg); color:var(--fg);
          font-family:var(--font); font-size:var(--fontsize);
        }
        table { width:100%; border-collapse:collapse; }
        thead { background:var(--header-bg); }
        th, td {
          padding:6px 8px; border-bottom:1px solid var(--border); text-align:left;
        }
        .label { width:30%; font-weight:bold; }
        .input { width:70%; }
        input {
          width:100%; padding:4px; box-sizing:border-box;
          background:var(--input-bg); color:var(--input-fg);
          border:1px solid var(--input-border); border-radius:2px;
          font-family:inherit; font-size:inherit;
        }
        input:focus { outline:1px solid var(--focus); }
      </style>
    </head>
    <body>
      <form id="propForm">
        <table>
          <thead>
            <tr><th>Property</th><th>Value</th></tr>
          </thead>
          <tbody>
            ${rows.join("")}
          </tbody>
        </table>
      </form>
      <script>
		const vscode = acquireVsCodeApi();
		document.getElementById('propForm').addEventListener('input', () => {
			const data = {};
			document.querySelectorAll('input').forEach(i => data[i.id] = i.value);
			vscode.postMessage({ type: 'propChanged', data });
		});
      </script>
    </body>
    </html>`;
  }
}
