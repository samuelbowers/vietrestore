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
      pane: 'restoration', interactive: false,
      style: {color: '#ff45e1', weight: 3, opacity: 1, fillColor: '#ff45e1', fillOpacity: 0.08, className: 'restoration-area'},

    }).addTo(map);
    controls.addOverlay(restoration, 'Restoration areas · 2026');
    const raster = L.imageOverlay('data/sentinel2-landcover.png', metadata.bounds, {
      pane: 'landcover', opacity: 0.8, className: 'landcover-image', interactive: false,
      alt: 'Sentinel-2 classification: water, trees, shrubs/grasses, and non-vegetation'
    });
    controls.addOverlay(raster, 'Sentinel-2 forest classification');
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function () {
      const box = L.DomUtil.create('section', 'classification-legend');
      box.setAttribute('aria-label', 'Sentinel-2 forest classification legend');
      const title = document.createElement('strong');
      title.textContent = 'Sentinel-2 forest classification'; box.appendChild(title);
      metadata.classes.forEach(category => {
        const row = document.createElement('div');
        const swatch = document.createElement('span'); swatch.className = 'legend-swatch';
        swatch.style.backgroundColor = 'rgb(' + category.color.join(',') + ')';
        swatch.setAttribute('aria-hidden', 'true');
        row.append(swatch, document.createTextNode(category.label)); box.appendChild(row);
      });
      L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
      return box;
    };
    raster.on('add', () => {
      legend.addTo(map);
      map.getPane('nationalForest').classList.add('classification-obscured');
      map.fire('classificationchange');
      status.textContent = 'Loading Sentinel-2 forest classification…'; status.hidden = false;
      if (raster.getElement()?.complete && raster.getElement().naturalWidth) status.hidden = true;
    });
    raster.on('load', () => { status.hidden = true; });
    raster.on('error', () => { status.hidden = false; status.textContent = 'Sentinel-2 imagery could not load. Toggle it off and on to retry.'; });
    raster.on('remove', () => { map.getPane('nationalForest').classList.remove('classification-obscured'); legend.remove(); status.hidden = true; });
    status.hidden = true;
  } catch (error) {
    status.textContent = 'The restoration areas or land-cover data could not load. Please refresh the page.';
    console.error(error);
  }
}
