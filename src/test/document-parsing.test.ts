// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import {
  getTopDocument,
  getDirectContainerChildren,
  getDocumentName,
  isTimestampDoc,
  findLevelDocuments
} from "../lib/document-parsing";

function makeKMLDocument(xml: string): Document {
  return new DOMParser().parseFromString(xml, "text/xml");
}

describe("documentParsing helpers", () => {
  test("getTopDocument returns the top-level Document node", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <name>Main Root</name>
        </Document>
      </kml>
    `);

    const top = getTopDocument(doc);

    expect(top).not.toBeNull();
    expect(top?.tagName).toBe("Document");
    expect(getDocumentName(top!)).toBe("Main Root");
  });

  test("getTopDocument returns null when no top-level Document exists", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Folder>
          <name>No Top Document</name>
        </Folder>
      </kml>
    `);

    expect(getTopDocument(doc)).toBeNull();
  });

  test("getDirectContainerChildren returns only direct Folder/Document children", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <Folder><name>Level A</name></Folder>
          <Placemark><name>Ignore Me</name></Placemark>
          <Document><name>Nested Doc</name></Document>
        </Document>
      </kml>
    `);

    const top = getTopDocument(doc)!;
    const children = getDirectContainerChildren(top);

    expect(children).toHaveLength(2);
    expect(children.map((node) => node.tagName)).toEqual(["Folder", "Document"]);
    expect(children.map((node) => getDocumentName(node))).toEqual(["Level A", "Nested Doc"]);
  });

  test("getDocumentName strips literal <pre> tags from names", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <name>&lt;pre&gt;Concentration (Valid:20250110 0100UTC)&lt;/pre&gt;</name>
        </Document>
      </kml>
    `);

    const top = getTopDocument(doc)!;
    expect(getDocumentName(top)).toBe("Concentration (Valid:20250110 0100UTC)");
  });

  test("isTimestampDoc returns true for concentration timestamp folders", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <Folder>
            <name>Concentration (Valid:20250110 0100UTC)</name>
          </Folder>
        </Document>
      </kml>
    `);

    const folder = doc.querySelector("Folder") as Element;
    expect(isTimestampDoc(folder)).toBe(true);
  });

  test("isTimestampDoc returns false for non-timestamp folders", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <Folder>
            <name>Source Locations</name>
          </Folder>
        </Document>
      </kml>
    `);

    const folder = doc.querySelector("Folder") as Element;
    expect(isTimestampDoc(folder)).toBe(false);
  });

  test("findLevelDocuments finds atmosphere level folders whose direct children are timestamp docs", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <Folder>
            <name>1000m</name>
            <Folder>
              <name>Concentration (Valid:20250110 0100UTC)</name>
            </Folder>
            <Folder>
              <name>Concentration (Valid:20250110 0200UTC)</name>
            </Folder>
          </Folder>

          <Folder>
            <name>2000m</name>
            <Folder>
              <name>Concentration (Valid:20250110 0100UTC)</name>
            </Folder>
          </Folder>

          <Folder>
            <name>Source Locations</name>
            <Placemark>
              <name>Point A</name>
            </Placemark>
          </Folder>
        </Document>
      </kml>
    `);

    const levelDocs = findLevelDocuments(doc);

    expect(levelDocs).toHaveLength(2);
    expect(levelDocs.map((node) => getDocumentName(node))).toEqual(["1000m", "2000m"]);
  });

  test("findLevelDocuments ignores leaf folders that are not atmosphere levels", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <Folder>
            <name>Source Locations</name>
            <Placemark>
              <name>Point A</name>
            </Placemark>
          </Folder>

          <Folder>
            <name>Weather Data</name>
            <Placemark>
              <name>Weather Overlay</name>
            </Placemark>
          </Folder>
        </Document>
      </kml>
    `);

    const levelDocs = findLevelDocuments(doc);

    expect(levelDocs).toHaveLength(0);
  });

  test("findLevelDocuments works across multiple nesting levels", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Document>
          <Folder>
            <name>Outer Wrapper</name>
            <Document>
              <name>0 to 1000m</name>
              <Folder>
                <name>Concentration (Valid:20250110 0100UTC)</name>
              </Folder>
              <Folder>
                <name>Concentration (Valid:20250110 0200UTC)</name>
              </Folder>
            </Document>
          </Folder>
        </Document>
      </kml>
    `);

    const levelDocs = findLevelDocuments(doc);

    expect(levelDocs).toHaveLength(1);
    expect(getDocumentName(levelDocs[0])).toBe("0 to 1000m");
  });

  test("findLevelDocuments returns empty array when there is no top-level Document", () => {
    const doc = makeKMLDocument(`
      <kml>
        <Folder>
          <name>Lonely Folder</name>
        </Folder>
      </kml>
    `);

    expect(findLevelDocuments(doc)).toEqual([]);
  });
});
