# VietRestore

Vietnam restoration opportunity explorer.

A full-window Leaflet satellite map centred on Vietnam, hosted on GitHub Pages. The original header is preserved. Pan, zoom, keyboard navigation and a metric scale are available. Restoration vector and raster layers will be added later.

## Implementation

`index.html` is served directly from main by GitHub Pages, with no build step. Leaflet 1.9.4 and Esri Leaflet 3.0.15 load from unpkg. Satellite imagery uses Esri World Imagery; Esri Leaflet updates provider attribution as the view changes. Internet access is required. Loading and failure messages are included.

The current Esri BasemapLayer service is in mature support. For long-term production use, migrate to the current ArcGIS basemap service with an appropriately scoped API key and review its usage terms. No API keys or credentials are included.

## Future GIS layers

- Convert large shapefiles into web-ready vector tiles rather than downloading entire shapefiles in the browser.
- Serve raster data as raster tiles or through an appropriate cloud-optimized raster workflow.
- Select data hosting after dataset sizes and access requirements are known; keep large data separate from this website repository.
