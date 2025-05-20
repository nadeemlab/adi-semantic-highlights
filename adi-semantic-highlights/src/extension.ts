// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Extension "adi-semantic-highlights" is now active.');

  vscode.languages.registerHoverProvider(
    {scheme: 'file'},
    {
      provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);
        if (context.workspaceState.keys().includes(word)) {
          const value = context.workspaceState.get(word);
          const mark = '<span style="color:#60d6d6;"><b>' + word + '</b></span>. ' + value;
          const s = new vscode.MarkdownString(mark);
          s.supportHtml = true;
          return new vscode.Hover(s);
        } else {
          return null;
        }
      },
    }
  );

  vscode.languages.registerCompletionItemProvider(
    {scheme: 'file'},
    {
      provideCompletionItems(document, position, token, completionContext) {
        const items: vscode.CompletionItem[] = [];
        for (const item of context.workspaceState.keys()) {
          items.push(new vscode.CompletionItem(item, vscode.CompletionItemKind.Constant))
        }
        return items;
      }
    },
  )

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('adi-semantic-highlights.select-schema', async () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Select a source file containing data model schema information.');
    const loc = vscode.workspace.workspaceFolders ? vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.path) : undefined;
    const schemaFile = await vscode.window.showOpenDialog({canSelectFiles: true, canSelectFolders: false, canSelectMany: false, title: 'Select a schema source file', openLabel: 'Use this schema', defaultUri: loc, filters: {'OWL ontology': ['owl'], 'SQLite database': ['sqlite', 'db']}})
    vscode.window.showInformationMessage('You picked: ' + schemaFile);

    if (schemaFile) {
      const path = schemaFile[0].path;
      const db = await open({
        filename: path,
        driver: sqlite3.Database
      })
      const results = await db.all('SELECT * FROM reference_fields;');
      for (const result of results) {
        context.workspaceState.update(result.Name, result.Property)
      }

      const results2 = await db.all('SELECT * FROM reference_entities;');
      for (const result of results2) {
        context.workspaceState.update(result.Name, result.Definition)
      }
    }

  });

  console.log('Initial known key/values: ' + context.workspaceState.keys().length)

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
