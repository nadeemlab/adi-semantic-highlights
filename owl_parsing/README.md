This source code contains an experimental tool to extract entity/property names and definitions from an OWL ontology.

# Build the CLI program

```sh
mvn clean package assembly:single
```

Use `mvn versions:set -DremoveSnapshot` to get Maven to make simpler JAR file names.

# Usage
You can supply either the URL/IRI for the ontology or the local filename:

```sh
java -jar target/owlextract-0.1-jar-with-dependencies.jar https://purl.obolibrary.org/obo/chmo.owl
```

```sh
wget https://purl.obolibrary.org/obo/chmo.owl
java -jar target/owlextract-0.1-jar-with-dependencies.jar chmo.owl
```

Files `entities.tsv` and `properties.tsv` are written.

# Run in REPL
For debugging interactively, make sure `jshell` is available then use:

```sh
bash mshell.sh
```
