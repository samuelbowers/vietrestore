# VietRestore

Vietnam restoration opportunity explorer.

A responsive, dependency-free placeholder for a future GIS tool, hosted on GitHub Pages. The illustration is schematic: it is not a geographic dataset, satellite image, or restoration assessment. All data connections are pending.

## Publish

Enable GitHub Pages under Settings → Pages → Deploy from a branch → main → / (root). The entry point is `index.html`; no build step is required.

## Future GIS implementation

- Add a map renderer and an appropriately licensed satellite basemap with required attribution.
- Convert large shapefile datasets into tiled web formats rather than loading entire shapefiles in the browser.
- Serve the raster through raster tiles or a suitable cloud-optimized raster workflow.
- Keep large spatial data separate from the small website repository, selecting hosting after dataset sizes and access requirements are known.

No datasets, credentials, analytics, or external dependencies are included in this placeholder.
