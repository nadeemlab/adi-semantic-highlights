import * as vscode from 'vscode';

import { DefinitionCard, definitionCards } from './types';

enum Location {
  previous=0,
  current=1,
}

const wordPattern = new RegExp(/[\w\d\_\-]+/)

export class FieldsCompletionItemProvider implements vscode.CompletionItemProvider {
  workspaceState: vscode.Memento

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    if (vscode.workspace.getConfiguration('disableADISchemaHighlight').get('disableFunctionality')) {
      return null;
    }
    for (const location of [Location.previous, Location.current]) {
      const match = this._getFullThingWordAndFields(document, position, location);
      if (match.fullWord !== null) {
        const prefix = location === Location.previous ? match.fullWord + '.' : '';
        return this._registerCompletions(match.fields);
      }
    }
    return this._registerCompletions(this._getAllGenericTokens());
  }

  _getFullThingWordAndFields(
    document: vscode.TextDocument,
    position: vscode.Position,
    at: Location,
  ): {fullWord: string | null, fields: string[]} {
    const empty = {fullWord: null, fields: [], prefix: ''};
    const {noWordsNearEnoughToCursor, range} = this._findWordsNearToCursor(document, position);
    if (noWordsNearEnoughToCursor || range === null) {
      return empty;
    }
    const word = this._getWordAt(document, position, range, at);
    if (!word) {
      return empty;
    }
    const fieldsOfThings = this.workspaceState.get<{[key: string]: string[]}>('fields of things');
    if (fieldsOfThings && word in fieldsOfThings) {
      const fields = fieldsOfThings[word];
      return {fullWord: word, fields: fields};
    }
    return empty;
  }

  _findWordsNearToCursor(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): {noWordsNearEnoughToCursor: boolean, range: vscode.Range | null} {
    const range1 = document.getWordRangeAtPosition(position, wordPattern);
    if (typeof range1 !== 'undefined') {
      return {noWordsNearEnoughToCursor: false, range: range1};
    }
    const range2 = document.getWordRangeAtPosition(position.translate(0, -1), wordPattern);
    if (typeof range2 !== 'undefined') {
      return {noWordsNearEnoughToCursor: false, range: range2};
    }
    return {noWordsNearEnoughToCursor: true, range: null};
  }

  _getWordAt(document: vscode.TextDocument, position: vscode.Position, range: vscode.Range, at: Location): string | null {
    const baseWord = document.getText(range);
    const translation = at === Location.previous ? -1*baseWord.length - 1 : 0;
    let previousRange = undefined;
    try {
      previousRange = document.getWordRangeAtPosition(position.translate(0, translation), wordPattern);
      if (typeof previousRange === 'undefined') {
        return null;
      }
      const word = document.getText(previousRange);
      if (typeof word === 'undefined') {
        return null;
      }
      return word;
    } catch (error) {}
    return null;
  }

  _registerCompletions(strings: string[]): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    let count = 0;
    for (const value of strings) {
      const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Constant);
      item.sortText = count.toString().padStart(8, '0');
      items.push(item)
      count += 1;
    }
    return items;
  }

  _getAllGenericTokens(): string[] {
    const tokens: string[] = [];
    const cards = definitionCards(this.workspaceState);
    for (const cardId of cards) {
      const card = this.workspaceState.get<DefinitionCard>(cardId);
      if (typeof card !== 'undefined') {
        tokens.push(card.machineToken);
      }
    }
    const fieldsOfThings = this.workspaceState.get<{[key: string]: string[]}>('fields of things');
    if (fieldsOfThings) {
      for (const thing of Object.keys(fieldsOfThings)) {
        tokens.push(thing);
      }
    }
    return tokens;
  }
}
