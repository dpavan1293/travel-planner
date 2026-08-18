// Decoder per i moduli generati da scripts/convert-geo.mjs.
//
// I dati sono byte base64 con coordinate quantizzate su griglia e delta-encoding
// varint zigzag (vedi convert-geo.mjs). La decodifica è pigra e in cache a livello
// di modulo: buildTravelMapSvg può proiettare/semplificare senza rifare il lavoro.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function b64ToBytes(b64) {
  const len = b64.length;
  const out = new Uint8Array((len / 4) * 3 | 0);
  let o = 0, buf = 0, bits = 0;
  for (let i = 0; i < len; i++) {
    const c = B64.indexOf(b64[i]);
    if (c < 0) continue;
    buf = (buf << 6) | c;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

// ---------- varint / zigzag ----------
class Reader {
  constructor(bytes) {
    this.b = bytes;
    this.i = 0;
  }
  varint() {
    let v = 0, shift = 0, b;
    do {
      b = this.b[this.i++];
      v |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    return v >>> 0;
  }
  zigzagVarint() {
    const v = this.varint();
    return (v >>> 1) ^ -(v & 1);
  }
}

function unzigzag(v) { return (v >>> 1) ^ -(v & 1); }

// Decodifica un layer "polygon" o "line" in una lista di feature.
// polygon -> [{ rings: Float32Array[] }]  (ogni ring: [lon,lat,lon,lat,...])
// line   -> [{ rings: Float32Array[], solid: bool }]
export function decodePolygons(data) {
  const bytes = b64ToBytes(data.b64);
  const r = new Reader(bytes);
  const count = r.varint();
  const features = [];
  for (let f = 0; f < count; f++) {
    const ringCount = r.varint();
    const rings = [];
    for (let k = 0; k < ringCount; k++) {
      const n = r.varint();
      const arr = new Float32Array(n * 2);
      let lonQ = 0, latQ = 0;
      for (let i = 0; i < n; i++) {
        const dLon = unzigzag(r.varint());
        const dLat = unzigzag(r.varint());
        lonQ += dLon;
        latQ += dLat;
        arr[i * 2] = lonQ * data.grid + data.lon0;
        arr[i * 2 + 1] = latQ * data.grid + data.lat0;
      }
      rings.push(arr);
    }
    features.push({ rings });
  }
  return features;
}

// Decodifica un layer "line" (confini) con classe solid/disputed.
export function decodeLines(data) {
  const bytes = b64ToBytes(data.b64);
  const r = new Reader(bytes);
  const count = r.varint();
  const features = [];
  for (let f = 0; f < count; f++) {
    const solid = r.varint() === 1;
    const partCount = r.varint();
    const rings = [];
    for (let k = 0; k < partCount; k++) {
      const n = r.varint();
      const arr = new Float32Array(n * 2);
      let lonQ = 0, latQ = 0;
      for (let i = 0; i < n; i++) {
        const dLon = unzigzag(r.varint());
        const dLat = unzigzag(r.varint());
        lonQ += dLon;
        latQ += dLat;
        arr[i * 2] = lonQ * data.grid + data.lon0;
        arr[i * 2 + 1] = latQ * data.grid + data.lat0;
      }
      rings.push(arr);
    }
    features.push({ rings, solid });
  }
  return features;
}
