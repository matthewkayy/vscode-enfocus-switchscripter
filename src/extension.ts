import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

import { XmlTreeViewProvider } from "./XmlTreeViewProvider";
import { XmlParserViewProvider } from "./XmlParserViewProvider";
import { xmlResult } from "./XmlResult";

export async function activate(context: vscode.ExtensionContext) {
	const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if (!folderPath) {
		return;
	}

	const xmlFilePath = path.join(folderPath, `${path.basename(folderPath)}.xml`);
	if (!fs.existsSync(xmlFilePath)) {
		vscode.window.showErrorMessage(`XML file not found at ${xmlFilePath}`);
		return;
	}

	const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');

	try {
		xmlResult.data = await xml2js.parseStringPromise(xmlContent);
	}
	catch (error) {
		vscode.window.showErrorMessage(`Error parsing XML file: ${(error as Error).message}`);
		return;
	}

	const provider = new XmlParserViewProvider(context.extensionUri);
    const xmlTreeViewProvider = new XmlTreeViewProvider();

    context.subscriptions.push(
        vscode.commands.registerCommand('enfocusSwitchScripter.selectDeclarationItem', (label: string) => {
            xmlTreeViewProvider.selectDeclarationItem(label);
        })
    );

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('enfocusSwitchScripter.declarationView', xmlTreeViewProvider)
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(XmlParserViewProvider.viewType, provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('enfocusSwitchScripter.addColor', () => {
			provider.addColor();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('enfocusSwitchScripter.addItem', () => {
			provider.addItem();
		}));

	xmlTreeViewProvider.onDidSelectItem((selectedItem) => {
		if (selectedItem) {
			provider.updateContent(selectedItem);
		}
	});
}