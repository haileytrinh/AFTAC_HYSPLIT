type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

type Feature = {
  type: "Feature";
  properties: Record<string, any>;
  geometry: Geometry;
};

type Geometry =
  | { type: "Point"; coordinates: number[] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "GeometryCollection"; geometries: Geometry[] };

type StyleProps = {
  stroke?: string;
  "stroke-opacity"?: number;
  "stroke-width"?: number;
  fill?: string;
  "fill-opacity"?: number;
};

function childElements(el: Element): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i];
    if (n.nodeType === 1) out.push(n as Element);
  }
  return out;
}

function local(el: Element): string {
  return el.localName || el.tagName;
}

function textTrim(el: Element | null | undefined): string | null {
  const t = el?.textContent?.trim();
  return t && t.length ? t : null;
}

function firstChild(el: Element, name: string): Element | null {
  for (const c of childElements(el)) {
    if (local(c) === name) return c;
  }
  return null;
}

function descendantsByLocalName(root: ParentNode, name: string): Element[] {
  const all = Array.from((root as any).getElementsByTagName?.("*") ?? []) as Element[];
  return all.filter((e) => local(e) === name);
}

export function parseCoordinates(coordText: string): number[][] {
  if (!coordText) return [];
  return coordText
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [lonS, latS] = tok.split(",");
      const lon = parseFloat(lonS);
      const lat = parseFloat(latS);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return [lon, lat];
    })
    .filter((x): x is number[] => x !== null);
}

// KML color is AABBGGRR
export function kmlColorToHexOpacity(kmlHex: string): { hex: string; opacity: number } | null {
  const s = (kmlHex || "").trim();
  if (!/^[0-9a-fA-F]{8}$/.test(s)) return null;

  const aa = parseInt(s.slice(0, 2), 16);
  const bb = s.slice(2, 4);
  const gg = s.slice(4, 6);
  const rr = s.slice(6, 8);

  return {
    hex: (`#${rr}${gg}${bb}`).toLowerCase(),
    opacity: aa / 255,
  };
}

export function parseStyles(docEl: Element): Map<string, StyleProps> {
  const map = new Map<string, StyleProps>();

  for (const styleEl of descendantsByLocalName(docEl, "Style")) {
    let id = styleEl.getAttribute("id");
    if (!id) id = "";

    const props: StyleProps = {};

    const lineStyle = firstChild(styleEl, "LineStyle");
    if (lineStyle) {
      const c = textTrim(firstChild(lineStyle, "color"));
      const w = textTrim(firstChild(lineStyle, "width"));

      if (c) {
        const conv = kmlColorToHexOpacity(c);
        if (conv) {
          props.stroke = conv.hex;
          props["stroke-opacity"] = conv.opacity;
        }
      }
      if (w && Number.isFinite(parseFloat(w))) {
        props["stroke-width"] = parseFloat(w);
      }
    }

    const polyStyle = firstChild(styleEl, "PolyStyle");
    if (polyStyle) {
      const c = textTrim(firstChild(polyStyle, "color"));
      const fillFlag = textTrim(firstChild(polyStyle, "fill"));

      if (c) {
        const conv = kmlColorToHexOpacity(c);
        if (conv) {
          props.fill = conv.hex;
          props["fill-opacity"] = conv.opacity;
        }
      }
      if (fillFlag === "0") {
        props["fill-opacity"] = 0;
      }
    }
    
    map.set(id, props);
  }

  return map;
}

export function parseTimeSpanProps(pm: Element): Record<string, any> {
  const ts = descendantsByLocalName(pm, "TimeSpan")[0];
  if (!ts) return {};

  const begin = textTrim(firstChild(ts, "begin"));
  const end = textTrim(firstChild(ts, "end"));

  if (!begin && !end) return {};
  return { timespan: { ...(begin ? { begin } : {}), ...(end ? { end } : {}) } };
}

export function parsePoint(pointEl: Element): Geometry | null {
  const coordsEl = descendantsByLocalName(pointEl, "coordinates")[0];
  const coordsText = textTrim(coordsEl);
  if (!coordsText) return null;

  const coords = parseCoordinates(coordsText);
  if (!coords.length) return null;

  return { type: "Point", coordinates: coords[0] };
}

