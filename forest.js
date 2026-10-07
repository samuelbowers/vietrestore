/* One combined forest layer, rendered as canvas tiles in a worker. */
async function addForestLayer(map) {
  // VectorGrid 1.3 predates Leaflet 1.9; use the current event-stop helper.
  if (!L.DomEvent.fakeStop) L.DomEvent.fakeStop = L.DomEvent.stopPropagation;
  const message = document.createElement('div');
  message.className = 'map-status forest-status';
  message.setAttribute('role', 'status');
  message.textContent = 'Loading forest types…';
  document.querySelector('main').appendChild(message);
  try {
    const [styleResponse, dataResponse] = await Promise.all([
      fetch('data/forest-style.json'), fetch('data/forest.topojson.gz')
    ]);
    if (!styleResponse.ok || !dataResponse.ok) throw new Error('Forest data unavailable');
    const styles = await styleResponse.json();
    const topology = await new Response(dataResponse.body.pipeThrough(new DecompressionStream('gzip'))).json();
    const bounds = topology.bbox;
    map.fitBounds([[bounds[1], bounds[0]], [bounds[3], bounds[2]]], {padding: [24, 24], animate: false});
    function style(properties, zoom) {
      return {fill: true, fillColor: (styles[properties.type] || styles['']).color,
        fillOpacity: 0.8, color: '#6e6e6e', opacity: 0.7, weight: zoom >= 14 ? 0.65 : 0.2};
    }
    const forest = L.vectorGrid.slicer(topology, {
      rendererFactory: L.canvas.tile, interactive: true,
      vectorTileLayerStyles: {forest: style},
      getFeatureId: feature => feature.properties.id,
      maxZoom: 19, maxNativeZoom: 18, tolerance: 1, buffer: 64,
      bounds: [[bounds[1], bounds[0]], [bounds[3], bounds[2]]]
    });
    let highlighted = null;
    const tooltip = L.tooltip({direction: 'auto', opacity: 1, className: 'forest-tooltip'});
    function clearHover() {
      if (highlighted !== null) forest.resetFeatureStyle(highlighted);
      highlighted = null;
      map.closeTooltip(tooltip);
    }
    function showType(event) {
      const properties = event.layer.properties;
      if (highlighted !== properties.id) {
        clearHover();
        highlighted = properties.id;
        forest.setFeatureStyle(highlighted, {...style(properties, map.getZoom()), color: '#ffffff', weight: 2, fillOpacity: 0.95});
      }
      const text = document.createElement('span');
      text.textContent = (styles[properties.type] || styles['']).label;
      tooltip.setLatLng(event.latlng).setContent(text).addTo(map);
    }
    forest.on('mouseover', showType);
    forest.on('mousemove', showType);
    forest.on('mouseout', clearHover);
    forest.on('click', showType); // Tap support for touch devices.
    forest.on('remove', clearHover);
    map.on('zoomstart movestart', clearHover);
    forest.once('load', () => { message.remove(); });
    forest.on('tileerror', () => { message.textContent = 'Forest tiles could not load. Please refresh the page.'; });
    forest.addTo(map);
    L.control.layers(null, {'Forest types': forest}, {collapsed: false, position: 'topright'}).addTo(map);
  } catch (error) {
    message.textContent = 'Forest types could not load. Please refresh the page or try a current browser.';
    console.error('Forest layer:', error);
  }
}
