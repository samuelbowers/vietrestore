"""Rank connected DTTS polygon parts from the published, unsimplified TopoJSON.

Run: python scripts/build_dtts_areas.py
Requires Shapely 2 and pyproj 3. No buffer or gap-closing tolerance is applied.
"""
import gzip
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from pyproj import Geod
from shapely import STRtree, make_valid, union_all
from shapely.geometry import Polygon, mapping
from shapely.geometry.polygon import orient

ROOT = Path(__file__).resolve().parents[1]
GEOD = Geod(ellps="WGS84")


def polygon_parts(geometry):
    if geometry.geom_type == "Polygon":
        if not geometry.is_empty and geometry.area > 0:
            yield geometry
    elif hasattr(geometry, "geoms"):
        for part in geometry.geoms:
            yield from polygon_parts(part)


def hectares(geometry):
    return sum(abs(GEOD.geometry_area_perimeter(orient(p, sign=1))[0])
               for p in polygon_parts(geometry)) / 10000


def build():
    source = ROOT / "data/forest.topojson.gz"
    with gzip.open(source, "rt") as handle:
        topology = json.load(handle)
    scale = topology["transform"]["scale"]
    translate = topology["transform"]["translate"]
    cache = {}

    def arc(index):
        key = index if index >= 0 else ~index
        if key not in cache:
            x = y = 0
            coords = []
            for dx, dy in topology["arcs"][key]:
                x += dx
                y += dy
                coords.append((x * scale[0] + translate[0],
                               y * scale[1] + translate[1]))
            cache[key] = coords
        return cache[key] if index >= 0 else cache[key][::-1]

    def ring(indices):
        coords = []
        for index in indices:
            segment = arc(index)
            coords.extend(segment if not coords else segment[1:])
        return coords

    pieces, source_ids = [], []
    repaired = 0
    source_features = []
    for feature in topology["objects"]["forest"]["geometries"]:
        if feature["properties"].get("type", "").upper() != "DTTS":
            continue
        source_features.append(feature)
        polygons = [feature["arcs"]] if feature["type"] == "Polygon" else feature["arcs"]
        for rings in polygons:
            polygon = Polygon(ring(rings[0]), [ring(r) for r in rings[1:]])
            if not polygon.is_valid:
                repaired += 1
                polygon = make_valid(polygon)
            for part in polygon_parts(polygon):
                pieces.append(part)
                source_ids.append(feature["properties"]["id"])

    # Split MultiPolygons first: disconnected islands in one source record must
    # not create a false bridge. Intersections include shared edges and vertices.
    parents = list(range(len(pieces)))

    def find(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    tree = STRtree(pieces)
    for i, piece in enumerate(pieces):
        for j in tree.query(piece, predicate="intersects"):
            j = int(j)
            if j > i:
                left, right = find(i), find(j)
                if left != right:
                    parents[right] = left
    components = defaultdict(list)
    for i in range(len(pieces)):
        components[find(i)].append(i)

    # Sum part areas to identify candidates; union ALL components before ranking
    # so overlaps are counted once, rather than inflating their area.
    ranked = []
    for members in components.values():
        geometry = union_all([pieces[i] for i in members])
        ids = sorted({source_ids[i] for i in members})
        ranked.append((hectares(geometry), ids, members, geometry))
    ranked.sort(key=lambda item: (-item[0], item[1][0]))
    assert len(ranked) >= 10
    features, summaries = [], []
    for rank, (area, ids, members, geometry) in enumerate(ranked[:10], 1):
        assert geometry.is_valid and not geometry.is_empty
        point = max(polygon_parts(geometry), key=hectares).representative_point()
        properties = {"rank": rank, "type": "DTTS", "area_ha": round(area, 4),
                      "polygon_count": len(ids), "part_count": len(members),
                      "label_point": [point.y, point.x]}
        features.append({"type": "Feature", "id": rank,
                         "properties": properties, "geometry": mapping(geometry)})
        summaries.append({**properties, "bounds": list(geometry.bounds), "source_ids": ids})
    output = {"type": "FeatureCollection", "features": features}
    metadata = {
        "source": "forest.topojson.gz",
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "connectivity": "Intersects: shared boundary segments, shared vertices, or overlaps; no buffering or gap bridging",
        "multipart_handling": "Disconnected polygon parts are assessed separately",
        "area_method": "WGS84 ellipsoidal union area using pyproj.Geod, hectares; holes excluded and overlaps counted once",
        "geometry": "Full published geometry; no additional simplification",
        "source_dtts_features": len(source_features), "polygon_parts": len(pieces),
        "repaired_parts": repaired, "connected_components": len(ranked),
        "eleventh_largest_area_ha": round(ranked[10][0], 4),
        "top_ten": summaries,
    }
    (ROOT / "data/dtts-largest-areas.geojson").write_text(json.dumps(output, separators=(",", ":")) + "\n")
    (ROOT / "data/dtts-largest-areas-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({k: v for k, v in metadata.items() if k != "top_ten"}, indent=2))
    for feature in features:
        print(feature["properties"])


if __name__ == "__main__":
    build()
