// Converte i dati Natural Earth 1:50m (shapefile) in moduli JS compatti.
//
// Uso:  node scripts/convert-geo.mjs <cartella_shapefile>
// Dove <cartella_shapefile> contiene le sottocartelle scompattate da:
//   ne_50m_land.zip, ne_50m_lakes.zip, ne_50m_admin_0_boundary_lines_land.zip,
//   ne_50m_populated_places.zip
//
// Ogni modulo esporta un oggetto con i metadati di quantizzazione e i byte
// (base64) delle geometrie. Le geometrie sono codificate:
//   - coordinate quantizzate su griglia (lonGrid/latGrid gradi)
//   - delta-encoding + varint zigzag dentro ogni anello/parte
// Il decoder runtime sta in src/lib/geo/geoCodec.js.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "lib", "geo");
const GRID = 0.0025; // ~275m — più fine dei dati NE 1:50m stessi

// ---------- DBF ----------
function readDbfFields(buf) {
  const fields = [];
  let off = 32;
  while (off < buf.length) {
    const nameEnd = buf.indexOf(0, off);
    const name = buf.slice(off, nameEnd).toString("latin1");
    const type = String.fromCharCode(buf[off + 11]);
    const len = buf[off + 16];
    fields.push({ name, type, len });
    off += 32;
    if (buf[off] === 0x0d) break;
  }
  return fields;
}

function readDbfRecords(buf) {
  const fields = readDbfFields(buf);
  const headerLen = buf.readUInt16LE(8);
  const recLen = buf.readUInt16LE(10);
  const count = buf.readUInt32LE(4);
  const records = [];
  let off = headerLen;
  for (let i = 0; i < count; i++) {
    const rec = {};
    let foff = off + 1;
    for (const f of fields) {
      const raw = buf.slice(foff, foff + f.len);
      let val;
      if (f.type === "N" || f.type === "F") {
        const s = raw.toString("latin1").trim();
        val = s === "" ? null : Number(s);
      } else if (f.type === "L") {
        val = raw.toString("latin1").trim() === "T";
      } else {
        val = raw.toString("utf8").split("\u0000")[0].trim();
      }
      rec[f.name] = val;
      foff += f.len;
    }
    records.push(rec);
    off += recLen;
  }
  return records;
}

// ---------- SHP ----------
function* shpRecords(buf) {
  const fileLen = buf.readInt32BE(24) * 2;
  let off = 100;
  while (off < fileLen) {
    const contentLen = buf.readInt32BE(off + 4) * 2;
    yield { content: buf.slice(off + 8, off + 8 + contentLen) };
    off += 8 + contentLen;
  }
}

function parseParts(content) {
  const type = content.readInt32LE(0);
  if (type !== 3 && type !== 5) return null; // polyline | polygon
  const numParts = content.readInt32LE(36);
  const numPoints = content.readInt32LE(40);
  const parts = [];
  for (let i = 0; i < numParts; i++) parts.push(content.readInt32LE(44 + i * 4));
  const pointOff = 44 + numParts * 4;
  const rings = [];
  for (let p = 0; p < numParts; p++) {
    const start = parts[p];
    const end = p + 1 < numParts ? parts[p + 1] : numPoints;
    const pts = [];
    for (let i = start; i < end; i++) {
      pts.push([content.readDoubleLE(pointOff + i * 16), content.readDoubleLE(pointOff + i * 16 + 8)]);
    }
    rings.push(pts);
  }
  return rings;
}

// ---------- Encoding ----------
function encodeVarint(out, n) {
  let v = n >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}
function zigzag(n) { return n >= 0 ? n * 2 : n * -2 - 1; }
function encodePoint(out, lon, lat, prevLon, prevLat, lon0, lat0) {
  const qLon = Math.round((lon - lon0) / GRID);
  const qLat = Math.round((lat - lat0) / GRID);
  if (prevLon === undefined) {
    encodeVarint(out, zigzag(qLon));
    encodeVarint(out, zigzag(qLat));
  } else {
    encodeVarint(out, zigzag(qLon - prevLon));
    encodeVarint(out, zigzag(qLat - prevLat));
  }
  return [qLon, qLat];
}

function encodeRings(rings) {
  const out = [];
  encodeVarint(out, rings.length);
  for (const ring of rings) {
    encodeVarint(out, ring.length);
    let prevLon, prevLat;
    for (const [lon, lat] of ring) {
      const [qLon, qLat] = encodePoint(out, lon, lat, prevLon, prevLat, -180, -90);
      prevLon = qLon; prevLat = qLat;
    }
  }
  return out;
}

function toB64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

function writeModule(file, obj, header) {
  const body = JSON.stringify(obj, null, 0);
  const src = `${header}\n// Generato da scripts/convert-geo.mjs (Natural Earth 1:50m, pubblico dominio).\n// Non modificare a mano.\nexport const DATA = ${body};\n`;
  writeFileSync(join(OUT_DIR, file), src);
  console.log(`  -> src/lib/geo/${file} (${(src.length / 1024).toFixed(1)} KB)`);
}

