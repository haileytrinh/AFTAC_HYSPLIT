// fullDom: the entire KML document parsed from the KMZ file
// dom: the currently active document element
// images: mapping of image file names to blob URLs for overlays/icons
export const kmz = $state<{
  fullDom: Document | null;
  dom: Element | null;
  images: Record<string, string> | null;
}>({
  fullDom: null,
  dom: null,
  images: null
});

export const timestamp = $state(<{
  index: number;
  times: string[];
}>{
  index: 0, 
  times: []
});