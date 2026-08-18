// Mappa "travel journal" in SVG statico, generata in JS puro (nessun DOM, nessuna API).
//
// Usata sia nell'app (React) sia nell'HTML di export (funzione serverless): la stessa
// funzione produce markup SVG autonomo. La cartografia viene da Natural Earth 1:50m
// (dominio pubblico): coste e isole dettagliate, confini nazionali, laghi e le
// principali località. Le geometrie sono convertite in moduli compatti da
// scripts/convert-geo.mjs e decodificate a runtime (geoCodec.js).
//
// Livello di dettaglio adattivo:
//   - semplificazione Douglas-Peucker con tolleranza in pixel calcolata dalla scala
//     (una costa "più grossa" a scala mondiale, pieno dettaglio a scala locale);
//   - isole/laghi sotto soglia minima di dimensioni a schermo vengono scartati;
//   - le località sono filtrate per importanza (scalerank/min_zoom di NE) in base
//     allo zoom della mappa, con anti-sovrapposizione delle etichette.
//
// Personalizzazione: tutti i colori/grandezze sono CSS variable con fallback inline,
// es.  style="fill:var(--map-land, #F3EAD8)" — quindi basta ridefinire le variabili
// CSS sul contenitore (.tm-root) per cambiare aspetto senza toccare il codice.

import { DATA as LAND } from "./geo/ne50_land.js";
import { DATA as LAKES } from "./geo/ne50_lakes.js";
import { DATA as BORDERS } from "./geo/ne50_borders.js";
import { DATA as PLACES } from "./geo/ne50_places.js";
import { decodePolygons, decodeLines } from "./geo/geoCodec.js";

const RAD = Math.PI / 180;

// ---------- cache decodifica (una sola volta per sessione) ----------
let _land = null, _lakes = null, _borders = null;
let _landBoxes = null, _lakesBoxes = null, _bordersBoxes = null;

function landFeatures() {
  if (!_land) { _land = decodePolygons(LAND); _landBoxes = buildIndex(_land); }
  return { features: _land, boxes: _landBoxes };
}
function lakesFeatures() {
  if (!_lakes) { _lakes = decodePolygons(LAKES); _lakesBoxes = buildIndex(_lakes); }
  return { features: _lakes, boxes: _lakesBoxes };
}
function bordersFeatures() {
  if (!_borders) { _borders = decodeLines(BORDERS); _bordersBoxes = buildIndex(_borders); }
  return { features: _borders, boxes: _bordersBoxes };
}

// Bbox in gradi di ogni feature, per il culling rapido rispetto al viewport.
function buildIndex(features) {
  const boxes = [];
  for (const f of features) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const ring of f.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        const lon = ring[i], lat = ring[i + 1];
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    boxes.push([minLon, minLat, maxLon, maxLat]);
  }
  return boxes;
}

// Crea i punti della mappa da un elenco libero di luoghi { name, lat, lon }:
//   - markers: destinazioni uniche (prima occorrenza)
//   - route:   indice del marker in ordine di inserimento (ripetizioni ammesse)
// Luoghi identici (stesso punto arrotondato) collassano in un solo marker.
export function routePointsFromList(locations) {
  const markers = [];
  const route = [];
  const seen = new Map();

  for (const loc of locations || []) {
    if (!loc || typeof loc.lat !== "number" || typeof loc.lon !== "number") continue;
    if (!isFinite(loc.lat) || !isFinite(loc.lon)) continue;
    const key = `${Math.round(loc.lat * 100)}:${Math.round(loc.lon * 100)}`;
    let mi = seen.get(key);
    if (mi === undefined) {
      mi = markers.length;
      markers.push({ name: String(loc.name || ""), lat: loc.lat, lon: loc.lon });
      seen.set(key, mi);
    }
    route.push(mi);
  }

  return { markers, route };
}

