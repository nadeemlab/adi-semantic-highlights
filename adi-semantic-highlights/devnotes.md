
- [DONE] verify current behaviors
- [DONE] do completions
- do lowercase normalization to support variations in case in observed tokens
- also do camelcase normalization?
- handle some easy cases of pluralization
- support owl
- support local table files
- in docs, mention easy access to specific ontology/model examples.
    - scstudies
    - template/toy example, illustrated custom defs from local table files
    - some other owl file. Gene Ontology? 
- do docs
- 


Current expected behaviors:
1. For entity machine name, hover leads to: full name, definition, (optionally) URL.
2. Similarly for property machine name.
3. For a table name, treat as alias for entity and show (1) but with also an "aka" clause.
4. For a field name, *if no previous match was found*, i.e. if not identical to an entity name or a property name or a table name, then treat as an alias for property (in case a defined property is provided for the field), or treat as an alias for the entity (in case a defined entity range type is provided for the field). I think a 3rd option is possible (string or numeric values?), not sure what to do in this case; probably show nothing.
5. All of the above only for those non-space-delimited, snakecase machine-readable identifiers as the trigger in the source text.

Check:
1. Yes.
2. Yes.
3. Yes.
4. Yes.

* Need to try to support the case where the field (i) has an entity value, and (ii) is nevertheless described by a specific property. Example, the field:
   specimen_data_measurement_process.specimen
is (i) valued in Biospecimen entity, as partly reflected in the foreign table/key for this value in the specimen_collection_process table, and (ii) controlled by separate property, biospecimen_analyzed, in order to provide detail regarding the definition of this value as associated to particular instances of the root object.
Full support for this case should make extra-sure that the field is correctly picked out... possibly by consulting a prior token for the table name? Not sure if this is wise.

* Something is wrong with case: "SHA256 hash" as field name. Never registered? Oh, only as completion. So field names weren't added as completions?



Completion cases.

- A partial word is typed.
- A full word is typed.
- A full word is typed plus a property-indicating character (only period?).
- A full word is typed plus a property-indicating character (or space?) and a partial field word for that thing.
- 

