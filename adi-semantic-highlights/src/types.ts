import * as vscode from 'vscode';

interface HyperReference {
  text: string
  url: string
}

export interface DefinitionCard {
  machineToken: string
  name: string
  type: 'entity' | 'property'
  definition: string
  href?: HyperReference
}

export interface SQLDefinitionRow {
  Name: string
  Label: string
  Definition: string
  'Definitional reference': string
}

export function definitionCard(name: string): string {
  return 'Definition card: ' + name;
}

export function definitionCards(workspaceState: vscode.Memento) {
  const card = new RegExp('^' + definitionCard(''))
  return workspaceState.keys().filter((item) => card.test(item));
}