// Rende continue le longitudini tagliando in corrispondenza del salto più grande
// (così un viaggio che attraversa l'antimeridiano non "spacca" la mappa).
// Applicato solo quando i dati coprono davvero più di 180° di longitudine.
function unwrapLons(lons) {
  if (lons.length < 2) return [...lons];
  const rawLo = Math.min(...lons);
  const rawHi = Math.max(...lons);
  if (rawHi - rawLo <= 180) return [...lons];
  const sorted = [...lons].sort((a, b) => a - b);
  let maxGap = -1;
  let cut = 0;
  for (let i = 0; i < sorted.length; i++) {
    const gap = i === sorted.length - 1 ? sorted[0] + 360 - sorted[i] : sorted[i + 1] - sorted[i];
    if (gap > maxGap) { maxGap = gap; cut = i; }
  }
  const base = sorted[(cut + 1) % sorted.length];
  return lons.map((lon) => {
    let L = lon;
    while (L < base) L += 360;
    while (L - 360 >= base) L -= 360;
    return L;
  });
}

function escapeXml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// Nome breve per le etichette: la parte prima della prima virgola ("Bangkok, Thailand" → "Bangkok").
function shortLabel(name) {
  const s = String(name || "").trim();
  if (!s) return "";
  const head = s.split(",")[0].trim();
  return head || s;
}

// Catmull-Rom → curve di Bézier cubiche, per un tracciato morbido tra i punti.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const p = pts;
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ---------- semplificazione Douglas-Peucker (in pixel) ----------
function simplifyDP(pts, tolPx) {
  const n = pts.length;
  if (n < 3) return pts;
  const sq = tolPx * tolPx;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = pts[a][0], ay = pts[a][1];
    const dx = pts[b][0] - ax, dy = pts[b][1] - ay;
    const l2 = dx * dx + dy * dy;
    let maxD = -1, maxI = -1;
    for (let i = a + 1; i < b; i++) {
      let d;
      if (l2 === 0) {
        d = (pts[i][0] - ax) * (pts[i][0] - ax) + (pts[i][1] - ay) * (pts[i][1] - ay);
      } else {
        const t = ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / l2;
        const tx = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + tx * dx, py = ay + tx * dy;
        d = (pts[i][0] - px) * (pts[i][0] - px) + (pts[i][1] - py) * (pts[i][1] - py);
      }
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxI > 0 && maxD > sq) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

// ---------- clip poligono al rettangolo [0,W]x[0,W] (Sutherland–Hodgman) ----------
function clipRing(pts, W) {
  let input = pts;
  const inside = (e, p) => e === 0 ? p[0] >= 0 : e === 1 ? p[0] <= W : e === 2 ? p[1] >= 0 : p[1] <= W;
  const inter = (e, a, b) => {
    let t;
    if (e === 0) t = (0 - a[0]) / (b[0] - a[0]);
    else if (e === 1) t = (W - a[0]) / (b[0] - a[0]);
    else if (e === 2) t = (0 - a[1]) / (b[1] - a[1]);
    else t = (W - a[1]) / (b[1] - a[1]);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  for (let e = 0; e < 4; e++) {
    const out = [];
    const n = input.length;
    if (!n) break;
    for (let i = 0; i < n; i++) {
      const cur = input[i];
      const nxt = input[(i + 1) % n];
      const cin = inside(e, cur), nin = inside(e, nxt);
      if (cin) out.push(cur);
      if (cin !== nin) out.push(inter(e, cur, nxt));
    }
    input = out;
  }
  return input;
}

function bboxPx(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return [minX, minY, maxX, maxY];
}

// Proietta un anello Float32Array (lon,lat interleaved) e restituisce i punti
// [x,y] in pixel (nord in alto).
function projectRing(arr, off, f, X, Y) {
  const pts = [];
  for (let i = 0; i < arr.length; i += 2) {
    pts.push([X(f(arr[i] + off)), Y(arr[i + 1])]);
  }
  return pts;
}

// Rende un path "d" da una lista di punti pixel.
function ringToPath(pts, F) {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    d += `${i === 0 ? "M" : "L"} ${F(pts[i][0])} ${F(pts[i][1])} `;
  }
  return d.trim() + " Z";
}
function lineToPath(pts, F) {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    d += `${i === 0 ? "M" : "L"} ${F(pts[i][0])} ${F(pts[i][1])} `;
  }
  return d.trim();
}

