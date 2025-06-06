import * as vscode from 'vscode';

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import sqlite from 'sqlite'

import { tsvParseRows } from 'd3-dsv';

type DB = sqlite.Database<sqlite3.Database, sqlite3.Statement>;
type KeyValue = {[key: string]: string};

import { DefinitionCard, definitionCard, definitionCards, SQLDefinitionRow } from './types';

export const schemaPathVar = 'extension schema source file path';

const metaschema = `
CREATE TABLE "reference_tables" (
"Name" TEXT,
  "Label" TEXT,
  "Filename" TEXT,
  "Entity" TEXT
);

CREATE TABLE "reference_fields" (
"Name" TEXT,
  "Label" TEXT,
  "Table" TEXT,
  "Property" TEXT,
  "Primary key group" TEXT,
  "Foreign table" TEXT,
  "Foreign key" TEXT,
  "Ordinality" INTEGER
);

CREATE TABLE "reference_entities" (
"Name" TEXT,
  "Label" TEXT,
  "Definitional reference" TEXT,
  "Definition" TEXT
);

CREATE TABLE "reference_properties" (
"Name" TEXT,
  "Label" TEXT,
  "Entity" TEXT,
  "Value type" TEXT,
  "Related entity" TEXT,
  "Definitional reference" TEXT,
  "Definition" TEXT
);
`

export class SchemaLoader {
  workspaceState: vscode.Memento
  dbFilename: string

  constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
    const filename: string | undefined = this.workspaceState.get(schemaPathVar);
    if (typeof filename === 'undefined') {
      throw new Error('Can not load definition texts because no schema file or directory is specified.');
    }
    this.dbFilename = filename;
  }

  async loadSchema() {
    this._clearDefinitionCards();
    this._clearAliases();
    const db = await this._setupSource();
    await this._loadDefinitionCards(db);
    await this._loadAliases(db);
  }

  async _setupSource(): Promise<DB> {
    const metadata = await vscode.workspace.fs.stat(vscode.Uri.file(this.dbFilename));
    if (metadata.type === vscode.FileType.File) {
      console.log('Loading from SQLite file.')
      return await open({
        filename: this.dbFilename,
        driver: sqlite3.Database
      })
    }
    console.log('Loading table files from directory.')
    return await this._loadDBFromFiles();
  }

  async _loadDBFromFiles(): Promise<DB> {
    const db = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    })
    await db.exec(metaschema);
    for (const tableName of ['tables', 'fields', 'entities', 'properties']) {
      const tsvFile = vscode.Uri.joinPath(vscode.Uri.file(this.dbFilename), `${tableName}.tsv`);
      const d = new TextDecoder()
      const contents = d.decode(await vscode.workspace.fs.readFile(tsvFile))
      const parsed = tsvParseRows(contents);
      const blank = this._formTemplate(parsed[0].length);
      let firstLine = true;
      for (const row of parsed) {
        if (firstLine) {
          firstLine = false;
          continue;
        }
        if (tableName == "entities") { console.log(row)}
        if (row.length != parsed[0].length) {
          continue;
        }
        await db.run(`INSERT INTO reference_${tableName} VALUES ${blank} ;`, row);
      }
    }
    return db;
  }

  _formTemplate(length: number): string {
    const entries = new Array(length);
    for (let i=0; i<length; i++) {
      entries[i] = '?'
    }
    return '(' + entries.join(', ') + ')';
  }

  async _loadDefinitionCards(db: DB) {
    const rows1 = await this._getRows(db, 'entities');
    if (rows1 !== null) {
      for (const row of rows1) {
        const card = this._makeDefinitionCard(row, 'entity')
        this.workspaceState.update(definitionCard(card.machineToken), card)
      }
    }

    const rows2 = await this._getRows(db, 'properties');
    if (rows2 !== null) {
      for (const row of rows2) {
        const card = this._makeDefinitionCard(row, 'property')
        if (this._hasKey(definitionCard(card.machineToken))) {
          console.log('When registering properties, encountered already-existing entity key: ' + definitionCard(card.machineToken))
        } else {
          this.workspaceState.update(definitionCard(card.machineToken), card)
        }
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

  async _getRows(db: DB, table: string): Promise<any[] | null> {
    try {
      const rows = await db.all(`SELECT * FROM reference_${table};`);
      return rows;
    } catch (error) {
      console.error(`reference_${table} missing from ${this.dbFilename}`)
      return null;
    }
  }

  async _loadAliases(db: DB) {
    await this._registerMainTokens(db);
    await this._registerAliasesForNormalizedDefinedThings(db);
    await this._registerReadableLabels(db);
    await this._registerFieldsOfThings(db);
  }

  async _registerMainTokens(db: DB){
    const entityTokens: KeyValue = {};
    const rows1 = await this._getRows(db, 'entities');
    if (rows1 !== null) {
      for (const row of rows1) {
        const label: string = row.Label;
        entityTokens[label] = row.Name;
      }
      this.workspaceState.update('entity tokens', entityTokens);
    }

    const propertyTokens: KeyValue = {};
    const rows2 = await this._getRows(db, 'properties');
    if (rows2 !== null) {
      for (const row of rows2) {
        const label: string = row.Label;
        propertyTokens[label] = row.Name;
      }
      this.workspaceState.update('property tokens', propertyTokens);
    }
  }

  async _registerAliasesForNormalizedDefinedThings(db: DB) {
    const entityTokens = this.workspaceState.get<KeyValue>('entity tokens') ;
    const propertyTokens = this.workspaceState.get<KeyValue>('property tokens') ;

    const fieldAliases: KeyValue = {};
    const rows1 = await this._getRows(db, 'fields');
    if (rows1 !== null && entityTokens && propertyTokens) {
      for (const row of rows1) {
        if (row.Property in propertyTokens) {
          fieldAliases[row.Name] = propertyTokens[row.Property];
        } else if (row.Property in entityTokens) {
          fieldAliases[row.Name] = entityTokens[row.Property];
        }
      }
      this.workspaceState.update('field aliases', fieldAliases);
    }

    const rows2 = await this._getRows(db, 'tables');
    if (rows2 !== null && entityTokens) {
      const tableTokens: KeyValue = {};
      const tableAliases: KeyValue = {};
      for (const row of rows2) {
        tableAliases[row.Name] = entityTokens[row.Entity];
        tableTokens[row.Label] = row.Name;
      }
      this.workspaceState.update('table aliases', tableAliases);
      this.workspaceState.update('table tokens', tableTokens);
    }
  }

  async _registerReadableLabels(db: DB) {
    const labelLookup: KeyValue = {};
    const rows1 = await this._getRows(db, 'fields');
    const rows2 = await this._getRows(db, 'tables');
    const rows3 = await this._getRows(db, 'entities');
    const rows4 = await this._getRows(db, 'properties');
    if(rows1 !== null && rows2 !== null && rows3 !== null && rows4 !== null)
    for (const row of rows1.concat(rows2.concat(rows3.concat(rows4)))) {
      labelLookup[row.Name] = row.Label;
    }
    this.workspaceState.update('readable labels', labelLookup);
  }

  async _registerFieldsOfThings(db: DB) {
    const tableTokens = this.workspaceState.get<KeyValue>('table tokens');
    const rows1 = await this._getRows(db, 'fields');
    const rows2 = await this._getRows(db, 'tables');
    const fieldsOfThings: {[key: string]: string[]} = {};
    if (rows2 !== null) {
      for (const row of rows2) {
        fieldsOfThings[row.Name] = [];
      }
    }
    if (rows1 !== null && tableTokens) {
      for (const row of rows1) {
        fieldsOfThings[tableTokens[row.Table]].push(row.Name);
      }
    }
    this.workspaceState.update('fields of things', fieldsOfThings);
  }

  _clearDefinitionCards() {
    const keys = definitionCards(this.workspaceState);
    for (const key of keys) {
      this.workspaceState.update(key, undefined);
    }
  }

  _clearAliases() {
    const keys = ['field aliases', 'table aliases', 'table tokens', 'readable labels', 'fields of things']
    for (const key of keys) {
      this.workspaceState.update(key, undefined);
    }
  }
}