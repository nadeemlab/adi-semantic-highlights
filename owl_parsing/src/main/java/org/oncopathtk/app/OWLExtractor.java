package org.oncopathtk.app;

import org.oncopathtk.app.TSVWriter;

import java.io.File;
import java.util.Vector;
import java.util.HashMap;
import java.net.URL;

import org.semanticweb.owlapi.apibinding.OWLManager;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLAnnotationAssertionAxiom;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLEntity;
import org.semanticweb.owlapi.model.OWLOntologyCreationException;

class AssertionWalker {
    String iaoDefinition = "<http://purl.obolibrary.org/obo/IAO_0000115>";
    OWLOntology ontology;

    public AssertionWalker(OWLOntology o) {
        ontology = o;
    }

    public String getLabelName(IRI c) {
        for(OWLAnnotationAssertionAxiom a : ontology.getAnnotationAssertionAxioms(c)) {
            if(a.getProperty().isLabel()) {
                if(a.getValue() instanceof OWLLiteral) {
                    OWLLiteral val = (OWLLiteral) a.getValue();
                    return val.getLiteral();
                }
            }
        }
        return "";
    }

    public String getDefinition(IRI c) {
        for(OWLAnnotationAssertionAxiom a : ontology.getAnnotationAssertionAxioms(c)) {
            if (a.getProperty().toString().equals(iaoDefinition)) {
                return a.getValue().toString();
            }
        }
        return "";
    }
}

class Sanitize {
    public static String machineToken(String s) {
        String pattern = "[^A-Za-z0-9_]";
        return s.replace(" ", "_").replace("-", "_").replaceAll(pattern, "").toLowerCase();
    }

    public static String oneLineText(String s) {
        String pattern = "[^ A-Za-z0-9_\\.\"':<>\\{\\}\\-\\/]";
        return s.replaceAll(pattern, "");
    }
}

class SkimmedObjects {
    public Vector<HashMap<String, String>> entities;
    public Vector<HashMap<String, String>> properties;

    public SkimmedObjects() {
        entities = new Vector<>();
        properties = new Vector<>();
    }
}

class SkimDefinedItems {
    AssertionWalker assertionWalker;
    SkimmedObjects skimmedObjects;

    public SkimDefinedItems(IRI ontologyIRI) throws OWLOntologyCreationException {
        OWLOntologyManager manager = OWLManager.createOWLOntologyManager();
        OWLDataFactory dataFactory = manager.getOWLDataFactory();
        OWLOntology ontology = manager.loadOntologyFromOntologyDocument(ontologyIRI);
        assertionWalker = new AssertionWalker(ontology);
        skimmedObjects = new SkimmedObjects();
        for (OWLEntity e : ontology.getSignature()) {
            skimEntity(e);
        }
    }

    public SkimmedObjects getEntitiesProperties() {
        return skimmedObjects;
    }

    private void skimEntity(OWLEntity e) {
        String elementType = null;
        IRI c = null;
        try {
            c = e.asOWLClass().getIRI();
            elementType = "class";
        } catch(ClassCastException exception) {
            try {
                c = e.asOWLObjectProperty().getIRI();
                elementType = "object property";
            }
            catch(ClassCastException exception2) {
                System.out.println("Not an owl class or object property: " + e.toString());
            }
        }
        if (c == null || elementType == null) {
            return;
        }
        String url = c.toString();
        String crid = c.getShortForm().replace("_", ":");
        String name = assertionWalker.getLabelName(c);
        String machineToken = Sanitize.machineToken(name);
        String definition = assertionWalker.getDefinition(c);
    
        HashMap<String, String> row = new HashMap<String, String>();
        row.put("url", url);
        row.put("crid", crid);
        row.put("name", name);
        row.put("definition", definition);
        row.put("machine token", machineToken);

        if (elementType == "class") {
            skimmedObjects.entities.add(row);
        }
        if (elementType == "object property") {
            skimmedObjects.properties.add(row);
        }
    }
}

class PathValidator {
    public static boolean isValidURL(String urlString) {
        try {
            URL url = new URL(urlString);
            url.toURI();
            String protocol = url.getProtocol();
            if (!protocol.equals("http") && !protocol.equals("https")) {
                return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    };

    public static boolean fileExistsAt(String filePathString) {
        File file = new File(filePathString);
        if(file.exists() && !file.isDirectory()) { 
            return true;
        }
        return false;
    };
}

public class OWLExtractor {
    IRI ontologyIRI;

    public OWLExtractor(String source) {
        if (PathValidator.isValidURL(source)) {
            System.out.println("Valid URI source: " + source);
            ontologyIRI = IRI.create(source);
        } else {
            if (PathValidator.fileExistsAt(source)) {
                System.out.println("Trying local file: " + source);
                ontologyIRI = IRI.create(source);
            }
        }
    }

    public void extract() throws OWLOntologyCreationException {
        SkimDefinedItems s = new SkimDefinedItems(ontologyIRI);
        save(s.getEntitiesProperties());
    }

    private void save(SkimmedObjects o) {
        String[] entityHeader = {"Name", "Label", "Definitional reference", "Definition"};
        String[] entityKeys = {"machine token", "name", "crid", "definition"};
        TSVWriter.writeMaps(o.entities, "entities.tsv", entityKeys, entityHeader);

        String[] propertyHeader = {"Name", "Label", "Entity", "Value type", "Related entity", "Definitional reference", "Definition"};
        String[] propertyKeys = {"machine token", "name", null, null, null, "crid", "definition"};
        TSVWriter.writeMaps(o.properties, "properties.tsv", propertyKeys, propertyHeader);

        System.out.println("Wrote:");
        System.out.println("  entities.tsv");
        System.out.println("  properties.tsv");
    }

    public static void main(String[] args) throws OWLOntologyCreationException {
        if (args.length == 0) {
            System.out.println("Supply an ontology URL or an .owl file to extract records from.");
            return;
        }
        String filename = args[0];
        OWLExtractor extractor = new OWLExtractor(filename);
        extractor.extract();
    }
}