// Genera le parti cartografiche (terra, laghi, confini) per il viewport corrente.
// Ritorna stringhe SVG da comporre nell'ordine corretto.
function buildGeoParts({ W, f, X, Y, F, lonLo, lonHi, latLo, latHi, tolPx, minArea, colors }) {
  const parts = {
    land: "",
    lakes: "",
    lakeLabels: "",
    borders: "",
    cities: "",
  };
  const landPts = [];
  const lakePts = [];
  const borderPts = [];

  // helper che proietta, semplifica e clippa le feature di un layer poligonale
  const collectPolygonLayer = (layer, boxes, target, isLake) => {
    const { features } = layer;
    for (let fi = 0; fi < features.length; fi++) {
      const box = boxes[fi];
      if (box[0] + 360 < lonLo - 1 || box[0] > lonHi + 1) continue;
      if (box[1] > latHi + 1 || box[3] < latLo - 1) continue;
      const feat = features[fi];
      for (const ring of feat.rings) {
        // culling fine per anello nel frame di longitudine
        let rLonLo = Infinity, rLonHi = -Infinity;
        for (let i = 0; i < ring.length; i += 2) {
          const lon = ring[i];
          if (lon < rLonLo) rLonLo = lon;
          if (lon > rLonHi) rLonHi = lon;
        }
        for (const off of [-360, 0, 360]) {
          if (rLonLo + off > lonHi + 1 || rLonHi + off < lonLo - 1) continue;
          const pts = projectRing(ring, off, f, X, Y);
          const simp = simplifyDP(pts, tolPx);
          const clipped = clipRing(simp, W);
          const [bx0, by0, bx1, by1] = bboxPx(clipped);
          if (!clipped.length || (bx1 - bx0) * (by1 - by0) < minArea) continue;
          target.push({
            d: ringToPath(clipped, F),
            cx: (bx0 + bx1) / 2,
            cy: (by0 + by1) / 2,
            w: bx1 - bx0,
            h: by1 - by0,
            lakeName: isLake ? (LAKES.names[fi] || "") : "",
          });
        }
      }
    }
  };

  const land = landFeatures();
  collectPolygonLayer(land, _landBoxes, landPts, false);

  const lakes = lakesFeatures();
  collectPolygonLayer(lakes, _lakesBoxes, lakePts, true);

  // confini nazionali (linee)
  const borders = bordersFeatures();
  for (let fi = 0; fi < borders.features.length; fi++) {
    const box = _bordersBoxes[fi];
    if (box[0] + 360 < lonLo - 1 || box[0] > lonHi + 1) continue;
    if (box[1] > latHi + 1 || box[3] < latLo - 1) continue;
    const feat = borders.features[fi];
    for (const ring of feat.rings) {
      for (const off of [-360, 0, 360]) {
        // bbox grado del ring per culling
        let rLonLo = Infinity, rLonHi = -Infinity, rLatLo = Infinity, rLatHi = -Infinity;
        for (let i = 0; i < ring.length; i += 2) {
          const lon = ring[i], lat = ring[i + 1];
          if (lon < rLonLo) rLonLo = lon;
          if (lon > rLonHi) rLonHi = lon;
          if (lat < rLatLo) rLatLo = lat;
          if (lat > rLatHi) rLatHi = lat;
        }
        if (rLonLo + off > lonHi + 1 || rLonHi + off < lonLo - 1) continue;
        if (rLatLo > latHi + 1 || rLatHi < latLo - 1) continue;
        const pts = projectRing(ring, off, f, X, Y);
        const simp = simplifyDP(pts, tolPx);
        if (simp.length < 2) continue;
        borderPts.push({ d: lineToPath(simp, F), solid: feat.solid });
      }
    }
  }

  // assemble SVG per layer
  const F2 = (v) => v.toFixed(1);

  if (landPts.length) {
    parts.land = `<g class="tm-land">${landPts.map((p) =>
      `<path fill-rule="evenodd" style="fill:${colors.land};stroke:${colors.coast};stroke-width:1.2;stroke-linejoin:round" d="${p.d}" />`
    ).join("")}</g>`;
  }

  if (lakePts.length) {
    parts.lakes = `<g class="tm-lakes">${lakePts.map((p) =>
      `<path style="fill:${colors.lake};stroke:none" d="${p.d}" />`
    ).join("")}</g>`;
    // etichette per i laghi principali (solo i più grandi a schermo)
    const big = lakePts
      .filter((l) => l.lakeName && l.w * l.h > 900)
      .sort((a, b) => b.w * b.h - a.w * a.h)
      .slice(0, 6);
    if (big.length) {
      parts.lakeLabels = `<g class="tm-lake-labels">${big.map((l) =>
        `<text x="${F2(l.cx)}" y="${F2(l.cy)}" text-anchor="middle" dominant-baseline="central" style="fill:${colors.lakeLabel};font-size:9px;letter-spacing:.12em;text-transform:uppercase;stroke:#fff;stroke-width:2.5;stroke-linejoin:round;paint-order:stroke">${escapeXml(l.lakeName)}</text>`
      ).join("")}</g>`;
    }
  }

  if (borderPts.length) {
    const solidD = borderPts.filter((b) => b.solid).map((b) => b.d).join(" ");
    const discD = borderPts.filter((b) => !b.solid).map((b) => b.d).join(" ");
    parts.borders = `${solidD ? `<path class="tm-borders" style="fill:none;stroke:${colors.border};stroke-width:0.8;stroke-linecap:round" d="${solidD}" />` : ""}` +
      `${discD ? `<path class="tm-borders-disputed" style="fill:none;stroke:${colors.borderDisputed};stroke-width:0.8;stroke-dasharray:3 2.5;stroke-linecap:round" d="${discD}" />` : ""}`;
  }

  return parts;
}

