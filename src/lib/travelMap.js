// Mappa "travel journal" in SVG statico, generata in JS puro (nessun DOM, nessuna API).
//
// Usata sia nell'app (React) sia nell'HTML di export (funzione serverless): la stessa
// funzione produce markup SVG autonomo, con terre emerse da Natural Earth 1:110m e
// nessuna dipendenza da servizi esterni per la visualizzazione.
//
// Personalizzazione: tutti i colori/grandezze sono CSS variable con fallback inline,
// es.  style="fill:var(--map-land, #F3EAD8)" — quindi basta ridefinire le variabili
// CSS sul contenitore (.tm-root) per cambiare aspetto senza toccare il codice.

import { LAND_POLYGONS } from "./geo/ne_110m_land.js";

const RAD = Math.PI / 180;

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
  let lonLo = Math.min(...lons);
  let lonHi = Math.max(...lons);
  let latLo = Math.min(...lats);
  let latHi = Math.max(...lats);

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

  const X = (x) => (x - minX) * s;
  const Y = (lat) => (maxLat - lat) * s; // nord in alto
  const F = (v) => v.toFixed(1);

  // 3) Terre emerse: solo i poligoni che intersecano il viewport, eventualmente
  //    ripetuti agli offset -360/0/+360 per coprire il taglio dell'antimeridiano.
  const coastStroke = opts.coastStroke ?? "var(--map-coast, rgba(90,120,110,0.35))";
  const landFill = opts.landFill ?? "var(--map-land, #F3EAD8)";
  const seaFill = opts.seaFill ?? "var(--map-sea, #DCEBF0)";

  const landPaths = [];

  for (const off of [-360, 0, 360]) {
    for (const poly of LAND_POLYGONS) {
      // bbox del poligono in [lon,lat]
      let plo = Infinity, phi = -Infinity, tlo = Infinity, thi = -Infinity;
      for (const ring of poly) {
        for (const [lon, lat] of ring) {
          const L = lon + off;
          if (L < plo) plo = L;
          if (L > phi) phi = L;
          if (lat < tlo) tlo = lat;
          if (lat > thi) thi = lat;
        }
      }
      if (phi < lonLo - 2 || plo > lonHi + 2) continue;
      if (thi < latLo - 2 || tlo > latHi + 2) continue;

      const parts = [];
      for (const ring of poly) {
        let d = "";
        ring.forEach(([lon, lat], i) => {
          const x = X(f(lon + off));
          const y = Y(lat);
          d += `${i === 0 ? "M" : "L"} ${F(x)} ${F(y)} `;
        });
        if (d) parts.push(d.trim() + " Z");
      }
      if (parts.length) {
        landPaths.push(`<path class="tm-land" fill-rule="evenodd" style="fill:${landFill};stroke:${coastStroke};stroke-width:1.5;stroke-linejoin:round" d="${parts.join(" ")}" />`);
      }
    }
  }

  // 4) Punti della rotta nel sistema di riferimento della mappa.
  const pt = (m, lon) => [X(f(lon)), Y(m.lat)];
  const markerPx = markers.map((m, i) => pt(m, lons[i]));

  // 5) Tracciato (casing + linea principale) nell'ordine cronologico del viaggio.
  const routePts = route.map((mi) => markerPx[mi]);
  const routeD = smoothPath(routePts);
  const routeStroke = opts.routeStroke ?? "var(--map-route, #2E6F8E)";
  const routeCasing = opts.routeCasing ?? "var(--map-route-casing, rgba(46,111,142,0.22))";
  const routeW = opts.routeWidth ?? "var(--map-line-w, 3.5)";
  const routePath = routeD
    ? `<g class="tm-route">` +
      `<path class="tm-route-casing" style="fill:none;stroke:${routeCasing};stroke-width:calc(${routeW} + 5);stroke-linecap:round;stroke-linejoin:round" d="${routeD}" />` +
      `<path class="tm-route-line" style="fill:none;stroke:${routeStroke};stroke-width:${routeW};stroke-linecap:round;stroke-linejoin:round" d="${routeD}" />` +
      `</g>`
    : "";

  // 6) Marker numerati + etichette.
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
  <rect class="tm-sea" x="0" y="0" width="${F(width)}" height="${F(height)}" style="fill:${seaFill}" />
  ${landPaths.join("\n  ")}
  ${routePath}
  ${markerGroup}
</svg>`;
}
