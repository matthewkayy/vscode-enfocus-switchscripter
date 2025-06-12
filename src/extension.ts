import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

import { XmlTreeViewProvider } from "./xmlTreeViewProvider";
import { XmlParserViewProvider } from "./xmlParserViewProvider";
import { XmlResultInstance } from "./xmlResult";
import { TreeItem } from './treeItem';
import { PropertyNode } from './propertyNode';

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

  const xmlContent = fs.readFileSync(xmlFilePath, "utf-8");

  try {
    XmlResultInstance.data = await xml2js.parseStringPromise(xmlContent);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error parsing XML file: ${(error as Error).message}`
    );
    return;
  }

  const provider = new XmlParserViewProvider(context.extensionUri);
  const xmlTreeViewProvider = new XmlTreeViewProvider();

  const ADD_KEY = "enfocusSwitchScripter:addEnabled";
  const REMOVE_KEY = "enfocusSwitchScripter:removeEnabled";
  const DUPLICATE_KEY = "enfocusSwitchScripter:duplicateEnabled";
  const MOVE_KEY = "enfocusSwitchScripter:moveEnabled";

  const treeView = vscode.window.createTreeView(
    "enfocusSwitchScripter.declarationView",
    { treeDataProvider: xmlTreeViewProvider }
  );
  context.subscriptions.push(treeView);

  vscode.commands.executeCommand("setContext", ADD_KEY, false);
  vscode.commands.executeCommand("setContext", REMOVE_KEY, false);
  vscode.commands.executeCommand("setContext", DUPLICATE_KEY, false);

  treeView.onDidChangeSelection((e) => {
    const sel = e.selection[0];
    const isFlowItem = sel?.contextValue === "flowItem";
    const isOutgoingItem = sel?.contextValue === "outgoingItem";
    const isGroup =
      sel?.contextValue === "flow" || sel?.contextValue === "outgoing";

    vscode.commands.executeCommand("setContext", ADD_KEY, isGroup);
    vscode.commands.executeCommand(
      "setContext",
      REMOVE_KEY,
      isFlowItem || isOutgoingItem
    );
    vscode.commands.executeCommand(
      "setContext",
      DUPLICATE_KEY,
      isFlowItem || isOutgoingItem
    );
    vscode.commands.executeCommand(
      "setContext",
      MOVE_KEY,
      isFlowItem || isOutgoingItem
    );
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.selectDeclarationItem",
      (item: string) => {
        // item.key is the property name you want to select
        xmlTreeViewProvider.selectDeclarationItem(item);
      }
    )
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      XmlParserViewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.addItem",
      async () => {
        const [sel] = treeView.selection;
        if (!sel) {
          return vscode.window.showInformationMessage(
            "Please select “Flow element properties” or “Outgoing connection properties” first."
          );
        }

        const propType =
          sel.contextValue === "flow"
            ? "Flow element properties"
            : sel.contextValue === "outgoing"
            ? "Outgoing connection"
            : undefined;
        if (!propType) {
          return vscode.window.showInformationMessage(
            "Select one of the property groups."
          );
        }

        const name = await vscode.window.showInputBox({
          prompt: `New ${propType} property name`,
        });
        if (!name) {
          return;
        }

        if (propType === "Flow element properties") {
          xmlTreeViewProvider.addFlowElementPropertyItem(name);
        } else {
          xmlTreeViewProvider.addOutgoingConnectionItem(name);
        }
      }
    )
  );

  // Remove
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.removeItem",
      async () => {
        const [sel] = treeView.selection;
        if (
          !sel ||
          (sel.contextValue !== "flowItem" &&
            sel.contextValue !== "outgoingItem")
        ) {
          return vscode.window.showInformationMessage(
            "Please select a property to remove."
          );
        }
        const name = sel.label as string;

        const ok = await vscode.window.showWarningMessage(
          `Really remove “${name}”?`,
          { modal: true },
          "Remove"
        );
        if (ok !== "Remove") {
          return;
        }

        xmlTreeViewProvider.removePropertyItem(name);

        const isFlow = sel.contextValue === "flowItem";

        const parentNode = new TreeItem(
          isFlow ? "Flow element properties" : "Outgoing connection properties",
          vscode.TreeItemCollapsibleState.Expanded,
          isFlow ? "flow" : "outgoing"
        );
        const siblings = await xmlTreeViewProvider.getChildren(parentNode);

        const idx = siblings.findIndex((t) => t.label === name);
        const newIdx = idx > 0 ? idx - 1 : 0;
        const nextItem = siblings[newIdx];

        if (nextItem) {
          await treeView.reveal(nextItem, { select: true, focus: true });
          xmlTreeViewProvider.selectDeclarationItem(nextItem.label as string);
        } else {
          const rootName = xmlTreeViewProvider.getRootName();
          const rootItem = new TreeItem(
            rootName,
            vscode.TreeItemCollapsibleState.None,
            "root"
          );
          await treeView.reveal(rootItem, { select: true, focus: true });

          xmlTreeViewProvider.selectDeclarationItem();
        }
      }
    )
  );

  // Duplicate
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.duplicateItem",
      async (item: TreeItem) => {
        if (
          !item ||
          (item.contextValue !== "flowItem" &&
            item.contextValue !== "outgoingItem")
        ) {
          return vscode.window.showInformationMessage(
            "Select a property to duplicate."
          );
        }
        const oldName = item.label as string;
        const defaultName = `${oldName}_copy`;
        const newName = await vscode.window.showInputBox({
          prompt: "New property name",
          value: defaultName,
        });
        if (newName) {
          xmlTreeViewProvider.duplicatePropertyItem(oldName, newName);
        }
      }
    )
  );

  // Move Up / Move Down
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.moveUpItem",
      (item: TreeItem) => {
        if (
          !item ||
          (item.contextValue !== "flowItem" &&
            item.contextValue !== "outgoingItem")
        ) {
          return;
        }
        xmlTreeViewProvider.movePropertyItem(item.label as string, -1);
      }
    ),
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.moveDownItem",
      (item: TreeItem) => {
        if (
          !item ||
          (item.contextValue !== "flowItem" &&
            item.contextValue !== "outgoingItem")
        ) {
          return;
        }
        xmlTreeViewProvider.movePropertyItem(item.label as string, 1);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "enfocusSwitchScripter.saveProperties",
      async () => {
        try {
          const builder = new xml2js.Builder({ renderOpts: { pretty: true } });
          const xml = builder.buildObject(XmlResultInstance.data);

          await fs.promises.writeFile(xmlFilePath, xml, "utf-8");

          vscode.window.showInformationMessage("Script saved successfully.");
        } catch (err) {
          vscode.window.showErrorMessage(
            `Error saving script: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    )
  );

  xmlTreeViewProvider.onDidSelectItem((xmlNode: PropertyNode) => {
    if (xmlNode) {
      provider.updateContent(xmlNode);
    }
  });

  async function reloadXmlAndRefresh() {
    try {
      const xmlContent = fs.readFileSync(xmlFilePath, "utf-8");
      XmlResultInstance.data = await xml2js.parseStringPromise(xmlContent);
    } catch (e) {
      vscode.window.showErrorMessage(
        `Error rereading XML: ${(e as Error).message}`
      );
      return;
    }
    xmlTreeViewProvider.refresh();

    const [sel] = treeView.selection;
    if (
      sel &&
      (sel.contextValue === "flowItem" || sel.contextValue === "outgoingItem")
    ) {
      xmlTreeViewProvider.selectDeclarationItem(sel.label as string);
    } else {
      xmlTreeViewProvider.selectDeclarationItem();
    }
  }

  const watcher = vscode.workspace.createFileSystemWatcher(xmlFilePath);
  watcher.onDidChange(() => reloadXmlAndRefresh());
  watcher.onDidCreate(() => reloadXmlAndRefresh());
  watcher.onDidDelete(() => {
    XmlResultInstance.data = {};
    xmlTreeViewProvider.refresh();
    xmlTreeViewProvider.selectDeclarationItem();
  });
  context.subscriptions.push(watcher);
}