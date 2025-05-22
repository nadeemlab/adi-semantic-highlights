import * as vscode from 'vscode';

import { DefinitionCard, definitionCards } from './types';

export class FieldsCompletionItemProvider implements vscode.CompletionItemProvider {
  workspaceState: vscode.Memento

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    const items: vscode.CompletionItem[] = [];

    const range = document.getWordRangeAtPosition(position);
    const baseWord = document.getText(range);
    const previousRange = document.getWordRangeAtPosition(position.translate(0, -1*baseWord.length - 1));
    const word = document.getText(previousRange);

    const fieldsOfThings = this.workspaceState.get<{[key: string]: string[]}>('fields of things');

    if (fieldsOfThings) {
      if (word in fieldsOfThings) {
        const fields = fieldsOfThings[word];
        for (const field of fields) {
          items.push(new vscode.CompletionItem(field, vscode.CompletionItemKind.Constant))
        }
      }
      else {

        for (const item of definitionCards(this.workspaceState)) {
          const value = this.workspaceState.get<DefinitionCard>(item);
          if (typeof value !== 'undefined') {
            items.push(new vscode.CompletionItem(value.machineToken, vscode.CompletionItemKind.Constant))
          }
        }

      }
    }


    return items;
  }
}
