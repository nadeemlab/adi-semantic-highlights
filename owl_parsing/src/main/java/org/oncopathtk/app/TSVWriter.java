package org.oncopathtk.app;

import java.util.Vector;
import java.util.HashMap;
import java.io.FileWriter;
import java.io.IOException;

public class TSVWriter {
    public static void writeMaps(Vector<HashMap<String, String>> maps, String filename, String[] keys, String[] header) {
        Vector<String[]> rows = new Vector<String[]>();
        rows.add(header);
        for (HashMap<String, String> item : maps) {
            String[] row = new String[keys.length];
            for (int i=0; i<keys.length; i++) {
                String key = keys[i];
                if (key == null) {
                    row[i] = "";
                } else {
                    row[i] = item.get(key);
                }
            }
            rows.add(row);
        }
        write(rows, filename);
    }

    public static void write(Vector<String[]> rows, String filename) {
        try {
            FileWriter obj = new FileWriter(filename);
            for (String[] row : rows) {
                String s = String.join("\t", row) + "\n";
                obj.write(s);
            }
            obj.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
