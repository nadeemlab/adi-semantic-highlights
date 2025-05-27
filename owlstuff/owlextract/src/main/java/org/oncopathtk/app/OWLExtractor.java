package org.oncopathtk.app;


import static org.semanticweb.owlapi.search.EntitySearcher.getAnnotationObjects;

import java.io.PrintStream;
import javax.annotation.Nonnull;
import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLAnnotation;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.reasoner.OWLReasoner;
import org.semanticweb.owlapi.reasoner.OWLReasonerFactory;
import org.semanticweb.owlapi.model.OWLEntity;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.model.OWLAnnotationValue;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLAnnotationAssertionAxiom;
import org.semanticweb.owlapi.search.EntitySearcher;

public class OWLExtractor {
    public OWLExtractor(String filename) {
        System.out.println("Using source file: " + filename);

        String reasonerFactoryClassName = null;
        OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
        IRI documentIRI = IRI.create(filename);
        OWLOntology ontology = manager.loadOntologyFromOntologyDocument(documentIRI);
        System.out.println("Ontology Loaded...");
        System.out.println("Document IRI: " + documentIRI);
        System.out.println("Ontology : " + ontology.getOntologyID());
        System.out.println("Format      : " + manager.getOntologyFormat(ontology));
        // / Create a new SimpleHierarchy object with the given reasoner.
        SimpleHierarchyExample simpleHierarchy = new SimpleHierarchyExample(
            (OWLReasonerFactory) Class.forName(reasonerFactoryClassName).newInstance(), ontology);
        // Get Thing
        OWLClass clazz = manager.getOWLDataFactory().getOWLThing();
        System.out.println("Class       : " + clazz);
        // Print the hierarchy below thing
        simpleHierarchy.printHierarchy(clazz);
    }

    public void extract() {
        System.out.println("Extracting.");
    }

    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Supply a .owl file to extract records from.");
            return;
        }
        String filename = args[0];
        OWLExtractor extractor = new OWLExtractor(filename);
        extractor.extract();
    }
}
