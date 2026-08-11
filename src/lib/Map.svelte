<script lang="ts">
    import { onMount } from "svelte";
    import L from "leaflet";
    import "leaflet/dist/leaflet.css";
    import { parseTimeSpanProps, toGeoJson } from "./convert-to-geojson";
    import { kmz } from "./state.svelte";
    import { screenOverlayControl } from "./ScreenOverlayControl";
    import {timestamp} from './state.svelte';

    let mapContainer: HTMLDivElement;
    let map: L.Map;
    
    let layer: L.GeoJSON;
    let overlays: L.Control[] = [];
    let currentOverlay: L.control;

    let features = $state({});

    let timestamps: string[] = [];

    function sortDateTimeStrings(dateStrings: string[]) {
        return [...dateStrings].sort((a, b) => new Date(a) - new Date(b));
    }
    
    function reset() {
      if (layer) {
          layer.remove(); // Remove the existing layer if it exists
      }

      if (currentOverlay) {
        map.removeControl(currentOverlay);
      }
      
      for (const overlay of overlays) {
        map.removeControl(overlay);
      }
      overlays = [];
    }

    onMount(async () => {
        map = L.map(mapContainer, {zoomControl: false}).setView([0, 0], 2);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        
        L.control.zoom({
          position: 'bottomright'
        }).addTo(map);
    });

    $effect(() => {
        if (!map || !kmz.dom) return;

        const geojson = toGeoJson(kmz.dom);
        if (!geojson) return;

        console.log(geojson);

        reset();

        let fts = {};
        timestamps = [];//resets the timestamps since timestamps is local copy

        geojson.features.forEach(feature => {
            const ts = feature?.properties?.timespan?.begin;
            if (!ts) return;

            if (!(ts in fts)) {
                fts[ts] = { timestamp: ts, features: [], legend: null };
                timestamps.push(ts);
            }

            fts[ts].features.push(feature);
        });

        for (const overlay of kmz.dom.getElementsByTagName("ScreenOverlay")) {
          const timeSpan = parseTimeSpanProps(overlay);
          const options = { position: 'topleft', overlayElement: overlay };
          const overlayControl = screenOverlayControl(options)
          if(Object.keys(timeSpan).length != 0 && timeSpan.timespan.begin in fts) {
            fts[timeSpan.timespan.begin]["legend"] = overlayControl;
          }
          overlayControl.addTo(map);
          overlays.push(overlayControl);
        }

        features = fts;
        const timestamps_sorted = sortDateTimeStrings(timestamps);

        timestamp.times = timestamps_sorted;
        timestamp.index = 0;

        console.log(fts);
        
        let longitude;
        let latitude;

        // Use LookAt element to set view
        for (const lookAt of kmz.dom.getElementsByTagName("LookAt")) {
            longitude = lookAt.getElementsByTagName("longitude")[0]?.textContent;
            latitude = lookAt.getElementsByTagName("latitude")[0]?.textContent;
        }

        if (longitude && latitude) {
            map.setView([parseFloat(latitude), parseFloat(longitude)], 10);
        }
        // Fallback if no LookAt element
        else {
            const coords = geojson.features[0].geometry.coordinates;
            const [lng, lat] = coords;

            map.setView([lat, lng], 10);
        }
    });

    $effect(() => {
        if(Object.keys(features).length === 0){
            return;
        }

        if (layer) layer.remove();
        if (currentOverlay) map.removeControl(currentOverlay);
        
        currentOverlay = features[timestamp.times[timestamp.index]].legend;
        currentOverlay.addTo(map);

        let feature = {"type": "FeatureCollection", "features": features[timestamp.times[timestamp.index]].features}; // Create a new GeoJSON object with the desired timestamps
       
        layer = L.geoJSON(feature, {
            style: (feature) => {
            const p = feature.properties || {};
                return {
                color: p.stroke || "#000000",
                opacity: p["stroke-opacity"] ?? 1,
                weight: 1,
                fillColor: p.fill || "#3388ff",          //Leaflet only reads fillColor
                fillOpacity: p["fill-opacity"] ?? 0.7    //fillOpacity
                };
            }
        }).addTo(map);
    });
</script>

<div bind:this={mapContainer} class="map"></div>

<style>
    .map {
        height: 100%;
        width: 100%;
        z-index: 0;
    }
</style>
