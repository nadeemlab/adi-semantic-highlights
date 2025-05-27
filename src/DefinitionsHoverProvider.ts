import * as vscode from 'vscode';

import { DefinitionCard, definitionCard, definitionCards } from './types';

export class DefinitionsHoverProvider implements vscode.HoverProvider {
  workspaceState: vscode.Memento

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position) {
    const range = document.getWordRangeAtPosition(position);
    const word = document.getText(range);
    const card = this._lookupDefinitionCard(word);
    if (!card) {
      return null;
    }
    const alsoKnownAs = card.machineToken == word ? null : this._getLabel(word);
    const text = this._getText(card, alsoKnownAs);
    const markdownString = new vscode.MarkdownString(text);
    markdownString.supportHtml = true;
    return new vscode.Hover(markdownString);
  }

  _getLabel(word: string): string | null {
    const lookup = this.workspaceState.get<{[key: string]: string}>('readable labels')
    if (lookup && (word in lookup)) {
      return lookup[word];
    }
    return null;
  }

  _lookupDefinitionCard(word: string): DefinitionCard | null {
    const card = this._lookupDefinitionCardOfEntityProperty(word);
    if (card) {
      return card;
    }
    const tableAliases = this.workspaceState.get<{[key: string]: string}>('table aliases');
    if (tableAliases && (word in tableAliases)) {
      return this._lookupDefinitionCardOfEntityProperty(tableAliases[word]);
    }
    const fieldAliases = this.workspaceState.get<{[key: string]: string}>('field aliases');
    if (fieldAliases && (word in fieldAliases)) {
      return this._lookupDefinitionCardOfEntityProperty(fieldAliases[word]);
    }
    return null;
  }

  _lookupDefinitionCardOfEntityProperty(entityToken: string): DefinitionCard | null{
    const keys = definitionCards(this.workspaceState);
    for (const key of keys) {
      if (definitionCard(entityToken) === key) {
        const card = this.workspaceState.get<DefinitionCard>(key);
        if (card) {return card;}
      }
    }
    return null;
  }

  _getText(card: DefinitionCard, alsoKnownAs: string | null): string {
    let color = null;
    if (card.type === 'entity') {
      color = 'class/entity green';
    }
    if (card.type === 'property') {
      color = 'property cyan';
    }
    const akaPortion = alsoKnownAs ? ` (<em>${alsoKnownAs}</em>)` : '';
    const text = `<b>${this._wrapColor(color, card.name)}</b>${akaPortion}. ${card.definition}`;
    const urlPortion = card.href ? ` <a href="${card.href.url}">${card.href.text}</a>` : '';
    return text + urlPortion;
  }

  _wrapColor(color: string | null, text: string): string {
    let _color = '#dddddd';
    if (color === 'class/entity green') {
      _color = '#4EC9B0';
    }
    if (color === 'property cyan') {
      _color = '#9CDCFE';
    }
    return `<span style="color:${_color};">${text}</span>`;
  }
}