// Seleziona e posiziona le principali località, con anti-sovrapposizione.
// Usa le coordinate proiettate: un luogo viene mostrato se cade nel viewport
// effettivo (con margine), non solo nell'estensione delle tappe.
function buildCities({ W, f, X, Y, F, lonLo, degPerPx, colors, markerPx }) {
  const z = Math.log2(360 / (degPerPx * 256));
  const cand = [];
  const places = PLACES.places;
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    let L = p[0];
    while (L < lonLo) L += 360;
    while (L - 360 >= lonLo) L -= 360;
    const x = X(f(L));
    const y = Y(p[1]);
    if (x < -18 || x > W + 18 || y < -18 || y > W + 18) continue;
    const srank = p[3], cap = p[5], minZoom = p[6];
    if (cap || srank <= 2) { /* sempre visibili */ }
    else if (minZoom > z + 0.5) continue;
    cand.push([x, y, p]);
  }
  cand.sort((a, b) => (b[2][5] - a[2][5]) || (a[2][3] - b[2][3]) || (b[2][4] - a[2][4]));

  // evita di duplicare le tappe del percorso (già etichettate con i numeri)
  const placed = [];
  const out = [];
  const MAX = 24;
  for (const c of cand) {
    if (out.length >= MAX) break;
    const [x, y, p] = c;
    let nearMarker = false;
    for (const [mx, my] of markerPx) {
      const dx = x - mx, dy = y - my;
      if (dx * dx + dy * dy < 34 * 34) { nearMarker = true; break; }
    }
    if (nearMarker) continue;
    const name = shortLabel(p[2]);
    if (!name) continue;
    const cap = p[5];
    const dotR = cap ? 2.3 : 1.6;
    const w = name.length * 5.6;
    const left = x > W * 0.8;
    const labelX = left ? x - dotR - 3 : x + dotR + 3;
    const box = left ? [labelX - w, y - 5, labelX, y + 5] : [labelX, y - 5, labelX + w, y + 5];
    let ok = true;
    for (const b of placed) {
      if (box[0] < b[2] + 3 && box[2] > b[0] - 3 && box[1] < b[3] + 3 && box[3] > b[1] - 3) { ok = false; break; }
    }
    if (!ok) continue;
    placed.push(box);
    out.push({ x, y, name, cap, dotR, labelX, left });
  }

  if (!out.length) return "";
  return `<g class="tm-cities">${out.map((c) =>
    `<circle cx="${F(c.x)}" cy="${F(c.y)}" r="${c.dotR}" style="fill:${colors.cityDot}" />` +
    `<text x="${F(c.labelX)}" y="${F(c.y)}" text-anchor="${c.left ? "end" : "start"}" dominant-baseline="central" style="fill:${colors.cityLabel};font-size:9px;letter-spacing:.06em;stroke:#fff;stroke-width:2.5;stroke-linejoin:round;paint-order:stroke">${escapeXml(c.name)}</text>`
  ).join("")}</g>`;
}