export function parseLineString(lsEl: Element): Geometry | null {
  const coordsEl = descendantsByLocalName(lsEl, "coordinates")[0];
  const coordsText = textTrim(coordsEl);
  if (!coordsText) return null;

  const coords = parseCoordinates(coordsText);
  if (!coords.length) return null;

  return { type: "LineString", coordinates: coords };
}

export function parsePolygon(polyEl: Element): Geometry | null {
  const rings: number[][][] = [];

  const outerBoundary = descendantsByLocalName(polyEl, "outerBoundaryIs")[0];
  if (outerBoundary) {
    const lr = descendantsByLocalName(outerBoundary, "LinearRing")[0];
    const coordsEl = lr ? descendantsByLocalName(lr, "coordinates")[0] : null;
    const coordsText = textTrim(coordsEl);
    if (coordsText) {
      const ring = parseCoordinates(coordsText);
      if (ring.length) rings.push(ring);
    }
  }

  for (const innerBoundary of descendantsByLocalName(polyEl, "innerBoundaryIs")) {
    const lr = descendantsByLocalName(innerBoundary, "LinearRing")[0];
    const coordsEl = lr ? descendantsByLocalName(lr, "coordinates")[0] : null;
    const coordsText = textTrim(coordsEl);
    if (coordsText) {
      const ring = parseCoordinates(coordsText);
      if (ring.length) rings.push(ring);
    }
  }

  if (!rings.length) return null;
  return { type: "Polygon", coordinates: rings };
}

export function parseMultiGeometry(mgEl: Element): Geometry | null {
  const geoms: Geometry[] = [];

  for (const child of childElements(mgEl)) {
    const tag = local(child);

    let g: Geometry | null = null;
    if (tag === "Point") g = parsePoint(child);
    else if (tag === "LineString") g = parseLineString(child);
    else if (tag === "Polygon") g = parsePolygon(child);
    else if (tag === "MultiGeometry") g = parseMultiGeometry(child);

    if (g) geoms.push(g);
  }

  if (!geoms.length) return null;
  if (geoms.length === 1) return geoms[0];
  return { type: "GeometryCollection", geometries: geoms };
}

function parseGeometry(pm: Element): Geometry | null {
  const mg = descendantsByLocalName(pm, "MultiGeometry")[0];
  if (mg) return parseMultiGeometry(mg);

  const pt = descendantsByLocalName(pm, "Point")[0];
  if (pt) return parsePoint(pt);

  const ls = descendantsByLocalName(pm, "LineString")[0];
  if (ls) return parseLineString(ls);

  const poly = descendantsByLocalName(pm, "Polygon")[0];
  if (poly) return parsePolygon(poly);

  return null;
}

export function toGeoJson(rootEl: Element) {
  const docEl =
    (local(rootEl) === "Document" || local(rootEl) === "Folder")
      ? rootEl
      : descendantsByLocalName(rootEl, "Document")[0] ?? rootEl;

  const styleMap = parseStyles(docEl);
  const placemarks = descendantsByLocalName(docEl, "Placemark");

  const features: Feature[] = [];

  for (const pm of placemarks) {
    const geometry = parseGeometry(pm);
    if (!geometry) continue;

    const properties: Record<string, any> = {};

    const name = textTrim(descendantsByLocalName(pm, "name")[0]);
    if (name) properties.name = name;

    const style = descendantsByLocalName(pm, "Style");
    if (style) Object.assign(properties, parseStyles(pm).get(""));

    Object.assign(properties, parseTimeSpanProps(pm));

    const styleUrl = textTrim(descendantsByLocalName(pm, "styleUrl")[0]);
    if (styleUrl?.startsWith("#")) {
      const styleId = styleUrl.slice(1);
      const styleProps = styleMap.get(styleId);
      if (styleProps) Object.assign(properties, styleProps);
      properties.styleUrl = styleUrl; // optional
    }

    const desc = textTrim(descendantsByLocalName(pm, "description")[0]);
    if (desc) properties.description = desc;

    features.push({ type: "Feature", properties, geometry });
  }

  return { type: "FeatureCollection", features };
}