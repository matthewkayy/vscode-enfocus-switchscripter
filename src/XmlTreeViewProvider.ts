import * as vscode from 'vscode';
import { TreeItem } from "./TreeItem";

import { xmlResult } from "./XmlResult";

export class XmlTreeViewProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;
	
	private _onDidSelectItem: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();
    readonly onDidSelectItem: vscode.Event<string | undefined> = this._onDidSelectItem.event;

    private rootName: string | undefined;
    private flowElementProperties: string[] = [];
    private outgoingConnectionProperties: string[] = [];

    constructor() {
        this.loadXmlFile();
    }

    refresh(): void {
        this.loadXmlFile();
        this._onDidChangeTreeData.fire();
    }

    async loadXmlFile() {
        if (xmlResult) {
            this.rootName = xmlResult?.data?.Object?.ElementFields?.[0]?.Name?.[0]?._ ?? 'Root';
            this.flowElementProperties = [];
            this.outgoingConnectionProperties = [];

            const elementFields = xmlResult?.data?.Object.ElementFields?.[0] ?? {};
            const connectionFields = xmlResult?.data?.Object.ConnectionFields?.[0] ?? {};

            for (const [key, value] of Object.entries(elementFields)) {
                const element = value as Array<{ $: { Editor?: string; LocalizedTagName?: string } }>;
                if (element[0]?.$?.Editor?.includes('inline')) {
                    this.flowElementProperties.push(key);
                }
            }

            for (const [key, value] of Object.entries(connectionFields)) {
                const connection = value as Array<{ $: { LocalizedTagName?: string } }>;
                this.outgoingConnectionProperties.push(key);
            }

            this._onDidChangeTreeData.fire();
        }
		else {
            vscode.window.showErrorMessage(`Script XML file is undefined`);
		}
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            if (!this.rootName) {
                return Promise.resolve([]);
            }
            return Promise.resolve([
                new TreeItem(this.rootName, vscode.TreeItemCollapsibleState.Expanded, 'root')
            ]);
        } else if (element.contextValue === 'root') {
            return Promise.resolve([
                new TreeItem("Flow element properties", vscode.TreeItemCollapsibleState.Expanded, 'flow'),
                new TreeItem("Outgoing connection properties", vscode.TreeItemCollapsibleState.Expanded, 'outgoing')
            ]);
        } else if (element.contextValue === 'flow') {
            return Promise.resolve(this.flowElementProperties.map(name => new TreeItem(name, vscode.TreeItemCollapsibleState.None, 'item')));
        } else if (element.contextValue === 'outgoing') {
            return Promise.resolve(this.outgoingConnectionProperties.map(name => new TreeItem(name, vscode.TreeItemCollapsibleState.None, 'item')));
        }
        return Promise.resolve([]);
    }

    selectDeclarationItem(item: string) {
        this._onDidSelectItem.fire(item);
    }
}