// Genera l'SVG della mappa. points = { markers, route } (vedi routePointsFromList).
// Ritorna la stringa SVG o null se non ci sono destinazioni.
export function buildTravelMapSvg(points, opts = {}) {
  const { markers, route } = points || {};
  if (!markers || !markers.length) return null;

  const W = 1000;          // lato base del viewBox (formato quadrato)
  const title = opts.title || "";

  // 1) Longitudini continue (gestione antimeridiano).
  const lons = unwrapLons(markers.map((m) => m.lon));
  const lats = markers.map((m) => m.lat);
  const lonLo = Math.min(...lons);
  const lonHi = Math.max(...lons);
  const latLo = Math.min(...lats);
  const latHi = Math.max(...lats);

  const lat0 = Math.max(-66, Math.min(66, lats.reduce((a, b) => a + b, 0) / lats.length));

  // 2) Proiezione equirettangolare: x = lon·cos(lat0), y = -lat (scala uniforme).
  const f = (lon) => lon * Math.cos(lat0 * RAD);
  const bw = f(lonHi) - f(lonLo);
  const bh = latHi - latLo;

  // 3) ViewBox QUADRATO che contiene sempre tutti i punti, con un po' di respiro:
  //    entrambi gli assi usano la stessa estensione (il maggiore dei due), quindi
  //    la mappa è sempre un quadrato e il percorso resta interamente visibile.
  const pad = Math.max(bw, bh) * 0.16 + 1;
  const side = Math.max(bw, bh) + pad * 2;
  const cX = (f(lonLo) + f(lonHi)) / 2;
  const cY = (latLo + latHi) / 2;
  const minX = cX - side / 2;
  const maxLat = cY + side / 2;

  const s = W / side;
  const width = W;
  const height = W;
  const degPerPx = side / W;

  const X = (x) => (x - minX) * s;
  const Y = (lat) => (maxLat - lat) * s; // nord in alto
  const F = (v) => v.toFixed(1);

  // Tolleranza di semplificazione adattiva: ~0.5px di errore massimo sullo schermo.
  // Più si è "zoommato" (estensione piccola), più il dettaglio resta fedele.
  const tolPx = opts.tolPx ?? 0.5;
  const minArea = opts.minArea ?? 0.6; // px² sotto cui isole/laghi spariscono

  const colors = {
    sea: opts.seaFill ?? "var(--map-sea, #DCEBF0)",
    land: opts.landFill ?? "var(--map-land, #F3EAD8)",
    coast: opts.coastStroke ?? "var(--map-coast, rgba(90,120,110,0.35))",
    lake: opts.lakeFill ?? "var(--map-lake, rgba(120,170,195,0.55))",
    lakeLabel: opts.lakeLabelFill ?? "var(--map-lake-label, #6B8EA6)",
    border: opts.borderStroke ?? "var(--map-border, rgba(120,105,90,0.55))",
    borderDisputed: opts.borderDisputedStroke ?? "var(--map-border-disputed, rgba(160,120,80,0.55))",
    cityDot: opts.cityDotFill ?? "var(--map-city-dot, #8A5A44)",
    cityLabel: opts.cityLabelFill ?? "var(--map-city-label, #5C4436)",
  };

  // 4) Cartografia (terra, laghi, confini) con dettaglio adattivo alla scala.
  const geo = buildGeoParts({ W, f, X, Y, F, lonLo, lonHi, latLo, latHi, tolPx, minArea, colors });

  // 5) Punti della rotta nel sistema di riferimento della mappa.
  const pt = (m, lon) => [X(f(lon)), Y(m.lat)];
  const markerPx = markers.map((m, i) => pt(m, lons[i]));

  // 6) Località principali (etichette) filtrate per zoom.
  const citiesSvg = buildCities({ W, f, X, Y, F, lonLo, degPerPx, colors, markerPx });

  // 7) Tracciato (casing + linea principale) nell'ordine cronologico del viaggio.
  const routePts = route.map((mi) => markerPx[mi]);
  const routeD = smoothPath(routePts);
  const routeStroke = opts.routeStroke ?? "var(--map-route, #2E6F8E)";
  const routeCasing = opts.routeCasing ?? "var(--map-route-casing, rgba(46,111,142,0.22))";
  const routeW = opts.routeWidth ?? "var(--map-line-w, 3.5)";
  const routeDash = opts.routeDash ?? "var(--map-route-dash, none)";
  const routePath = routeD
    ? `<g class="tm-route">` +
      `<path class="tm-route-casing" style="fill:none;stroke:${routeCasing};stroke-width:calc(${routeW} + 5);stroke-linecap:round;stroke-linejoin:round" d="${routeD}" />` +
      `<path class="tm-route-line" style="fill:none;stroke:${routeStroke};stroke-width:${routeW};stroke-dasharray:${routeDash};stroke-linecap:round;stroke-linejoin:round" d="${routeD}" />` +
      `</g>`
    : "";

  // 8) Marker numerati + etichette.
  const ring = opts.markerRing ?? "var(--map-marker-ring, #2E6F8E)";
  const ringBg = opts.markerBg ?? "var(--map-marker-bg, #FFFFFF)";
  const numFill = opts.markerText ?? "var(--map-marker-text, #204F66)";
  const labelFill = opts.labelFill ?? "var(--map-label, #204F66)";
  const r = opts.markerRadius ?? "var(--map-marker-r, 11)";

  const markerGroup = markers.map((m, i) => {
    const [cx, cy] = markerPx[i];
    const x = F(cx), y = F(cy);
    const left = cx > width * 0.68;
    const tx = left ? cx - 22 : cx + 22;
    const anchor = left ? "end" : "start";
    const label = shortLabel(m.name) || `Destinazione ${i + 1}`;
    return `
      <g class="tm-marker">
        <circle class="tm-marker-dot" cx="${x}" cy="${y}" r="${r}" style="fill:${ringBg};stroke:${ring};stroke-width:2.5" />
        <text class="tm-marker-num" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" style="fill:${numFill};font-weight:650;font-size:11px">${i + 1}</text>
        <text class="tm-label" x="${F(tx)}" y="${y}" text-anchor="${anchor}" dominant-baseline="central" style="fill:${labelFill};font-size:13px;letter-spacing:.06em;text-transform:uppercase;stroke:#fff;stroke-width:3.5;stroke-linejoin:round;paint-order:stroke">${escapeXml(label)}</text>
      </g>`;
  }).join("");

  return `<svg class="tm-root" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F(width)} ${F(height)}" role="img" aria-label="Percorso di viaggio${title ? " — " + escapeXml(title) : ""}" preserveAspectRatio="xMidYMid meet">
  <rect class="tm-sea" x="0" y="0" width="${F(width)}" height="${F(height)}" style="fill:${colors.sea}" />
  ${geo.land}
  ${geo.lakes}
  ${geo.lakeLabels}
  ${geo.borders}
  ${citiesSvg}
  ${routePath}
  ${markerGroup}
</svg>`;
}
