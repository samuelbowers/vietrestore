/* Precomputed connected DTTS areas, ranked by ellipsoidal union area. */
async function addLargestDttsAreas(map, controls) {
  const status = document.createElement('div');
  status.className = 'map-status dtts-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading the largest DTTS areas…';
  document.querySelector('main').appendChild(status);
  try {
    const response = await fetch('data/dtts-largest-areas.geojson');
    if (!response.ok) throw new Error('DTTS areas unavailable');
    const data = await response.json();
    map.createPane('dttsAreas');
    map.getPane('dttsAreas').style.zIndex = 440;
    map.createPane('dttsRanks');
    map.getPane('dttsRanks').style.zIndex = 460;
    const formatArea = value => value.toLocaleString('en-GB', {maximumFractionDigits: 1});
    const outlineStyle = {color: '#00ecff', weight: 3, opacity: 1,
      fillColor: '#00d5ea', fillOpacity: 0.22};
    const polygons = L.geoJSON(data, {
      pane: 'dttsAreas', style: outlineStyle,
      onEachFeature(feature, layer) {
        const p = feature.properties;
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = 'DTTS area #' + p.rank;
        const detail = document.createElement('p');
        detail.textContent = formatArea(p.area_ha) + ' ha · ' + p.polygon_count + ' source polygons';
        const description = document.createElement('span');
        description.textContent = 'Area with natural regeneration';
        content.append(title, detail, description);
        layer.bindPopup(content);
        layer.bindTooltip('#' + p.rank + ' · ' + formatArea(p.area_ha) + ' ha', {sticky: true});
        layer.on('mouseover', () => layer.setStyle({weight: 5, fillOpacity: 0.36}));
        layer.on('mouseout', () => layer.setStyle(outlineStyle));
      }
    });
    const markers = data.features.map(feature => {
      const p = feature.properties;
      const marker = L.marker(p.label_point, {
        pane: 'dttsRanks', keyboard: true, title: 'DTTS area #' + p.rank + ', ' + formatArea(p.area_ha) + ' ha',
        icon: L.divIcon({className: 'dtts-rank', html: String(p.rank), iconSize: [26, 26], iconAnchor: [13, 13]})
      });
      marker.on('click', () => focus(p.rank));
      return marker;
    });
    const group = L.featureGroup([polygons, ...markers]);
    const rankedLayers = new Map(polygons.getLayers().map(layer => [layer.feature.properties.rank, layer]));
    function focus(rank) {
      const layer = rankedLayers.get(rank);
      map.fitBounds(layer.getBounds(), {padding: [40, 40], maxZoom: 15});
      layer.openPopup(L.latLng(layer.feature.properties.label_point));
    }
    const list = L.control({position: 'bottomleft'});
    list.onAdd = () => {
      const box = L.DomUtil.create('details', 'dtts-ranking');
      const summary = document.createElement('summary');
      summary.textContent = '10 largest DTTS areas';
      box.appendChild(summary);
      const all = document.createElement('button');
      all.type = 'button'; all.textContent = 'Show all ten';
      all.addEventListener('click', () => map.fitBounds(polygons.getBounds(), {padding: [40, 40]}));
      box.appendChild(all);
      data.features.forEach(feature => {
        const p = feature.properties;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '#' + p.rank + ' — ' + formatArea(p.area_ha) + ' ha';
        button.addEventListener('click', () => focus(p.rank));
        box.appendChild(button);
      });
      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.disableScrollPropagation(box);
      return box;
    };
    group.on('add', () => list.addTo(map));
    group.on('remove', () => list.remove());
    group.addTo(map);
    controls.addOverlay(group, 'Largest DTTS areas · top 10');
    status.remove();
  } catch (error) {
    status.textContent = 'The largest DTTS areas could not load. Please refresh the page.';
    console.error('DTTS areas:', error);
  }
}
