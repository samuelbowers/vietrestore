/* Illustrative, user-supplied clusters; IDs run clockwise from the top left. */
async function addExamplePriorityAreas(map, controls) {
  const status = document.createElement('div');
  status.className = 'map-status priority-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading example restoration priority areas…';
  document.querySelector('main').appendChild(status);
  try {
    const response = await fetch('data/example-restoration-priority-areas.geojson');
    if (!response.ok) throw new Error('Priority areas unavailable');
    const data = await response.json();
    map.createPane('examplePriority');
    map.getPane('examplePriority').style.zIndex = 465;
    map.createPane('examplePriorityLabels');
    map.getPane('examplePriorityLabels').style.zIndex = 470;
    const polygons = L.geoJSON(data, {
      pane: 'examplePriority',
      style: {color: '#cc3311', weight: 4, fillColor: '#cc3311', fillOpacity: 0.10,
        className: 'user-drawing example-priority-area'},
      onEachFeature(feature, layer) {
        const p = feature.properties;
        const content = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = p.name;
        const detail = document.createElement('p');
        detail.textContent = p.area_ha.toLocaleString('en-GB', {maximumFractionDigits: 1}) +
          ' ha · ' + p.source_polygon_count + (p.source_polygon_count === 1 ? ' source polygon' : ' source polygons');
        const note = document.createElement('span');
        note.textContent = 'Illustrative restoration priority area';
        content.append(title, detail, note);
        layer.bindPopup(content);
        layer.bindTooltip(p.name, {sticky: true});
      }
    });
    const layers = new Map(polygons.getLayers().map(layer => [layer.feature.properties.area_id, layer]));
    function focus(id) {
      const layer = layers.get(id);
      map.fitBounds(layer.getBounds(), {padding: [50, 50], maxZoom: 15});
      layer.openPopup(L.latLng(layer.feature.properties.label_point));
    }
    const labels = data.features.map(feature => {
      const p = feature.properties;
      const marker = L.marker(p.label_point, {
        pane: 'examplePriorityLabels', title: p.name, keyboard: true,
        icon: L.divIcon({className: 'priority-area-label', html: String(p.area_id),
          iconSize: [30, 30], iconAnchor: [15, 15]})
      });
      marker.on('click', () => focus(p.area_id));
      return marker;
    });
    const group = L.featureGroup([polygons, ...labels]);
    const navigation = L.control({position: 'bottomleft'});
    navigation.onAdd = () => {
      const box = L.DomUtil.create('details', 'dtts-ranking priority-navigation');
      const summary = document.createElement('summary'); summary.textContent = 'Example priority areas';
      box.appendChild(summary);
      const all = document.createElement('button'); all.type = 'button'; all.textContent = 'Show all four';
      all.addEventListener('click', () => map.fitBounds(polygons.getBounds(), {padding: [50, 50]}));
      box.appendChild(all);
      data.features.forEach(feature => {
        const p = feature.properties;
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = 'Area ' + p.area_id + ' · ' + p.position.toLowerCase();
        button.addEventListener('click', () => focus(p.area_id)); box.appendChild(button);
      });
      L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
      return box;
    };
    group.on('add', () => navigation.addTo(map));
    group.on('remove', () => { navigation.remove(); polygons.eachLayer(layer => layer.closePopup()); });
    group.addTo(map);
    controls.addOverlay(group, 'Example restoration priority areas');
    status.remove();
  } catch (error) {
    status.textContent = 'Example restoration priority areas could not load. Please refresh the page.';
    console.error('Example priority areas:', error);
  }
}