const inputDir = process.argv[2];
if (!inputDir) {
  console.error("Uso: node scripts/convert-geo.mjs <dir_shapefile>");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

function layerFile(folder, shp, dbf) {
  const dir = join(inputDir, folder);
  return {
    shpBuf: readFileSync(join(dir, shp)),
    records: dbf ? readDbfRecords(readFileSync(join(dir, dbf))) : null,
  };
}

// ---------- LAND ----------
console.log("LAND 1:50m...");
{
  const { shpBuf } = layerFile("ne_50m_land", "ne_50m_land.shp", "ne_50m_land.dbf");
  const features = [];
  let ringCount = 0;
  for (const { content } of shpRecords(shpBuf)) {
    const rings = parseParts(content);
    if (!rings) continue;
    features.push(encodeRings(rings));
    ringCount += rings.length;
  }
  let all = [];
  encodeVarint(all, features.length);
  for (const b of features) for (const x of b) all.push(x);
  writeModule("ne50_land.js", {
    type: "polygon", lon0: -180, lat0: -90, grid: GRID, features: ringCount, b64: toB64(all),
  }, "// Terre emerse Natural Earth 1:50m (land + isole).");
  console.log(`  features=${features.length} rings=${ringCount}`);
}

// ---------- LAKES ----------
console.log("LAKES 1:50m...");
{
  const { shpBuf, records } = layerFile("ne_50m_lakes", "ne_50m_lakes.shp", "ne_50m_lakes.dbf");
  const features = [];
  const names = [];
  let ringCount = 0;
  let i = 0;
  for (const { content } of shpRecords(shpBuf)) {
    const rings = parseParts(content);
    if (!rings) continue;
    features.push(encodeRings(rings));
    ringCount += rings.length;
    const rec = records[i] || {};
    names.push(rec.name_it || rec.name_en || rec.name || rec.name_alt || "");
    i++;
  }
  let all = [];
  encodeVarint(all, features.length);
  for (const b of features) for (const x of b) all.push(x);
  writeModule("ne50_lakes.js", {
    type: "polygon", lon0: -180, lat0: -90, grid: GRID, features: names.length, b64: toB64(all), names,
  }, "// Laghi Natural Earth 1:50m.");
  console.log(`  features=${names.length} rings=${ringCount}`);
}

// ---------- BORDERS ----------
console.log("BORDERS 1:50m...");
{
  const { shpBuf, records } = layerFile("ne_50m_borders", "ne_50m_admin_0_boundary_lines_land.shp", "ne_50m_admin_0_boundary_lines_land.dbf");
  const features = [];
  let i = 0;
  for (const { content } of shpRecords(shpBuf)) {
    const rings = parseParts(content);
    if (!rings) continue;
    const rec = records[i] || {};
    const solid = rec.FEATURECLA === "International boundary (verify)";
    const enc = [solid ? 1 : 0];
    encodeVarint(enc, rings.length);
    for (const ring of rings) {
      encodeVarint(enc, ring.length);
      let prevLon, prevLat;
      for (const [lon, lat] of ring) {
        const [qLon, qLat] = encodePoint(enc, lon, lat, prevLon, prevLat, -180, -90);
        prevLon = qLon; prevLat = qLat;
      }
    }
    features.push(enc);
    i++;
  }
  let all = [];
  encodeVarint(all, features.length);
  for (const b of features) for (const x of b) all.push(x);
  writeModule("ne50_borders.js", {
    type: "line", lon0: -180, lat0: -90, grid: GRID, features: i, b64: toB64(all),
  }, "// Confini nazionali Natural Earth 1:50m (classe 1 = internazionali, 0 = contesti).");
  console.log(`  features=${i}`);
}

// ---------- PLACES ----------
console.log("PLACES 1:50m...");
{
  const { records } = layerFile("ne_50m_places", "ne_50m_populated_places.shp", "ne_50m_populated_places.dbf");
  const places = records
    .map((r) => {
      const lon = Number(r.LONGITUDE);
      const lat = Number(r.LATITUDE);
      if (!isFinite(lon) || !isFinite(lat)) return null;
      return [
        lon, lat,
        r.NAME_IT || r.NAME_EN || r.NAME || r.NAMEASCII || "",
        Number(r.SCALERANK) || 10,
        Number(r.POP_MAX) || 0,
        r.ADM0CAP === 1 ? 1 : 0,
        Number(r.MIN_ZOOM) || 7,
      ];
    })
    .filter(Boolean);
  writeModule("ne50_places.js", {
    type: "points", features: places.length, places,
  }, "// Principali località Natural Earth 1:50m. Campi: [lon, lat, nome, scalerank(1=max), pop, capitale, min_zoom].");
  console.log(`  features=${places.length}`);
}

console.log("Fatto.");
