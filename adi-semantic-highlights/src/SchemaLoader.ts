import * as vscode from 'vscode';

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

import { DefinitionCard, definitionCard, definitionCards, SQLDefinitionRow } from './types';

export const schemaPathVar = 'extension schema source file path';

export class SchemaLoader {
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
    this.workspaceState.update('entity tokens', entityTokens);

    const propertyTokens: {[key: string]: string} = {};
    const rows2 = await db.all('SELECT * FROM reference_properties;');
    for (const row of rows2) {
      const label: string = row.Label;
      propertyTokens[label] = row.Name;
    }
    this.workspaceState.update('property tokens', propertyTokens);

    const fieldAliases: {[key: string]: string} = {};
    const rows6 = await db.all('SELECT * FROM reference_fields;');
    for (const row of rows6) {
      if (row.Property in propertyTokens) {
        fieldAliases[row.Name] = propertyTokens[row.Property];
      } else if (row.Property in entityTokens) {
        fieldAliases[row.Name] = entityTokens[row.Property];
      }
    }
    this.workspaceState.update('field aliases', fieldAliases);

    const tableTokens: {[key: string]: string} = {}
    const tableAliases: {[key: string]: string} = {};
    const rows3 = await db.all('SELECT * FROM reference_tables;');
    for (const row of rows3) {
      tableAliases[row.Name] = entityTokens[row.Entity];
      tableTokens[row.Label] = row.Name;
    }
    this.workspaceState.update('table aliases', tableAliases); // need a reverse lookup of this, to support the "fields of" thing below

    const labelLookup: {[key: string]: string} = {};
    const rows4 = await db.all('SELECT * FROM reference_entities;');
    const rows5 = await db.all('SELECT * FROM reference_properties;');
    for (const row of rows3.concat(rows4.concat(rows5.concat(rows6)))) {
      labelLookup[row.Name] = row.Label;
    }
    this.workspaceState.update('readable labels', labelLookup);

    const fieldsOfThings: {[table: string]: string[]} = {};
    for (const row of rows3) {
      fieldsOfThings[row.Name] = [];
    }
    for (const row of rows6) {
      fieldsOfThings[tableTokens[row.Table]].push(row.Name);
    }
    this.workspaceState.update('fields of things', fieldsOfThings);
  }

  _clearDefinitionCards() {
    const keys = definitionCards(this.workspaceState);
    for (const key of keys) {
      this.workspaceState.update(key, undefined);
    }
  }
}