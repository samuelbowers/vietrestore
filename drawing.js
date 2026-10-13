/* Personal browser-local polygons; downloads contain WGS84 longitude/latitude. */
function drawingsToKml(collection) {
  const escapeXml = value => String(value).replace(/[&<>"']/g, char =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[char]));
  function boundary(ring, outer) {
    // KML requires counterclockwise outer rings and clockwise holes.
    let signed = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      signed += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    const oriented = (signed > 0) === outer ? ring : [...ring].reverse();
    const tag = outer ? 'outerBoundaryIs' : 'innerBoundaryIs';
    return '<' + tag + '><LinearRing><coordinates>' +
      oriented.map(point => point[0] + ',' + point[1] + ',0').join(' ') +
      '</coordinates></LinearRing></' + tag + '>';
  }
  const placemarks = collection.features.map(feature => {
    const properties = feature.properties || {};
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const geometry = polygons.map(rings => '<Polygon><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>' +
      rings.map((ring, i) => boundary(ring, i === 0)).join('') + '</Polygon>').join('');
    const extended = Object.entries(properties).map(([key, value]) => '<Data name="' + escapeXml(key) +
      '"><value>' + escapeXml(value) + '</value></Data>').join('');
    return '<Placemark><name>' + escapeXml(properties.name || 'Drawn polygon') +
      '</name><styleUrl>#drawing</styleUrl><ExtendedData>' + extended + '</ExtendedData>' +
      (polygons.length > 1 ? '<MultiGeometry>' + geometry + '</MultiGeometry>' : geometry) + '</Placemark>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>VietRestore drawings</name>' +
    '<Style id="drawing"><LineStyle><color>ff1133cc</color><width>4</width></LineStyle>' +
    '<PolyStyle><color>1a1133cc</color></PolyStyle></Style>' + placemarks + '</Document></kml>\n';
}

function addDrawingTools(map) {
  const storageKey = 'vietrestore.drawings.v1';
  const panel = L.control({position: 'topleft'});
  const box = L.DomUtil.create('section', 'drawing-panel');
  box.setAttribute('aria-label', 'Your drawn polygons');
  const title = document.createElement('strong'); title.textContent = 'Your polygons';
  const hint = document.createElement('p');
  hint.textContent = 'Use the polygon tool, click corners, then click the first corner to finish.';
  const count = document.createElement('p'); count.setAttribute('role', 'status');
  const buttons = document.createElement('div'); buttons.className = 'drawing-downloads';
  const storageNote = document.createElement('p'); storageNote.className = 'drawing-storage';
  const downloadButtons = [];
  let active = false, storageAvailable = true, sequence = 0;
  const shapeStyle = {pane: 'userDrawings', color: '#cc3311', weight: 4,
    fillColor: '#cc3311', fillOpacity: 0.10, className: 'user-drawing'};
  map.createPane('userDrawings'); map.getPane('userDrawings').style.zIndex = 480;
  const drawings = L.featureGroup().addTo(map);
  function collection() { return drawings.toGeoJSON(false); }
  function refresh() {
    const size = drawings.getLayers().length;
    count.textContent = size + (size === 1 ? ' polygon' : ' polygons');
    downloadButtons.forEach(button => { button.disabled = active || size === 0; });
    storageNote.textContent = storageAvailable ? 'Saved in this browser only.' :
      'Browser saving is unavailable. Download your polygons to keep them.';
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(collection())); storageAvailable = true; }
    catch (error) { storageAvailable = false; }
    refresh();
  }
  function attachPopup(layer) {
    const content = document.createElement('span');
    content.textContent = layer.feature.properties.name;
    layer.bindPopup(content);
  }
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid stored drawings');
      // Only this tool's simple polygon features belong in its editable group.
      if (data.features.some(feature => feature.geometry?.type !== 'Polygon' ||
          !Array.isArray(feature.geometry.coordinates))) throw new Error('Invalid stored polygon');
      const restored = L.geoJSON(data, {style: shapeStyle});
      restored.eachLayer(layer => {
        const match = /^Polygon (\d+)$/.exec(layer.feature.properties?.name || '');
        sequence = Math.max(sequence, match ? Number(match[1]) : 0);
        layer.feature.properties = layer.feature.properties || {};
        layer.feature.properties.name = layer.feature.properties.name || 'Drawn polygon';
        attachPopup(layer); drawings.addLayer(layer);
      });
    }
  } catch (error) { storageAvailable = false; }
  function download(format) {
    const data = collection();
    if (active || !data.features.length) return;
    const text = format === 'geojson' ? JSON.stringify(data, null, 2) + '\n' : drawingsToKml(data);
    const mime = format === 'geojson' ? 'application/geo+json' : 'application/vnd.google-earth.kml+xml';
    const url = URL.createObjectURL(new Blob([text], {type: mime}));
    const link = document.createElement('a');
    link.href = url; link.download = 'vietrestore-polygons-' + new Date().toISOString().slice(0, 10) + '.' + format;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  ['geojson', 'kml'].forEach(format => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = format === 'geojson' ? 'GeoJSON' : 'KML';
    button.title = 'Download ' + button.textContent;
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', () => download(format));
    downloadButtons.push(button); buttons.appendChild(button);
  });
  box.append(title, hint, count, buttons, storageNote);
  L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
  panel.onAdd = () => box;
  if (!L.Control.Draw) {
    hint.textContent = 'Drawing tools could not load. Refresh the page to try again.';
    panel.addTo(map); refresh(); return;
  }
  const toolbar = new L.Control.Draw({
    position: 'topleft',
    draw: {polygon: {allowIntersection: false, showArea: true, shapeOptions: shapeStyle},
      polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false},
    edit: {featureGroup: drawings, poly: {allowIntersection: false}}
  });
  map.addControl(toolbar); panel.addTo(map);
  function start(event) {
    active = true;
    map.closePopup(); map.fire('classificationchange');
    map.getContainer().classList.add('drawing-active');
    map.getContainer().classList.toggle('drawing-new', event.type === 'draw:drawstart');
    refresh();
  }
  function stop() {
    active = false;
    map.getContainer().classList.remove('drawing-active', 'drawing-new');
    refresh();
  }
  map.on('draw:drawstart draw:editstart draw:deletestart', start);
  map.on('draw:drawstop draw:editstop draw:deletestop', stop);
  map.on('draw:created', event => {
    const layer = event.layer;
    layer.feature = {type: 'Feature', properties: {name: 'Polygon ' + (++sequence),
      created_at: new Date().toISOString()}, geometry: layer.toGeoJSON(false).geometry};
    attachPopup(layer); drawings.addLayer(layer); save();
  });
  map.on('draw:edited draw:deleted', save);
  refresh();
}
