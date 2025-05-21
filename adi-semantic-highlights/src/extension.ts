import * as vscode from 'vscode';

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

interface HyperReference {
  text: string
  url: string
}

interface DefinitionCard {
  machineToken: string
  name: string
  type: "entity" | "property"
  definition: string
  href?: HyperReference
}

function definitionCard(name: string): string {
  return 'Definition card: ' + name;
}

function definitionCards(workspaceState: vscode.Memento) {
  const card = new RegExp('^' + definitionCard(''))
  return workspaceState.keys().filter((item) => card.test(item));
}

class DefinitionsHoverProvider implements vscode.HoverProvider {
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
    let _color = "#dddddd";
    if (color === 'class/entity green') {
      _color = '#4EC9B0';
    }
    if (color === 'property cyan') {
      _color = '#9CDCFE';
    }
    return `<span style="color:${_color};">${text}</span>`;
  }
}

class FieldsCompletionItemProvider implements vscode.CompletionItemProvider {
  workspaceState: vscode.Memento

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    const items: vscode.CompletionItem[] = [];
    for (const item of this.workspaceState.keys()) {
      items.push(new vscode.CompletionItem(item, vscode.CompletionItemKind.Constant))
    }
    return items;
  }
}

interface SQLDefinitionRow {
  Name: string
  Label: string
  Definition: string
  'Definitional reference': string
}

const schemaPathVar = 'extension schema source file path';

class SchemaLoader {
  workspaceState: vscode.Memento
  dbFilename: string

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
    const filename: string | undefined = this.workspaceState.get(schemaPathVar);
    if (typeof filename === 'undefined') {
      throw new Error('Can not load definition texts because no schema file is specified.');
    }
    this.dbFilename = filename;
  }

  async loadSchema() {
    this._clearDefinitionCards();
    await this._loadDefinitionCards();
    await this._loadAliases();
  }

  async _loadDefinitionCards() {
    const db = await open({
      filename: this.dbFilename,
      driver: sqlite3.Database
    })

    const rows1 = await db.all('SELECT * FROM reference_entities;');
    for (const row of rows1) {
      const card = this._makeDefinitionCard(row, 'entity')
      this.workspaceState.update(definitionCard(card.machineToken), card)
    }

    const rows2 = await db.all('SELECT * FROM reference_properties;');
    for (const row of rows2) {
      const card = this._makeDefinitionCard(row, 'property')
      if (this._hasKey(definitionCard(card.machineToken))) {
        console.log('When registering properties, encountered already-existing entity key: ' + definitionCard(card.machineToken))
      } else {
        this.workspaceState.update(definitionCard(card.machineToken), card)
      }
    }
  }

  _hasKey(key: string): boolean {
    if (!this.workspaceState.keys().includes(key)) {
      return false;
    }
    if (this.workspaceState.get(key) === null) {
      return false;
    }
    return true;
  }

  _makeDefinitionCard(row: SQLDefinitionRow, type: 'entity' | 'property'): DefinitionCard {
    const crid = row['Definitional reference'] != '' ? row['Definitional reference'] : null;
    return {
      machineToken: row.Name,
      name: row.Label,
      type: type,
      definition: row.Definition,
      ...(crid! && {
        href: {text: row['Definitional reference'], url: this._formPURL(crid)}
      }),
    }
  }

  _formPURL(crid: string): string {
    const _crid = crid.replace(':', '_');
    return `http://purl.obolibrary.org/obo/${_crid}`
  }

  async _loadAliases() {
    const db = await open({
      filename: this.dbFilename,
      driver: sqlite3.Database
    })

    const entityTokens: {[key: string]: string} = {};
    const rows1 = await db.all('SELECT * FROM reference_entities;');
    for (const row of rows1) {
      const label: string = row.Label;
      entityTokens[label] = row.Name;
    }
    this.workspaceState.update("entity tokens", entityTokens);

    const propertyTokens: {[key: string]: string} = {};
    const rows2 = await db.all('SELECT * FROM reference_properties;');
    for (const row of rows2) {
      const label: string = row.Label;
      propertyTokens[label] = row.Name;
    }
    this.workspaceState.update("property tokens", propertyTokens);

    const fieldAliases: {[key: string]: string} = {};
    const rows6 = await db.all('SELECT * FROM reference_fields;');
    for (const row of rows6) {
      if (row.Property in propertyTokens) {
        fieldAliases[row.Name] = propertyTokens[row.Property];
      } else if (row.Property in entityTokens) {
        fieldAliases[row.Name] = entityTokens[row.Property];
      }
    }
    this.workspaceState.update("field aliases", fieldAliases);

    const tableAliases: {[key: string]: string} = {};
    const rows3 = await db.all('SELECT * FROM reference_tables;');
    for (const row of rows3) {
      tableAliases[row.Name] = entityTokens[row.Entity];
    }
    this.workspaceState.update("table aliases", tableAliases);

    const labelLookup: {[key: string]: string} = {};
    const rows4 = await db.all('SELECT * FROM reference_entities;');
    const rows5 = await db.all('SELECT * FROM reference_properties;');
    for (const row of rows3.concat(rows4.concat(rows5.concat(rows6)))) {
      labelLookup[row.Name] = row.Label;
    }
    this.workspaceState.update('readable labels', labelLookup);
  }

  _clearDefinitionCards() {
    const keys = definitionCards(this.workspaceState);
    for (const key of keys) {
      this.workspaceState.update(key, null);
    }
  }
}

async function selectSchema(workspaceState: vscode.Memento) {
  const directory = vscode.workspace.workspaceFolders ? vscode.Uri.file(vscode.workspace.workspaceFolders[0].uri.path) : undefined;
  const openOptions = {
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    title: 'Select a schema source file',
    openLabel: 'Use this schema',
    defaultUri: directory,
    filters: {'OWL ontology': ['owl'], 'SQLite database': ['sqlite', 'db']}
  }
  const schemaFileUris = await vscode.window.showOpenDialog(openOptions);
  if (schemaFileUris) {
    const path = schemaFileUris[0].path;
    workspaceState.update(schemaPathVar, path)
    vscode.window.showInformationMessage('Using definitions from schema file: ' + path);
  }
  await new SchemaLoader(workspaceState).loadSchema();
}

export function activate(context: vscode.ExtensionContext) {
  const hoverProvider = new DefinitionsHoverProvider(context.workspaceState);
  vscode.languages.registerHoverProvider({scheme: 'file'}, hoverProvider);

  const completionProvider = new FieldsCompletionItemProvider(context.workspaceState);
  vscode.languages.registerCompletionItemProvider({scheme: 'file'}, completionProvider);

  const disposable = vscode.commands.registerCommand(
    'adi-semantic-highlights.select-schema',
    async () => selectSchema(context.workspaceState),
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
