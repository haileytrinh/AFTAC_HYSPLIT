<script lang="ts">
  import type { JSZipObject } from "jszip";
  import { unzipKML, processKML, processImages } from "./load-kmz";
  import { kmz } from "./state.svelte";
  import {
    findLevelDocuments,
    getDocumentName
  } from "./document-parsing";

  let error_message = '';
  let levelDocs: Element[] = [];
  let selectedIndex = 0;
  let fileName = ('No file chosen');

  // Set the active level by index and update the kmz store
  function setActiveLevel(index: number) {
    if (index < 0 || index >= levelDocs.length) return;

    selectedIndex = index;

    Object.assign(kmz, {
      dom: levelDocs[index]
    });
  }

  // Handle level selection changes from the dropdown
  function handleLevelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    setActiveLevel(Number(target.value));
  }

  async function getData(event: Event) {
  const target = event.target as HTMLInputElement;
  const chosenFile = target.files?.[0];
  if (!chosenFile) return;
  fileName = chosenFile.name;

  let kml: JSZipObject;
  let images: JSZipObject[];
  let kmlDOM: Document;

  error_message = '';
  levelDocs = [];
  selectedIndex = 0;

  Object.assign(kmz, {
    fullDom: null,
    dom: null,
    images: null
  });

  try {
    [kml, images] = await unzipKML(chosenFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    error_message = "Error unzipping KMZ file: " + message;
    return;
  }

  try {
    kmlDOM = await processKML(kml);
    console.log(kmlDOM);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    error_message = "Error parsing KML file: " + message;
    return;
  }

  const parsedLevelDocs = findLevelDocuments(kmlDOM);

  if (parsedLevelDocs.length === 0) {
    error_message = "No atmosphere level folders found in KMZ.";
    return;
  }

  levelDocs = parsedLevelDocs;
  selectedIndex = 0;

  let imageBlobs: Record<string, string>;
  try {
    imageBlobs = await processImages(images);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    error_message = "Error processing images: " + message;
    return;
  }
  
  if (Object.keys(imageBlobs).length == 0) {
    error_message = "Warning: KMZ doesn't contain any images!"
  }

  Object.assign(kmz, {
    fullDom: kmlDOM,
    dom: levelDocs[0],
    images: imageBlobs
  });
}
</script>

<div id="picker-container">
  <span class="file-name">{fileName}</span>
  <label class="file-button">
    {fileName === 'No file chosen' ? 'Choose File' : 'Replace file'}
    <input
      type="file"
      accept=".kmz"
      onchange={getData}
    />
  </label>

  {#if levelDocs.length > 1}
    <select
      bind:value={selectedIndex}
      onchange={handleLevelChange}
    >
      {#each levelDocs as doc, i}
        <option value={i}>
          {getDocumentName(doc)}
        </option>
      {/each}
    </select>
  {/if}

  <div id="error-container">
    {error_message}
  </div>
</div>

<style>
  #picker-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
  }

  .file-name {
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .file-button {
    cursor: pointer;
    background: #4a6fa5;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    color: white;
    white-space: nowrap;
  }

  .file-button input[type="file"] {
    display: none;
  }

  #error-container {
    color: #ff6b6b;
    font-size: 0.8rem;
  }
</style>
