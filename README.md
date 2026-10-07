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
