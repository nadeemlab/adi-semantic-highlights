import * as vscode from 'vscode';

import { schemaPathVar, SchemaLoader } from './SchemaLoader';

export class SchemaSelector {
  workspaceState: vscode.Memento

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
  }

  async selectSchema() {
    const directory = vscode.workspace.workspaceFolders ? vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.path) : undefined;
    const path = this.workspaceState.get<string>(schemaPathVar);
    const defaultUri = path ? vscode.Uri.file(path) : directory;
    const openOptions = {
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      title: 'Select a schema file (SQLite), or directory with TSV schema files',
      openLabel: 'Use this schema',
      defaultUri: defaultUri,
      filters: {'SQLite database': ['sqlite', 'db']}
    }
    const schemaFileUris = await vscode.window.showOpenDialog(openOptions);
    if (schemaFileUris) {
      const path = schemaFileUris[0].path;
      this.workspaceState.update(schemaPathVar, path)
      vscode.window.showInformationMessage('Using definitions from schema file or directory: ' + path);
    }
    const loader = new SchemaLoader(this.workspaceState)
    await loader.loadSchema();
  }

}
