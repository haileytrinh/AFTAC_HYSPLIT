// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest"
import { unzipKML, processKML } from "../lib/load-kmz";
import { kmlColorToHexOpacity, parseLineString, parseMultiGeometry, parsePoint, parsePolygon, parseStyles, parseTimeSpanProps, toGeoJson } from "../lib/convert-to-geojson";
import { parseCoordinates } from "../lib/convert-to-geojson";

function parseXML(xml: string): XMLDocument {
  return new DOMParser().parseFromString(xml, "application/xml");
}

describe("US-05: Interactive Map Display", () => {
    describe("Convert KML to GeoJSON", () => {
        describe("test parseCoordinates", () => {
            test("Parses a single coord pair", () => {
                const result = parseCoordinates("-96.78,32.77,0");
                expect(result).toEqual([
                    [-96.78, 32.77]
                ]);
            });

            test("Parses multiple coord pairs", () => {
                const result = parseCoordinates("-96.78,32.77,0 -97.00,33.00,0");
                expect(result).toEqual([
                    [-96.78, 32.77],
                    [-97.00, 33.00]
                ]);
            });

            test("Handles extra whitespace", () => {
                const result = parseCoordinates("  -96.78,32.77,0   -97.00,33.00,0  ");
                expect(result).toEqual([
                    [-96.78, 32.77],
                    [-97.00, 33.00]
                ]);
            });

            test("Skips invalid coordinate pairs", () => {
                const result = parseCoordinates("-96.78,32.77,0 aaa,bbb,ccc -97.00,33.00,0");
                expect(result).toEqual([
                    [-96.78, 32.77],
                    [-97.00, 33.00]
                ]);
            });

            test("Returns empty array for empty input", () => {
                const result = parseCoordinates("");
                expect(result).toEqual([]);
            });
        });

        describe("test kmlColorToHexOpacity", () => {
            test("Converts KML color to hex and opacity", () => {
                const result = kmlColorToHexOpacity("C8D3AEBE");
                expect(result).toEqual({
                    hex: "#beaed3",
                    opacity: parseInt("C8", 16) / 255
                });
            });

            test("Handles fully opaque color", () => {
                const result = kmlColorToHexOpacity("FF0000FF");
                expect(result).toEqual({
                    hex: "#ff0000",
                    opacity: 1
                });
            });

            test("Handles fully transparent color", () => {
                const result = kmlColorToHexOpacity("00000000");
                expect(result).toEqual({
                    hex: "#000000",
                    opacity: 0
                });
            });

            test("Returns null for too short string", () => {
                const result = kmlColorToHexOpacity("1234567");
                expect(result).toBeNull();
            });

            test("Returns null for too long string", () => {
                const result = kmlColorToHexOpacity("123456789");
                expect(result).toBeNull();
            });

            test("Returns null for non-hex characters", () => {
                const result = kmlColorToHexOpacity("ZZZZZZZZ");
                expect(result).toBeNull();
            });

            test("Handles lowercase hex", () => {
                const result = kmlColorToHexOpacity("c8d3aebe");
                expect(result).toEqual({
                    hex: "#beaed3",
                    opacity: parseInt("C8", 16) / 255
                });
            });

            test("Handles empty string", () => {
                const result = kmlColorToHexOpacity("");
                expect(result).toBeNull();
            });
        });

        describe("test parsePoint", () => {
            test("Parses Point geometry from KML", () => {
                const kmlDOM = parseXML(`
                    <Point>
                        <coordinates>-96.78,32.77,0</coordinates>
                    </Point>
                `);

                const pointEl = kmlDOM.documentElement;
                const result = parsePoint(pointEl);
                
                expect(result).toEqual({
                    type: "Point",
                    coordinates: [-96.78, 32.77]
                });
            });

            test("Returns null for missing coordinates", () => {
                const kmlDOM = parseXML(`
                    <Point>
                    </Point>
                `);

                const pointEl = kmlDOM.documentElement;
                const result = parsePoint(pointEl);

                expect(result).toBeNull();
            });

            test("Returns null for empty coordinates", () => {
                const kmlDOM = parseXML(`
                    <Point>
                        <coordinates>   </coordinates>
                    </Point>
                `);

                const pointEl = kmlDOM.documentElement;
                const result = parsePoint(pointEl);
                
                expect(result).toBeNull();
            });

            test("Handles invalid coordinate format", () => {
                const kmlDOM = parseXML(`
                    <Point>
                        <coordinates>invalid</coordinates>
                    </Point>
                `);

                const pointEl = kmlDOM.documentElement;
                const result = parsePoint(pointEl);

                expect(result).toBeNull();
            });
        });

        describe("test parseLineString", () => {
            test("Parses LineString geometry from KML", () => {
                const kmlDOM = parseXML(`
                    <LineString>
                        <coordinates>-96.78,32.77,0 -97.00,33.00,0</coordinates>
                    </LineString>
                `);

                const lsEl = kmlDOM.documentElement;
                const result = parseLineString(lsEl);

                expect(result).toEqual({
                    type: "LineString",
                    coordinates: [
                        [-96.78, 32.77],
                        [-97.00, 33.00]
                    ]
                });
            });

            test("Returns null for missing coordinates", () => {
                const kmlDOM = parseXML(`
                    <LineString>
                    </LineString>
                `);

                const lsEl = kmlDOM.documentElement;
                const result = parseLineString(lsEl);

                expect(result).toBeNull();
            });

            test("Handles invalid coordinate format", () => {
                const kmlDOM = parseXML(`
                    <LineString>
                        <coordinates>invalid</coordinates>
                    </LineString>
                `);

                const lsEl = kmlDOM.documentElement;
                const result = parseLineString(lsEl);

                expect(result).toBeNull();
            });
        });

        describe("test parsePolygon", () => {
            test("Parses Polygon with outer boundary", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toEqual({
                    type: "Polygon",
                    coordinates: [
                        [
                            [-96.78, 32.77],
                            [-97.00, 33.00],
                            [-97.00, 32.00],
                            [-96.78, 32.77]
                        ]
                    ]
                });
            });

            test("Parses Polygon with inner boundary", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                        <innerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.50,32.50,0 -96.50,32.80,0 -96.80,32.80,0 -96.50,32.50,0</coordinates>
                            </LinearRing>
                        </innerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toEqual({
                    type: "Polygon",
                    coordinates: [
                        [
                            [-96.78, 32.77],
                            [-97.00, 33.00],
                            [-97.00, 32.00],
                            [-96.78, 32.77]
                        ],
                        [
                            [-96.50, 32.50],
                            [-96.50, 32.80],
                            [-96.80, 32.80],
                            [-96.50, 32.50]
                        ]
                    ]
                });
            });

            test("Parses Polygon with multiple inner boundaries", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                        <innerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.50,32.50,0 -96.50,32.80,0 -96.80,32.80,0 -96.50,32.50,0</coordinates>
                            </LinearRing>
                        </innerBoundaryIs>
                        <innerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.20,32.20,0 -96.20,32.40,0 -96.40,32.40,0 -96.20,32.20,0</coordinates>
                            </LinearRing>
                        </innerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toEqual({
                    type: "Polygon",
                    coordinates: [
                        [
                            [-96.78, 32.77],
                            [-97.00, 33.00],
                            [-97.00, 32.00],
                            [-96.78, 32.77]
                        ],
                        [
                            [-96.50, 32.50],
                            [-96.50, 32.80],
                            [-96.80, 32.80],
                            [-96.50, 32.50]
                        ],
                        [
                            [-96.20, 32.20],
                            [-96.20, 32.40],
                            [-96.40, 32.40],
                            [-96.20, 32.20]
                        ]
                    ]
                });
            });

            test("Returns null for missing boundaries", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toBeNull();
            });

            test("Returns null for missing LinearRing", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                        </outerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toBeNull();
            });

            test("Handles invalid coordinate format", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>invalid</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toBeNull();
            });

            test("Handles missing linear ring in inner boundary", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                        <innerBoundaryIs>
                        </innerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toEqual({
                    type: "Polygon",
                    coordinates: [
                        [
                            [-96.78, 32.77],
                            [-97.00, 33.00],
                            [-97.00, 32.00],
                            [-96.78, 32.77]
                        ]
                    ]
                });
            });

            test("Handles missing coordinates in inner boundary", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                        <innerBoundaryIs>
                            <LinearRing>
                            </LinearRing>
                        </innerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toEqual({
                    type: "Polygon",
                    coordinates: [
                        [
                            [-96.78, 32.77],
                            [-97.00, 33.00],
                            [-97.00, 32.00],
                            [-96.78, 32.77]
                        ]
                    ]
                });
            });

            test("Handles invalid coordinate format in inner boundary", () => {
                const kmlDOM = parseXML(`
                    <Polygon>
                        <outerBoundaryIs>
                            <LinearRing>
                                <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                            </LinearRing>
                        </outerBoundaryIs>
                        <innerBoundaryIs>
                            <LinearRing>
                                <coordinates>invalid</coordinates>
                            </LinearRing>
                        </innerBoundaryIs>
                    </Polygon>
                `);

                const polygonEl = kmlDOM.documentElement;
                const result = parsePolygon(polygonEl);

                expect(result).toEqual({
                    type: "Polygon",
                    coordinates: [
                        [
                            [-96.78, 32.77],
                            [-97.00, 33.00],
                            [-97.00, 32.00],
                            [-96.78, 32.77]
                        ]
                    ]
                });
            });
        });

        describe("test parseMultiGeometry", () => {
            test("Parses MultiGeometry with Point and LineString", () => {
                const kmlDOM = parseXML(`
                    <MultiGeometry>
                        <Point>
                            <coordinates>-96.78,32.77,0</coordinates>
                        </Point>
                        <LineString>
                            <coordinates>-96.78,32.77,0 -97.00,33.00,0</coordinates>
                        </LineString>
                    </MultiGeometry>
                `);

                const multiGeometryEl = kmlDOM.documentElement;
                const result = parseMultiGeometry(multiGeometryEl);

                expect(result).toEqual({
                    type: "GeometryCollection",
                    geometries: [
                        {
                            type: "Point",
                            coordinates: [-96.78, 32.77]
                        },
                        {
                            type: "LineString",
                            coordinates: [
                                [-96.78, 32.77],
                                [-97.00, 33.00]
                            ]
                        }
                    ]
                });
            });

            test("Parses MultiGeometry with Polygons", () => {
                const kmlDOM = parseXML(`
                    <MultiGeometry>
                        <Polygon>
                            <outerBoundaryIs>
                                <LinearRing>
                                    <coordinates>-96.78,32.77,0 -97.00,33.00,0 -97.00,32.00,0 -96.78,32.77,0</coordinates>
                                </LinearRing>
                            </outerBoundaryIs>
                        </Polygon>
                        <Polygon>
                            <outerBoundaryIs>
                                <LinearRing>
                                    <coordinates>-96.50,32.50,0 -96.80,32.80,0 -96.80,32.20,0 -96.50,32.50,0</coordinates>
                                </LinearRing>
                            </outerBoundaryIs>
                        </Polygon>
                    </MultiGeometry>
                `);

                const multiGeometryEl = kmlDOM.documentElement;
                const result = parseMultiGeometry(multiGeometryEl);

                expect(result).toEqual({
                    type: "GeometryCollection",
                    geometries: [
                        {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-96.78, 32.77],
                                    [-97.00, 33.00],
                                    [-97.00, 32.00],
                                    [-96.78, 32.77]
                                ]
                            ]
                        },
                        {
                            type: "Polygon",
                            coordinates: [
                                [
                                    [-96.50, 32.50],
                                    [-96.80, 32.80],
                                    [-96.80, 32.20],
                                    [-96.50, 32.50]
                                ]
                            ]
                        }
                    ]
                });
            });

            test("Parses nested MultiGeometry", () => {
                const kmlDOM = parseXML(`
                    <MultiGeometry>
                        <MultiGeometry>
                            <LineString>
                                <coordinates>-96.78,32.77 -96.79,32.78</coordinates>
                            </LineString>
                        </MultiGeometry>
                        <Polygon>
                            <outerBoundaryIs>
                                <LinearRing>
                                    <coordinates>-96.50,32.50 -96.80,32.80 -96.80,32.20 -96.50,32.50</coordinates>
                                </LinearRing>
                            </outerBoundaryIs>
                        </Polygon>
                    </MultiGeometry>
                `);

                const multiGeometryEl = kmlDOM.documentElement;
                const result = parseMultiGeometry(multiGeometryEl);

                expect(result).toEqual({
                    type: "GeometryCollection",
                    geometries: [
                        {
                            type: "LineString",
                            coordinates: [[-96.78, 32.77], [-96.79, 32.78]]
                        },
                        {
                            type: "Polygon",
                            coordinates: [[
                                [-96.50, 32.50],
                                [-96.80, 32.80],
                                [-96.80, 32.20],
                                [-96.50, 32.50]
                            ]]
                        }
                    ]
                });
            });

            test("Returns unwrapped geometry if only one child", () => {
                const kmlDOM = parseXML(`
                    <MultiGeometry>
                        <Point>
                            <coordinates>-96.78,32.77,0</coordinates>
                        </Point>
                    </MultiGeometry>
                `);

                const multiGeometryEl = kmlDOM.documentElement;
                const result = parseMultiGeometry(multiGeometryEl);
                
                expect(result).toEqual({
                    type: "Point",
                    coordinates: [-96.78, 32.77]
                });
            });

            test("Returns null for no valid geometries", () => {
                const kmlDOM = parseXML(`
                    <MultiGeometry>
                        <Point>
                            <coordinates>   </coordinates>
                        </Point>
                        <LineString>
                        </LineString>
                    </MultiGeometry>
                `);

                const multiGeometryEl = kmlDOM.documentElement;
                const result = parseMultiGeometry(multiGeometryEl);

                expect(result).toBeNull();
            });
        });

        describe("test parseStyles", () => {
            test("Parses Style with LineStyle", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="lineStyle1">
                            <LineStyle>
                                <color>ff0000ff</color>
                                <width>2</width>
                            </LineStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                console.log(result);

                expect(result).toEqual(new Map<string, any>([
                    ["lineStyle1", {
                        "stroke": "#ff0000",
                        "stroke-opacity": 1,
                        "stroke-width": 2
                    }]
                ]));
            });

            test("Parses Style with PolyStyle", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="polyStyle1">
                            <PolyStyle>
                                <color>ff00ff00</color>
                                <fill>1</fill>
                            </PolyStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["polyStyle1", {
                        "fill": "#00ff00",
                        "fill-opacity": 1
                    }]
                ]));
            });

            test("Parses Style with fill=0", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="noFillStyle">
                            <PolyStyle>
                                <color>ff00ff00</color>
                                <fill>0</fill>
                            </PolyStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["noFillStyle", {
                        "fill": "#00ff00",
                        "fill-opacity": 0
                    }]
                ]));
            });

            test("Parses Style with both LineStyle and PolyStyle", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="combinedStyle">
                            <LineStyle>
                                <color>ff0000ff</color>
                                <width>2</width>
                            </LineStyle>
                            <PolyStyle>
                                <color>ff00ff00</color>
                                <fill>1</fill>
                            </PolyStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["combinedStyle", {
                        "stroke": "#ff0000",
                        "stroke-opacity": 1,
                        "stroke-width": 2,
                        "fill": "#00ff00",
                        "fill-opacity": 1
                    }]
                ]));
            });

            test("Parses multiple Style elements", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="style1">
                            <LineStyle>
                                <color>ff0000ff</color>
                                <width>2</width>
                            </LineStyle>
                        </Style>
                        <Style id="style2">
                            <PolyStyle>
                                <color>ff00ff00</color>
                                <fill>1</fill>
                            </PolyStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["style1", {
                        "stroke": "#ff0000",
                        "stroke-opacity": 1,
                        "stroke-width": 2
                    }],
                    ["style2", {
                        "fill": "#00ff00",
                        "fill-opacity": 1
                    }]
                ]));
            });

            test("Parses Style without id", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style>
                            <LineStyle>
                                <color>ff0000ff</color>
                                <width>2</width>
                            </LineStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["", {
                        "stroke": "#ff0000",
                        "stroke-opacity": 1,
                        "stroke-width": 2
                    }]
                ]));
            });

            test("Returns empty map if no Style elements", () => {
                const kmlDOM = parseXML(`
                    <Document>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>());
            });

            test("Handles invalid color values", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="invalidStyle">
                            <LineStyle>
                                <color>invalid</color>
                                <width>2</width>
                            </LineStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["invalidStyle", {
                        "stroke-width": 2
                    }]
                ]));
            });

            test("Handles no color element", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="noColorStyle">
                            <LineStyle>
                                <width>2</width>
                            </LineStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["noColorStyle", {
                        "stroke-width": 2
                    }]
                ]));
            });

            test("Handles no width element", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="noWidthStyle">
                            <LineStyle>
                                <color>ff0000ff</color>
                            </LineStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["noWidthStyle", {
                        "stroke": "#ff0000",
                        "stroke-opacity": 1
                    }]
                ]));
            });

            test("Handles no color element in PolyStyle", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="noColorPolyStyle">
                            <PolyStyle>
                                <fill>1</fill>
                            </PolyStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["noColorPolyStyle", {}]
                ]));
            });

            test("Handles invalid color value in PolyStyle", () => {
                const kmlDOM = parseXML(`
                    <Document>
                        <Style id="invalidColorPolyStyle">
                            <PolyStyle>
                                <color>invalid</color>
                                <fill>1</fill>
                            </PolyStyle>
                        </Style>
                    </Document>
                `);

                const styleEl = kmlDOM.documentElement;
                const result = parseStyles(styleEl);

                expect(result).toEqual(new Map<string, any>([
                    ["invalidColorPolyStyle", {}]
                ]));
            });
        });

        describe("test parseTimeSpanProps", () => {
            test("Parses TimeSpan with begin and end", () => {
                const kmlDOM = parseXML(`
                    <Placemark>
                        <TimeSpan>
                            <begin>2024-01-01T00:00:00Z</begin>
                            <end>2024-01-02T00:00:00Z</end>
                        </TimeSpan>
                    </Placemark>
                `);
                
                const placemarkEl = kmlDOM.documentElement;
                const result = parseTimeSpanProps(placemarkEl);

                expect(result).toEqual({
                    timespan: {
                        begin: "2024-01-01T00:00:00Z",
                        end: "2024-01-02T00:00:00Z"
                    }
                });
            });

            test("Parses TimeSpan with only begin", () => {
                const kmlDOM = parseXML(`
                    <Placemark>
                        <TimeSpan>
                            <begin>2024-01-01T00:00:00Z</begin>
                        </TimeSpan>
                    </Placemark>
                `);

                const placemarkEl = kmlDOM.documentElement;
                const result = parseTimeSpanProps(placemarkEl);

                expect(result).toEqual({
                    timespan: {
                        begin: "2024-01-01T00:00:00Z"
                    }
                });
            });

            test("Parses TimeSpan with only end", () => {
                const kmlDOM = parseXML(`
                    <Placemark>
                        <TimeSpan>
                            <end>2024-01-02T00:00:00Z</end>
                        </TimeSpan>
                    </Placemark>
                `);

                const placemarkEl = kmlDOM.documentElement;
                const result = parseTimeSpanProps(placemarkEl);

                expect(result).toEqual({
                    timespan: {
                        end: "2024-01-02T00:00:00Z"
                    }
                });
            });

            test("Returns empty object if no TimeSpan", () => {
                const kmlDOM = parseXML(`
                    <Placemark>
                    </Placemark>
                `);

                const placemarkEl = kmlDOM.documentElement;
                const result = parseTimeSpanProps(placemarkEl);

                expect(result).toEqual({});
            });

            test("Returns empty object if TimeSpan has no begin or end", () => {
                const kmlDOM = parseXML(`
                    <Placemark>
                        <TimeSpan>
                        </TimeSpan>
                    </Placemark>
                `);

                const placemarkEl = kmlDOM.documentElement;
                const result = parseTimeSpanProps(placemarkEl);

                expect(result).toEqual({});
            });
        });

        describe("test toGeoJson", () => {
            test("Returns a FeatureCollection", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test Point</name>
                                    <Point>
                                        <coordinates>-96.78,32.77</coordinates>
                                    </Point>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);
            });

            test("Converts Placemark with Point geometry", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test Point</name>
                                    <Point>
                                        <coordinates>-96.78,32.77</coordinates>
                                    </Point>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);
                
                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.type).toBe("Feature");
                expect(feature.geometry.type).toBe("Point");

                if (feature.geometry.type === "Point") {
                    expect(feature.geometry.coordinates).toEqual([-96.78, 32.77]);
                }
            });

            test("Converts Placemark with LineString geometry", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test Line</name>
                                    <LineString>
                                        <coordinates>-96.78,32.77 -96.79,32.78</coordinates>
                                    </LineString>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.type).toBe("Feature");
                expect(feature.geometry.type).toBe("LineString");

                if (feature.geometry.type === "LineString") {
                    expect(feature.geometry.coordinates).toEqual([
                        [-96.78, 32.77],
                        [-96.79, 32.78]
                    ]);
                }
            });

            test("Converts Placemark with Polygon geometry", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test Polygon</name>
                                    <Polygon>
                                        <outerBoundaryIs>
                                            <LinearRing>
                                                <coordinates>-96.78,32.77 -96.79,32.78 -96.78,32.78 -96.78,32.77</coordinates>
                                            </LinearRing>
                                        </outerBoundaryIs>
                                    </Polygon>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.type).toBe("Feature");
                expect(feature.geometry.type).toBe("Polygon");

                if (feature.geometry.type === "Polygon") {
                    expect(feature.geometry.coordinates).toEqual([
                        [
                            [-96.78, 32.77],
                            [-96.79, 32.78],
                            [-96.78, 32.78],
                            [-96.78, 32.77]
                        ]
                    ]);
                }
            });

            test("Converts Placemark with MultiGeometry", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test MultiGeometry</name>
                                    <MultiGeometry>
                                        <Point>
                                            <coordinates>-96.78,32.77</coordinates>
                                        </Point>
                                        <LineString>
                                            <coordinates>-96.78,32.77 -96.79,32.78</coordinates>
                                        </LineString>
                                    </MultiGeometry>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.type).toBe("Feature");
                expect(feature.geometry.type).toBe("GeometryCollection");

                if (feature.geometry.type === "GeometryCollection") {
                    expect(feature.geometry.geometries).toHaveLength(2);
                    expect(feature.geometry.geometries[0].type).toBe("Point");
                    expect(feature.geometry.geometries[1].type).toBe("LineString");
                }
            });

            test("Skips Placemark with no geometry", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test No Geometry</name>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(0);
            });

            test("Includes name in properties", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <name>Test Name</name>
                                    <Point>
                                        <coordinates>-96.78,32.77</coordinates>
                                    </Point>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBe("Test Name");
            });

            test("Omits name if not present", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <Placemark>
                                    <Point>
                                        <coordinates>-96.78,32.77</coordinates>
                                    </Point>
                                </Placemark>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBeUndefined();
            });

            test("Applies LineStyle from StyleMap", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Style id="lineStyle1">
                                <LineStyle>
                                    <color>ff0000ff</color>
                                    <width>2</width>
                                </LineStyle>
                            </Style>
                            <Placemark>
                                <name>Styled Line</name>
                                <styleUrl>#lineStyle1</styleUrl>
                                <LineString>
                                    <coordinates>-96.78,32.77 -96.79,32.78</coordinates>
                                </LineString>
                            </Placemark>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBe("Styled Line");
                expect(feature.properties.stroke).toBe("#ff0000");
                expect(feature.properties['stroke-opacity']).toBe(1);
                expect(feature.properties['stroke-width']).toBe(2);
            });

            test("Applies PolyStyle from StyleMap", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Style id="polyStyle1">
                                <PolyStyle>
                                    <color>ff0000ff</color>
                                </PolyStyle>
                            </Style>
                            <Placemark>
                                <name>Styled Polygon</name>
                                <styleUrl>#polyStyle1</styleUrl>
                                <Polygon>
                                    <outerBoundaryIs>
                                        <LinearRing>
                                            <coordinates>-96.78,32.77 -96.79,32.78 -96.80,32.77 -96.78,32.77</coordinates>
                                        </LinearRing>
                                    </outerBoundaryIs>
                                </Polygon>
                            </Placemark>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBe("Styled Polygon");
                expect(feature.properties.fill).toBe("#ff0000");
                expect(feature.properties['fill-opacity']).toBe(1);
            });

            test("Ignores styleURL that does not match any Style", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Placemark>
                                <name>Unstyled Placemark</name>
                                <styleUrl>#nonExistentStyle</styleUrl>
                                <Point>
                                    <coordinates>-96.78,32.77</coordinates>
                                </Point>
                            </Placemark>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBe("Unstyled Placemark");
                expect(feature.properties.stroke).toBeUndefined();
                expect(feature.properties['stroke-opacity']).toBeUndefined();
                expect(feature.properties['stroke-width']).toBeUndefined();
            });

            test("Includes TimeSpan in properties", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Placemark>
                                <name>Placemark with TimeSpan</name>
                                <TimeSpan>
                                    <begin>2023-01-01T00:00:00Z</begin>
                                    <end>2023-01-01T01:00:00Z</end>
                                </TimeSpan>
                                <Point>
                                    <coordinates>-96.78,32.77</coordinates>
                                </Point>
                            </Placemark>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBe("Placemark with TimeSpan");
                expect(feature.properties.timespan).toBeDefined();
                expect(feature.properties.timespan.begin).toBe("2023-01-01T00:00:00Z");
                expect(feature.properties.timespan.end).toBe("2023-01-01T01:00:00Z");
            });

            test("Includes Description in properties", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Placemark>
                                <name>Placemark with Description</name>
                                <description>This is a sample description.</description>
                                <Point>
                                    <coordinates>-96.78,32.77</coordinates>
                                </Point>
                            </Placemark>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);

                const feature = result.features[0];
                expect(feature.properties.name).toBe("Placemark with Description");
                expect(feature.properties.description).toBe("This is a sample description.");
            });

            test("Returns empty FeatureCollection for no Placemarks", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Document>
                            <Folder>
                                <name>Empty Folder</name>
                            </Folder>
                        </Document>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(0);
            });

            test("Handles KML with no Document element", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Placemark>
                            <name>Placemark without Document</name>
                            <Point>
                                <coordinates>-96.78,32.77</coordinates>
                            </Point>
                        </Placemark>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);
            });

            test("Handles Element with tagName", () => {
                const kmlDOM = parseXML(`
                    <kml>
                        <Placemark>
                            <name>Placemark with Description</name>
                            <description>This is a sample description.</description>
                            <Point>
                                <coordinates>-96.78,32.77</coordinates>
                            </Point>
                        </Placemark>
                    </kml>
                `);

                const result = toGeoJson(kmlDOM);
                expect(result.type).toBe("FeatureCollection");
                expect(result.features).toHaveLength(1);
            });
        });
    });
});
