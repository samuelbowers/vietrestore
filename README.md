# VietRestore

Vietnam restoration opportunity explorer.

A full-window Leaflet satellite map centred on Vietnam, hosted on GitHub Pages. The original header is preserved. Pan, zoom, keyboard navigation and a metric scale are available. Forest-type polygons are available as a single layer; further restoration and raster layers can be added later.

## Implementation

`index.html` is served directly from main by GitHub Pages, with no build step. Leaflet 1.9.4 and Esri Leaflet 3.0.15 load from unpkg. Satellite imagery uses Esri World Imagery; Esri Leaflet updates provider attribution as the view changes. Internet access is required. Loading and failure messages are included.

The current Esri BasemapLayer service is in mature support. For long-term production use, migrate to the current ArcGIS basemap service with an appropriately scoped API key and review its usage terms. No API keys or credentials are included.

## Future GIS layers

- Convert large shapefiles into web-ready vector tiles rather than downloading entire shapefiles in the browser.
- Serve raster data as raster tiles or through an appropriate cloud-optimized raster workflow.
- Select data hosting after dataset sizes and access requirements are known; keep large data separate from this website repository.

## Forest types layer

All six supplied shapefiles are combined in a single Forest types layer, with no legend. Hover or tap a polygon for its QGIS forest-type description. The map opens at the combined data extent. The checkbox toggles the entire dataset.

The archive contains 61,712 records; 61,659 drawable polygons are displayed. Ten records have null geometry, six collapse to non-polygon geometry during repair, and 37 further zero-area records collapse after coordinate transformation. The metadata JSON records the exceptions. All seven records with missing forest type are among the empty records; every displayed polygon has a mapped category. Lowercase dtts is normalized to DTTS.

Coordinates are transformed from EPSG:5899 (VN-2000 / TM-3 107-45) to WGS84 using pyproj's authoritative datum transformation. Invalid geometries are repaired before conversion. Shared boundaries are encoded in TopoJSON with a 10-million-position quantization grid (less than 1 cm), without preprocessing simplification. The compressed download is approximately 11.1 MB. Leaflet.VectorGrid 1.3.0 slices it into canvas tiles in a web worker with zoom-dependent display simplification. Modern browsers with DecompressionStream support are required. Only the forest code and generated feature ID are published as attributes; the original shapefiles are unchanged.

The colours and full category descriptions come from the supplied QGIS Ldlr style; display opacity is 80% to retain satellite context. The renderer includes a Leaflet 1.9 event-helper compatibility alias and uses integer zoom levels for accurate canvas hit testing.

## Restoration and Sentinel-2 comparison

The header icon has been removed. Three independent overlay checkboxes control National forest classification, Sentinel-2 land cover, and Restoration areas · 2026. National classification and restoration boundaries are on initially; Sentinel-2 is off initially. When both classifications are enabled, Sentinel-2 is above national classification. The restoration outlines remain above both. No legend is displayed; class names are available on hover/tap.

All 18 restoration polygons from the three ARRFY26 shapefiles are included, transformed from EPSG:5899 to WGS84. Only the area name and selection year are exposed, excluding owner fields and embedded local file paths.

The supplied 10 m Sentinel-2 raster uses EPSG:32648. It is reprojected to EPSG:3857 with nearest-neighbour sampling, preserving discrete classes, and stored as a lossless indexed PNG (approximately 1 MB). Source class definitions and RGB colours come from LandCover_classes_051026.odt and the supplied .clr file: 0 Water (0,197,255), 1 Trees (56,168,0), 2 Shrubs/grasses (255,255,0), 3 Non-vegetation (255,43,24). Unlabelled value 255 is treated as no-data and made transparent; the source TIFF does not declare a no-data value. Water (0) remains visible. Pixel hover/tap samples the nearest class pixel in the reprojected PNG. Rendering uses pixelated interpolation; no continuous-colour interpolation is used for classification values. This land cover supports visual assessment and is not itself a restoration suitability score.

