// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest"
import { MAX_KMZ_SIZE_MB, unzipKML, processKML, processImages } from "../lib/load-kmz";
import { resolve } from 'path';
import { readFileSync } from 'fs';
import JSZip from "jszip";


const happyKMZ = "../../public/test_data/HYSPLIT_simple.kmz";


// avoid repeating file-loading bc my eyes hurt ^ ^
// call 'const [kml, images] = await unzipKML(loadTestKMZ(happyKMZ));' when needed
function loadTestKMZ(relativePath: string): File {
  const filePath = resolve(__dirname, relativePath);
  const fileBuffer = readFileSync(filePath);
  return new File([fileBuffer], "test.kmz", { type: 'application/vnd.google-earth.kmz' });
}


describe('US-01: KMZ File Upload', () => {

  describe('unzipKML', () => {
    test('accepts kmz files', async () => {
      const [kml, images] = await unzipKML(loadTestKMZ(happyKMZ));
      expect(kml.name).toBe("HYSPLIT_24340.kml"); // TODO: change to any file that ends with .kml
    });

    test('returns a KML JSZipObject and images array', async () => {
      const [kml, images] = await unzipKML(loadTestKMZ(happyKMZ));
      expect(kml).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
    });

    test('upload completes within 5 seconds', async () => {
      const testFile = loadTestKMZ(happyKMZ); // TODO: test with more complex files, may have to change AC or optimize upload
      const start = Date.now();
      await unzipKML(testFile);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  // processImages and processKML tests
  describe("processKML", () => {
    test("parses KML into an XMLDocument with <kml> root", async () => {
      const [kml] = await unzipKML(loadTestKMZ(happyKMZ));
      const doc = await processKML(kml);

      expect(doc).toBeTruthy();
      expect(doc.documentElement.nodeName.toLowerCase()).toBe("kml");
    });

    test("rejects malformed KML/XML", async () => {
      const badKml = {
        async: async (type: string) => {
          if (type !== "text") throw new Error("unexpected type");
          return "<kml><broken></kml>";
        },
      };

      await expect(processKML(badKml as any)).rejects.toThrow(
        "Invalid KML/XML: parsererror returned"
      );
    });
  });

  describe("processImages", () => {
    test("returns imageName -> blobUrl mapping", async () => {
      const [, files] = await unzipKML(loadTestKMZ(happyKMZ));
      const images = files.filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f.name));

      expect(images.length).toBeGreaterThan(0);

      const createObjectURLSpy = vi.fn();
      vi.stubGlobal("URL", {
        ...(globalThis.URL ?? {}),
        createObjectURL: createObjectURLSpy,
      });

      let i = 0;
      createObjectURLSpy.mockImplementation(() => `blob:mock-${i++}`);

      const mapping = await processImages(images);

      expect(Object.keys(mapping).length).toBe(images.length);
      expect(mapping).toHaveProperty("logocon.gif");
      expect(mapping["logocon.gif"]).toMatch(/^blob:mock-/);
      expect(createObjectURLSpy).toHaveBeenCalledTimes(images.length);

      vi.unstubAllGlobals();
    });
  });
});

describe('US-02: File Validation', () => {

  describe('File Size', () => {
    test('rejects KMZ files over 100 megabytes', async () => {
      const bigContent = 'x'.repeat((MAX_KMZ_SIZE_MB+1) * 1024 * 1024);
      const zip = new JSZip();
      zip.file('doc.kml', bigContent);
      const blob = await zip.generateAsync({ type: 'blob' });
      const bigFile = new File([blob], 'big.kmz', { type: 'application/vnd.google-earth.kmz' });
      await expect(unzipKML(bigFile)).rejects.toThrow('File too large');
    }, 10000);
  });

  describe('Invalid Format', () => {
    test('rejects a plain text file passed as KMZ', async () => {
      const fakeFile = new File(['this is not a zip'], 'fake.kmz', { type: 'application/vnd.google-earth.kmz' });
      await expect(unzipKML(fakeFile)).rejects.toThrow('File is not a valid ZIP/KMZ file');
    });

    test('rejects a zip with no KML inside', async () => {
      const zip = new JSZip();
      zip.file('readme.txt', 'no kml here');
      const blob = await zip.generateAsync({ type: 'blob' });
      const noKmlFile = new File([blob], 'nokml.kmz');
      await expect(unzipKML(noKmlFile)).rejects.toThrow('KMZ file did not contain a KML file.');
    });

    test('rejects an empty file', async () => {
      const emptyFile = new File([], 'empty.kmz', { type: 'application/vnd.google-earth.kmz' });
      await expect(unzipKML(emptyFile)).rejects.toThrow('File is empty');
    });

    test('rejects corrupted KMZ (random bytes)', async () => {
      const corruptedBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0xFF, 0xFE]);
      const corruptedFile = new File([corruptedBytes], 'corrupted.kmz', { type: 'application/vnd.google-earth.kmz' });
      await expect(unzipKML(corruptedFile)).rejects.toThrow('File is not a valid ZIP/KMZ file');
    });
  });

});
