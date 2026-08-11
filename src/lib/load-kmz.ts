import JSZip, { type JSZipObject } from "jszip";


export const MAX_KMZ_SIZE_MB = 100;


export async function unzipKML(kmzFile: File): Promise<[JSZipObject, JSZipObject[]]> {
  // check file is not empty
  if (kmzFile.size === 0) throw new Error('File is empty');
  
  // check file size (accepts <= 100 MB)
  if (kmzFile.size > MAX_KMZ_SIZE_MB * 1024 * 1024) throw new Error('File too large');
  
  // convert to array buffer for testing purposes :sob:
  let kmzData: JSZip;
  try {
    const arrayBuffer = await kmzFile.arrayBuffer();
    kmzData = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error('File is not a valid ZIP/KMZ file');
  }

  let kmlFile: JSZipObject | undefined;
  let images: JSZipObject[] = [];
  
  kmzData.forEach(async function (relativePath, file) {
    if (relativePath.endsWith(".kml")) {
      console.log("found kml!: ", relativePath);
      kmlFile = file;
    } else {
      console.log("found non-kml: ", relativePath);
      images.push(file);
    }
  });
  
  if (typeof kmlFile === "undefined") {
    throw Error("KMZ file did not contain a KML file.");
  } 
  
  return [kmlFile, images];
}

export async function processKML(kmlFile: JSZipObject): Promise<XMLDocument> {
  const kmlText = await kmlFile.async("text");

  const parser = new DOMParser();
  const kmlDOM = parser.parseFromString(kmlText, "application/xml");

  if (kmlDOM.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid KML/XML: parsererror returned");
  }

  return kmlDOM;
}


export async function processImages(images: JSZipObject[]) {
  const parsedImages: Record<string, string> = {};

  for (const image of images) {
    const imageBlob = await image.async("blob");
    parsedImages[image.name] = URL.createObjectURL(imageBlob);
  }

  return parsedImages;
}