## Interaction and presentation update

The visible title is Vietnam restoration opportunity explorer, with no subtitle. Sentinel-2 forest classification has a four-class legend shown only while that raster is enabled; it has no pixel hover or tap tooltip. Hover/tap class labels are limited to the national forest vector layer, with vector interaction suppressed while the raster covers it. Restoration areas remain visible outlines without tooltips. DTTS and DTK have slightly stronger opacity and outlines; DTK uses muted sand to distinguish potential restoration areas. These category highlights are not an additional suitability analysis.

A scoped Canvas.Tile subclass passes mousedown/mouseup through to map dragging rather than the legacy VectorGrid click handler. This fixes initial dragging over a polygon while preserving vector hover/tap identification.

## Ten largest contiguous DTTS areas

The **Largest DTTS areas · top 10** checkbox controls a cyan highlight layer,
enabled initially. Numbered markers identify the areas by descending size. Click
an outline to see its rank, area in hectares and number of source polygons. Expand
**10 largest DTTS areas** at the bottom left to zoom to an individual area or all
ten. This layer remains visible above either classification and below the 2026
restoration outlines.

The analysis uses only DTTS polygons from the published forest TopoJSON (including
any lowercase `dtts`). Polygons belong to one connected area if they share an
edge, touch at a vertex, or overlap; connectivity is transitive. No buffer or
gap-closing tolerance is used. Disconnected parts of a multipart source record
are analysed separately. Shapely repairs invalid parts before grouping. Area is
the WGS84 ellipsoidal area of each dissolved union, excluding holes and counting
overlaps once, rather than a sum of potentially overlapping record areas.

The published data contains 11,077 drawable DTTS source features, yielding 11,098
polygon parts and 5,138 connected areas; 13 input parts required geometry repair.
The largest ten range from 494.3 ha to 117.6 ha (the eleventh is 108.9 ha). Ranking
is within the six supplied datasets, not a nationwide inventory. The new layer
follows the user's DTTS definition; the classification alone does not establish
legal eligibility or other restoration suitability criteria.

The GeoJSON is approximately 1 MB and retains full published geometry without
further simplification. `data/dtts-largest-areas-metadata.json` records the source
SHA-256, method, ranks, precise areas, bounds and contributing feature IDs. IDs
are relative to this forest dataset version. Rebuild after replacing forest data:

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_dtts_areas.py
```

`dtts-areas.js` implements the overlay and ranking control independently of the
existing forest and comparison layers.

## Draw and download polygons

The toolbar at the top left uses Leaflet.draw 1.0.4. Select the polygon icon,
click/tap each corner, then select the first corner (or **Finish**) to complete
the polygon. Vermilion-red polygons (`#CC3311`, from the colourblind-friendly Tol vibrant
palette) remain above the other map layers, with a thicker stroke and white halo
for contrast over forest classifications and satellite imagery. KML downloads
use the same red. The edit tool
allows moving vertices; the delete tool removes selected drawings. **Save**
commits edits/deletions and **Cancel** discards those changes. Self-intersecting
polygons are blocked. Existing classification features remain unchanged.

The **Your polygons** panel downloads all completed drawings together as either
a WGS84 GeoJSON FeatureCollection or KML document. Both formats preserve closed
polygon rings, names and creation timestamps. KML uses longitude, latitude,
altitude coordinates with ground-clamped polygons. Downloaded GeoJSON can be
opened in QGIS and saved there as a GeoPackage. Export buttons are disabled while
editing or deleting until those operations are saved or cancelled.

Drawings are saved to localStorage on the same browser/origin after creation and
saved edits/deletions and restored on reopening the map. They are not uploaded,
shared between colleagues or stored in the repository. Clearing browser/site
data removes them. If local saving is blocked or exceeds available space, the
panel explains that downloads are needed to retain drawings. `drawing.js`
implements persistence and export without additional export dependencies.
