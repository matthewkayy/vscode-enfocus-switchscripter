import * as vscode from 'vscode';

export class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.iconPath = this.getIconPath();
        
        this.command = {
            command: 'enfocusSwitchScripter.selectDeclarationItem',
            title: 'Select Item',
            arguments: [label]
        };
    }

    private getIconPath(): any {
		switch(this.contextValue) {
			case 'flow':
				return new vscode.ThemeIcon('settings-gear');
			case 'outgoing':
				return new vscode.ThemeIcon('symbol-property');
			case 'item':
				return new vscode.ThemeIcon('circle-filled');
			default:
				return new vscode.ThemeIcon('file');
		}
    }
}