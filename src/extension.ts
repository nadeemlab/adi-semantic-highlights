import * as vscode from 'vscode';

import { FieldsCompletionItemProvider } from './FieldsCompletionItemProvider'
import { DefinitionsHoverProvider } from './DefinitionsHoverProvider';
import { SchemaSelector } from './SchemaSelector';

class Setup {
  context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  setup() {
    this._setupHovering();
    this._setupCompletions();
    this._setupCommands();
  }

  _setupHovering() {
    const hoverProvider = new DefinitionsHoverProvider(this.context.workspaceState);
    vscode.languages.registerHoverProvider({scheme: 'file'}, hoverProvider);
  }

  _setupCompletions() {
    const completionProvider = new FieldsCompletionItemProvider(this.context.workspaceState);
    vscode.languages.registerCompletionItemProvider({scheme: 'file'}, completionProvider);
  }

  _setupCommands() {
    const selector = new SchemaSelector(this.context.workspaceState);
    const disposable = vscode.commands.registerCommand(
      'adi-semantic-highlights.select-schema',
      async () => selector.selectSchema(),
    );
    this.context.subscriptions.push(disposable);
  }
}

export function activate(context: vscode.ExtensionContext) {
  new Setup(context).setup();
}

export function deactivate() {}
