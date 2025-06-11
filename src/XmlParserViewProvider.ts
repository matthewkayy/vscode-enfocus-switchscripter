import * as vscode from 'vscode';
import * as fs from 'fs';
import * as xml2js from 'xml2js';

export class XmlParserViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'enfocusSwitchScripterView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public async  resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

        const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!folderPath) {
            webviewView.webview.html = `<p>No folder is opened.</p>`;
            return;
        }

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

        webviewView.webview.html = getWebviewContent("");

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

    public updateContent(selectedValue: string) {
        if (this._view) {
            this._view.webview.html = getWebviewContent(selectedValue);
        }
    }

	public addColor() {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'addColor' });
		}
	}

	public addItem() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'addItem' });
		}
	}
}

async function parseXmlFile(filePath: string): Promise<any> {
    if (!fs.existsSync(filePath)) {
		return null;
	}
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return xml2js.parseStringPromise(data, { mergeAttrs: true });
}

function generateInputFields(data: any): string {
    let inputsHtml = '';
    for (const [key, value] of Object.entries(data)) {
        inputsHtml += `<label for="${key}">${key}</label><br/>
                       <input type="text" id="${key}" value="${value}" /><br/><br/>`;
    }
    return inputsHtml;
}

function getWebviewContent(selectedValue: string): string {
    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>XML Parsed Inputs</title>
            </head>
            <body>
                <h2>Selected value</h2>
                ${selectedValue}
            </body>
            </html>`;
}