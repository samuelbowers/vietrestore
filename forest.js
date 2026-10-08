/* One combined forest layer, rendered as canvas tiles in a worker. */
async function addForestLayer(map, controls) {
  // VectorGrid 1.3 predates Leaflet 1.9; use the current event-stop helper.
  if (!L.DomEvent.fakeStop) L.DomEvent.fakeStop = L.DomEvent.stopPropagation;
  // Let press/release events reach Leaflet's map drag handler.
  const DraggableTile = L.Canvas.Tile.extend({
    _onClick(event) {
      if (event.type === 'mousedown' || event.type === 'mouseup') return;
      return L.Canvas.Tile.prototype._onClick.call(this, event);
    }
  });
  const message = document.createElement('div');
  message.className = 'map-status forest-status';
  message.setAttribute('role', 'status');
  message.textContent = 'Loading national forest classification…';
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
      const eligible = properties.type === 'DTTS' || properties.type === 'DTK';
      return {fill: true, fillColor: properties.type === 'DTK' ? '#e6d8b0' : (styles[properties.type] || styles['']).color,
        fillOpacity: eligible ? 0.92 : 0.76, color: eligible ? '#8c794b' : '#6e6e6e',
        opacity: eligible ? 0.85 : 0.65, weight: eligible ? (zoom >= 14 ? 1 : 0.45) : (zoom >= 14 ? 0.65 : 0.2)};
    }
    const forest = L.vectorGrid.slicer(topology, {
      rendererFactory: (coords, size, options) => new DraggableTile(coords, size, options), interactive: true, pane: 'nationalForest',
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
    map.on('zoomstart movestart classificationchange', clearHover);
    forest.once('load', () => { message.remove(); });
    forest.on('tileerror', () => { message.textContent = 'Forest tiles could not load. Please refresh the page.'; });
    forest.addTo(map);
    controls.addOverlay(forest, 'National forest classification');
  } catch (error) {
    message.textContent = 'National forest classification could not load. Please refresh the page or try a current browser.';
    console.error('Forest layer:', error);
  }
}
