
// IRI definition = IRI.create("http://purl.obolibrary.org/obo/IAO_0000115");
String definition = "<http://purl.obolibrary.org/obo/IAO_0000115>";

OWLDataFactory dataFactory = manager.getOWLDataFactory();
for (OWLEntity e : ontology.getSignature()) {
    OWLClass cls;
    try {
        cls = e.asOWLClass();
    } catch(ClassCastException ex) {
        continue;
    }
    IRI c = cls.getIRI();
    System.out.println(c);
    for(OWLAnnotationAssertionAxiom a : ontology.getAnnotationAssertionAxioms(c)) {
        if(a.getProperty().isLabel()) {
            if(a.getValue() instanceof OWLLiteral) {
                OWLLiteral val = (OWLLiteral) a.getValue();
                System.out.println("    " + val.getLiteral());
            }
        }
        // System.out.println(c + " --> " + a.getValue().toString());
    }

    for(OWLAnnotationAssertionAxiom a : ontology.getAnnotationAssertionAxioms(c)) {
        if (a.getProperty().toString().equals(definition)) {
            System.out.println("    " + a.getValue().toString());
            System.out.println("    " + a.getValue());
        }
    }
    System.out.println("");
}


OWLClass cls = e.asOWLClass();
IRI c = cls.getIRI();
for (OWLAnnotation annotation : c.getAnnotations(ontology, dataFactory.getRDFSLabel())) {
  if (annotation.getValue() instanceof OWLLiteral) {
    OWLLiteral val = (OWLLiteral) annotation.getValue();
    System.out.println(c + " labelled " + val.getLiteral());
   }
}

OWLClass cls = e.asOWLClass();
IRI c = cls.getIRI();
for(OWLAnnotationAssertionAxiom a : ontology.getAnnotationAssertionAxioms(c)) {
    if(a.getProperty().isLabel()) {
        if(a.getValue() instanceof OWLLiteral) {
            OWLLiteral val = (OWLLiteral) a.getValue();
            System.out.println(c + " labelled " + val.getLiteral());
        }
    }
}
