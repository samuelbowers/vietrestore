async function addComparisonLayers(map, controls) {
  const status = document.createElement('div');
  status.className = 'map-status comparison-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading restoration areas and land cover…';
  document.querySelector('main').appendChild(status);
  try {
    const responses = await Promise.all([fetch('data/restoration-2026.geojson'), fetch('data/sentinel2-metadata.json')]);
    if (responses.some(r => !r.ok)) throw new Error('Comparison data unavailable');
    const [areas, metadata] = await Promise.all(responses.map(r => r.json()));
    map.createPane('landcover'); map.getPane('landcover').style.zIndex = 420;
    map.getPane('landcover').style.pointerEvents = 'none';
    map.createPane('restoration'); map.getPane('restoration').style.zIndex = 450;
    const restoration = L.geoJSON(areas, {
      pane: 'restoration', bubblingMouseEvents: false,
      style: {color: '#ff45e1', weight: 3, opacity: 1, fillColor: '#ff45e1', fillOpacity: 0.08, className: 'restoration-area'},
      onEachFeature(feature, layer) {
        const text = document.createElement('span');
        text.textContent = 'Restoration area selected in 2026 · ' + feature.properties.name;
        layer.bindTooltip(text, {sticky: true, className: 'forest-tooltip'});
        layer.on('click', () => layer.openTooltip());
      }
    }).addTo(map);
    controls.addOverlay(restoration, 'Restoration areas · 2026');
    const raster = L.imageOverlay('data/sentinel2-landcover.png', metadata.bounds, {
      pane: 'landcover', opacity: 0.8, className: 'landcover-image', interactive: false,
      alt: 'Sentinel-2 classification: water, trees, shrubs/grasses, and non-vegetation'
    });
    controls.addOverlay(raster, 'Sentinel-2 land cover');
    const tooltip = L.tooltip({direction: 'auto', opacity: 1, className: 'forest-tooltip'});
    const sampler = document.createElement('canvas'); sampler.width = sampler.height = 1;
    const context = sampler.getContext('2d', {willReadFrequently: true});
    context.imageSmoothingEnabled = false;
    function close() { map.closeTooltip(tooltip); }
    function identify(event) {
      if (!map.hasLayer(raster)) return;
      if (event.originalEvent?.target?.closest?.('.restoration-area')) { close(); return; }
      const image = raster.getElement();
      if (!image?.complete || !image.naturalWidth) return;
      const point = L.CRS.EPSG3857.project(event.latlng);
      const [left, bottom, right, top] = metadata.projectedBounds;
      const x = Math.floor((point.x - left) / (right - left) * metadata.width);
      const y = Math.floor((top - point.y) / (top - bottom) * metadata.height);
      if (x < 0 || y < 0 || x >= metadata.width || y >= metadata.height) { close(); return; }
      context.clearRect(0, 0, 1, 1);
      context.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      if (!pixel[3]) { close(); return; }
      const category = metadata.classes.find(c => c.color.every((v, i) => v === pixel[i]));
      if (!category) { close(); return; }
      const text = document.createElement('span'); text.textContent = 'Sentinel-2 · ' + category.label;
      tooltip.setLatLng(event.latlng).setContent(text).addTo(map);
    }
    raster.on('add', () => {
      map.getPane('nationalForest').style.pointerEvents = 'none';
      map.fire('classificationchange');
      status.textContent = 'Loading Sentinel-2 land cover…'; status.hidden = false;
      if (raster.getElement()?.complete && raster.getElement().naturalWidth) status.hidden = true;
    });
    raster.on('load', () => { status.hidden = true; });
    raster.on('error', () => { status.hidden = false; status.textContent = 'Sentinel-2 imagery could not load. Toggle it off and on to retry.'; });
    raster.on('remove', () => { map.getPane('nationalForest').style.pointerEvents = ''; close(); status.hidden = true; });
    restoration.on('mouseover', close);
    map.on('mousemove click', identify);
    map.on('movestart zoomstart mouseout', close);
    status.hidden = true;
  } catch (error) {
    status.textContent = 'The restoration areas or land-cover data could not load. Please refresh the page.';
    console.error(error);
  }
}
