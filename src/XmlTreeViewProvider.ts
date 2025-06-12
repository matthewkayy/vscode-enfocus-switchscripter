import * as vscode from "vscode";
import { TreeItem } from "./treeItem";
import { XmlResultInstance } from "./xmlResult";
import { PropertyNode } from "./propertyNode";

export class XmlTreeViewProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TreeItem | undefined | void
  > = new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private _onDidSelectItem: vscode.EventEmitter<any | undefined> =
    new vscode.EventEmitter<any | undefined>();
  readonly onDidSelectItem: vscode.Event<any | undefined> =
    this._onDidSelectItem.event;

  private rootName: string | undefined;
  public flowElementProperties: PropertyNode[] = [];
  public outgoingConnectionProperties: PropertyNode[] = [];

  constructor() {
    this.loadXmlFile();
  }

  refresh(): void {
    this.loadXmlFile();
    this._onDidChangeTreeData.fire();
  }

  async loadXmlFile() {
    const obj = XmlResultInstance.data.Object;

    this.rootName =
      obj.ElementFields?.[0]?.Name?.[0]?._ ??
      obj.Name?.[0]?._ ?? // in case it lives elsewhere
      "Root";

    const staticFields = new Set([
      "Name",
      "DisplayName",
      "Version",
      "Keywords",
      "Tooltip",
      "IncomingConnections",
      "OutgoingConnections",
      "ConnectionType",
      "FunctionsNodeJSScript",
      "ExecutionMode",
      "NumberOfSlots",
      "ExecutionGroup",
      "PerformanceTuning",
      "IdleAfterJob",
      "PositionInElementPane",
      "SubcategoryInElementPane",
      "DispositionInElementPane",
      "Description",
      "Compatibility",
      "SupportInfo",
      "AppDiscovery",
      "FlowUpgradeWarning",
      "UpgradeMaximumVersion",
      "Connections",
      "SwitchModule",
      "ObsoleteProperties",
      "ObsoleteConnectionProperties",
    ]);

    this.flowElementProperties = [];
    this.outgoingConnectionProperties = [];

    const efObj = (obj.ElementFields?.[0] ?? {}) as Record<string, any>;
    for (const [key, arr] of Object.entries(efObj)) {
      if (staticFields.has(key)) {continue;}
      const node = (arr as any[])[0];
      this.flowElementProperties.push({ key, node });
    }

    const cfObj = (obj.ConnectionFields?.[0] ?? {}) as Record<string, any>;
    for (const [key, arr] of Object.entries(cfObj)) {
      const node = (arr as any[])[0];
      this.outgoingConnectionProperties.push({ key, node });
    }

    this._onDidChangeTreeData.fire();
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
        new TreeItem(
          this.rootName,
          vscode.TreeItemCollapsibleState.Expanded,
          "root"
        ),
      ]);
    }

    if (element.contextValue === "root") {
      return Promise.resolve([
        new TreeItem(
          "Flow element properties",
          vscode.TreeItemCollapsibleState.Expanded,
          "flow"
        ),
        new TreeItem(
          "Outgoing connection properties",
          vscode.TreeItemCollapsibleState.Expanded,
          "outgoing"
        ),
      ]);
    }

    if (element.contextValue === "flow") {
      return Promise.resolve(
        this.flowElementProperties
          .filter((pn) => !pn.node.$.Dependency)
          .map((pn) => {
            const hasDeps = this.flowElementProperties.some(
              (child) => child.node.$.Dependency === pn.key
            );
            return new TreeItem(
              pn.key,
              hasDeps
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
              "flowItem"
            );
          })
      );
    }

    if (element.contextValue === "outgoing") {
      return Promise.resolve(
        this.outgoingConnectionProperties
          .filter((pn) => !pn.node.$.Dependency)
          .map((pn) => {
            const hasDeps = this.outgoingConnectionProperties.some(
              (child) => child.node.$.Dependency === pn.key
            );
            return new TreeItem(
              pn.key,
              hasDeps
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
              "outgoingItem"
            );
          })
      );
    }

    if (element.contextValue === "flowItem") {
      return Promise.resolve(
        this.flowElementProperties
          .filter((pn) => pn.node.$.Dependency === element.label)
          .map(
            (pn) =>
              new TreeItem(
                pn.key,
                vscode.TreeItemCollapsibleState.None,
                "flowItem"
              )
          )
      );
    }

    if (element.contextValue === "outgoingItem") {
      return Promise.resolve(
        this.outgoingConnectionProperties
          .filter((pn) => pn.node.$.Dependency === element.label)
          .map(
            (pn) =>
              new TreeItem(
                pn.key,
                vscode.TreeItemCollapsibleState.None,
                "outgoingItem"
              )
          )
      );
    }

    return Promise.resolve([]);
  }

  public getRootName(): string {
    return this.rootName ?? "Root";
  }

  public getParent(element: TreeItem): TreeItem | undefined {
    if (element.contextValue === "root") {
      return undefined;
    }

    if (
      element.contextValue === "flow" ||
      element.contextValue === "outgoing"
    ) {
      return new TreeItem(
        this.rootName!,
        vscode.TreeItemCollapsibleState.Expanded,
        "root"
      );
    }

    if (element.contextValue === "flowItem") {
      return new TreeItem(
        "Flow element properties",
        vscode.TreeItemCollapsibleState.Expanded,
        "flow"
      );
    }

    if (element.contextValue === "outgoingItem") {
      return new TreeItem(
        "Outgoing connection properties",
        vscode.TreeItemCollapsibleState.Expanded,
        "outgoing"
      );
    }

    return undefined;
  }

  public selectDeclarationItem(item?: string) {
    const xmlRoot = XmlResultInstance.data.Object;

    if (!item || item === this.rootName) {
      this._onDidSelectItem.fire(xmlRoot);
      return;
    }

    const prop =
      this.flowElementProperties.find((p) => p.key === item) ||
      this.outgoingConnectionProperties.find((p) => p.key === item);

    if (prop) {
      this._onDidSelectItem.fire(prop);
    } else {
      this._onDidSelectItem.fire(xmlRoot);
    }
  }

  public addFlowElementPropertyItem(name: string) {
    const newNode = {
      $: {
        Editor: "inline",
        LocalizedTagName: name,
        UserDefined: "true",
        Type: "string",
      },
      _: "",
    };

    this.flowElementProperties.push({ key: name, node: newNode });

    const efObj = XmlResultInstance.data.Object.ElementFields[0];
    efObj[name] = [newNode];

    this._onDidChangeTreeData.fire();
  }

  public addOutgoingConnectionItem(name: string) {
    const newNode = {
      $: {
        Default: "",
        DetailedInfo: "",
        Editor: "inline",
        LocalizedTagName: name,
        Subtype: "inline",
        Tooltip: "",
        Type: "string",
        UserDefined: "true",
        Validation: "Standard",
      },
      _: "",
    };

    this.outgoingConnectionProperties.push({ key: name, node: newNode });

    const cfObj = XmlResultInstance.data.Object.ConnectionFields[0] as Record<
      string,
      any
    >;
    cfObj[name] = [newNode];

    this._onDidChangeTreeData.fire();
  }

  public removePropertyItem(name: string) {
    this.flowElementProperties = this.flowElementProperties.filter(
      (n) => n.key !== name
    );
    this.outgoingConnectionProperties =
      this.outgoingConnectionProperties.filter((n) => n.key !== name);

    const obj = XmlResultInstance.data.Object;
    const ef = (obj.ElementFields?.[0] as Record<string, any>) || {};
    const cf = (obj.ConnectionFields?.[0] as Record<string, any>) || {};

    delete ef[name];
    delete cf[name];

    this._onDidChangeTreeData.fire();
  }

  public duplicatePropertyItem(oldName: string, newName: string) {
    let bucketArr: PropertyNode[], bucketObj: Record<string, any>;
    const xmlObj = XmlResultInstance.data.Object;
    if (this.flowElementProperties.some((p) => p.key === oldName)) {
      bucketArr = this.flowElementProperties;
      bucketObj = xmlObj.ElementFields[0] as Record<string, any>;
    } else {
      bucketArr = this.outgoingConnectionProperties;
      bucketObj = xmlObj.ConnectionFields[0] as Record<string, any>;
    }

    const original = bucketArr.find((p) => p.key === oldName)!;
    const clonedNode = JSON.parse(JSON.stringify(original.node));

    bucketArr.push({ key: newName, node: clonedNode });

    bucketObj[newName] = [clonedNode];

    this._onDidChangeTreeData.fire();
  }

  public movePropertyItem(name: string, delta: -1 | 1) {
    let arr: PropertyNode[];
    let bucketKey: "ElementFields" | "ConnectionFields";
    if (this.flowElementProperties.some((p) => p.key === name)) {
      arr = this.flowElementProperties;
      bucketKey = "ElementFields";
    } else if (this.outgoingConnectionProperties.some((p) => p.key === name)) {
      arr = this.outgoingConnectionProperties;
      bucketKey = "ConnectionFields";
    } else {
      return vscode.window.showErrorMessage(
        `Cannot move “${name}”: not a property.`
      );
    }

    const prop = arr.find((p) => p.key === name)!;

    if (prop.node.$.Dependency) {
      return;
    }

    const topLevel = arr.filter((p) => !p.node.$.Dependency);
    const idxTop = topLevel.findIndex((p) => p.key === name);
    const newIdx = idxTop + delta;
    if (newIdx < 0 || newIdx >= topLevel.length) {
      return;
    }

    const swapKey = topLevel[newIdx].key;

    const origIndex = arr.indexOf(prop);
    arr.splice(origIndex, 1);

    const swapIndex = arr.findIndex((p) => p.key === swapKey);
    const insertAt = delta > 0 ? swapIndex + 1 : swapIndex;
    arr.splice(insertAt, 0, prop);

    const xmlObj = XmlResultInstance.data.Object;
    const bucket = xmlObj[bucketKey][0] as Record<string, any>;
    const newBucket: Record<string, any> = {};
    for (const p of arr) {
      newBucket[p.key] = [p.node];
    }
    Object.keys(bucket).forEach((k) => delete bucket[k]);
    Object.assign(bucket, newBucket);

    this._onDidChangeTreeData.fire();
  }
}