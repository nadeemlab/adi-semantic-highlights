# adi-semantic-highlights

This extension provides tooltips and completions from a given specified relational schema. For the purposes of this extension, a schema is:
- Definitions for entities.
- Definitions for properties.
- List of tables with names.
- List of fields with names.

The schema framework is described in detail here: [https://adiframework.com](https://adiframework.com).

## Features

The tooltips show **full names** and **definitions**, as well as links to external ontologies if annotated in the schema.

![hovering](doc/hovers.gif)

Text completions are available for the **vocabulary** of the schema, and specifically **fields** for given entities/table names using dot-notation.

![completion](doc/completion.gif)


![selectschema](doc/select_schema.gif)

## Settings

The setting `Disable ADI Schema Highlight` is available to turn off all functionality of this extension.

