// Logica JS per l'HTML di export di un viaggio.
//
// Il guscio HTML/CSS vive in src/lib/exportTemplateHtml.js (come stringa, perché la
// funzione serverless è impacchettata da esbuild che include solo i moduli importati)
// e può essere modificato liberamente: qui restano solo i dati condivisi
// e le funzioni che generano le parti dinamiche del documento.
//
// Uso:
//   - client (App.jsx): importa solo i dati (CATEGORIES, EXTRA_META, date, ecc.).
//   - serverless (netlify/functions/export.js): buildParts() + renderExportTemplate().
//
// Deve restare JS puro (niente React/DOM): gira anche dentro la funzione Netlify.

import { routePointsFromList, buildTravelMapSvg } from "./travelMap.js";

export const CATEGORIES = [
  { id: "citta", label: "Città", color: "#2F6F6B" },
  { id: "mare", label: "Mare", color: "#1F86A8" },
  { id: "cultura", label: "Cultura", color: "#6B4F8A" },
  { id: "animali", label: "Animali", color: "#6B8E4E" },
  { id: "trasferimento", label: "Trasferimento", color: "#7A7566" },
  { id: "avventura", label: "Avventura", color: "#C1503C" },
];

export const EXTRA_META = [
  { id: "flight", label: "Volo", color: "#2E6F8E" },
  { id: "security", label: "Sicurezza", color: "#C1503C" },
  { id: "vaccines", label: "Vaccinazioni", color: "#3F7D4A" },
  { id: "packing", label: "Cosa portare", color: "#B98B3E" },
  { id: "costs", label: "Costi", color: "#4A7A5E" },
  { id: "notes", label: "Note", color: "#7C6FDB" },
  { id: "map", label: "Mappa", color: "#3A7D6E" },
];
export const DEFAULT_EXTRA_META = { label: "Scheda", color: "#7A7566" };

export const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
export const WEEKDAYS = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
export const WEEKDAYS_SHORT = ["lun","mar","mer","gio","ven","sab","dom"];

export function pad(n) { return String(n).padStart(2, "0"); }
export function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function fromISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
export function escapeHtml(s) { return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// Icone SVG (stroke, 24x24) usate nel documento HTML esportato — non possiamo usare i componenti
// lucide-react lì dentro perché è markup statico, quindi ne teniamo una versione disegnata a mano per tipo.
const EXPORT_ICON_SVGS = {
  flight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  security: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  vaccines: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  packing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>',
  costs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M8 12h8M8 16h5"/></svg>',
};
const EXPORT_ICON_DEFAULT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>';

// Icone dedicate per le categorie di viaggio, usate nell'infografica "Stile del viaggio" dell'export.
const CATEGORY_ICON_SVGS = {
  citta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 21v-4h6v4"/><path d="M9 7h.01M9 11h.01M15 7h.01M15 11h.01"/></svg>',
  mare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/><path d="M2 15c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/></svg>',
  cultura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M2 10l10-6 10 6"/></svg>',
  animali: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="9" r="1.6"/><circle cx="12" cy="6.5" r="1.6"/><circle cx="17" cy="9" r="1.6"/><path d="M12 12c-3 0-5 2-5 4.2 0 1.6 1.3 2.8 2.9 2.6.9-.1 1.4-.6 2.1-.6s1.2.5 2.1.6c1.6.2 2.9-1 2.9-2.6 0-2.2-2-4.2-5-4.2z"/></svg>',
  trasferimento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a4 4 0 0 0 4-4 4 4 0 0 0-4-4H9a4 4 0 0 1-4-4 4 4 0 0 1 4-4h7"/></svg>',
  avventura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6z"/></svg>',
};

// Genera le parti dinamiche del documento. Il guscio HTML/CSS resta in
// src/lib/exportTemplateHtml.js: le parti restituite vengono sostituite ai
// segnaposto {{...}} dal renderExportTemplate.
//
// Parametri waves-specific (opzionali, usati solo dal template waves):
//   country, continent, description, difficulty, budget, bestPeriod, transport, tips, sourceUrl
export function buildParts({
  tripTitle,
  days,
  extras,
  coverImageUrl,
  categories = CATEGORIES,
  country = "",
  continent = "",
  description = "",
  difficulty = "",
  budget = "",
  bestPeriod = "",
  transport = "",
  tips = "",
  sourceUrl = "",
}) {
  const sortedDayEntries = Object.entries(days || {}).sort(([a], [b]) => (a < b ? -1 : 1));

  let dateRangeLabel = "";
  if (sortedDayEntries.length) {
    const firstIso = sortedDayEntries[0][0];
    const lastIso = sortedDayEntries[sortedDayEntries.length - 1][0];
    const fd = fromISO(firstIso), ld = fromISO(lastIso);
    const nDays = sortedDayEntries.length;
    const dayLabel = nDays === 1 ? "1 giorno" : `${nDays} giorni`;
    const sameMonth = fd.getMonth() === ld.getMonth() && fd.getFullYear() === ld.getFullYear();
    if (firstIso === lastIso) {
      dateRangeLabel = `${fd.getDate()} ${MONTHS[fd.getMonth()].toLowerCase()} ${fd.getFullYear()} · ${dayLabel}`;
    } else if (sameMonth) {
      dateRangeLabel = `${fd.getDate()} – ${ld.getDate()} ${MONTHS[fd.getMonth()].toLowerCase()} ${fd.getFullYear()} · ${dayLabel}`;
    } else {
      dateRangeLabel = `${fd.getDate()} ${MONTHS[fd.getMonth()].slice(0, 3).toLowerCase()} – ${ld.getDate()} ${MONTHS[ld.getMonth()].slice(0, 3).toLowerCase()} ${ld.getFullYear()} · ${dayLabel}`;
    }
  }

  const dayBlocks = sortedDayEntries.map(([iso, entry], i) => {
    const d = fromISO(iso);
    const cats = (entry.categories || []).map((cid) => categories.find((c) => c.id === cid)).filter(Boolean);
    const accent = cats[0] ? cats[0].color : "#2E6F8E";
    const activities = entry.activities.filter((a) => a.trim());
    const hasImage = !!entry.image;
    const imgSide = i % 2 === 0 ? "img-right" : "img-left";
    return `
      <div class="tl-item">
        <div class="tl-rail">
          <div class="tl-node" style="background:${accent}"></div>
          <div class="tl-line"></div>
        </div>
        <div class="tl-content ${hasImage ? `has-image ${imgSide}` : ""}">
          <div class="tl-text">
            <p class="tl-date" style="color:${accent}">${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} · Giorno ${i + 1}</p>
            ${entry.place ? `<h3>${escapeHtml(entry.place)}</h3>` : ""}
            ${cats.length ? `<div class="tags">${cats.map((c) => `<span class="tag" style="background:${c.color}1A;color:${c.color}">${escapeHtml(c.label)}</span>`).join("")}</div>` : ""}
            ${activities.length ? `<ul class="acts">${activities.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>` : `<p class="muted">Nessuna attività in programma</p>`}
            ${entry.accommodation ? `<p class="stay">🌙&nbsp; ${escapeHtml(entry.accommodation)}</p>` : ""}
          </div>
          ${hasImage ? `<div class="tl-image"><img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.place || "")}" onerror="this.parentElement.style.display='none'"></div>` : ""}
        </div>
      </div>`;
  }).join("");

  const categoryCounts = {};
  sortedDayEntries.forEach(([, entry]) => {
    (entry.categories || []).forEach((cid) => {
      categoryCounts[cid] = (categoryCounts[cid] || 0) + 1;
    });
  });
  const totalCategoryTags = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([cid, count]) => {
      const cat = categories.find((c) => c.id === cid);
      if (!cat) return null;
      return { id: cid, label: cat.label, color: cat.color, pct: Math.round((count / totalCategoryTags) * 100) };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  const categoryBreakdownBlock = categoryBreakdown.length
    ? `
  <p class="section-label">Stile del viaggio</p>
  <div class="cat-breakdown">
    ${categoryBreakdown.map((c) => `
      <div class="cat-row-item">
        <span class="cat-row-icon" style="color:${c.color}">${CATEGORY_ICON_SVGS[c.id] || EXPORT_ICON_DEFAULT}</span>
        <span class="cat-row-label">${escapeHtml(c.label)}</span>
        <div class="cat-row-bar"><span style="width:${c.pct}%;background:${c.color}"></span></div>
        <span class="cat-row-pct">${c.pct}%</span>
      </div>`).join("")}
  </div>`
    : "";

  const flightCardHtml = (extras || [])
    .filter((extra) => extra.type === "flight")
    .map((extra) => {
      const meta = EXTRA_META.find((t) => t.id === extra.type) || DEFAULT_EXTRA_META;
      const iconSvg = EXPORT_ICON_SVGS.flight || EXPORT_ICON_DEFAULT;
      const flights = (extra.flights || []).filter((f) => f.number || f.airline || f.depCity || f.arrCity);
      return `
        <div class="info-card flight-card">
          <div class="info-card-head">
            <span class="info-icon" style="color:${meta.color}">${iconSvg}</span>
            <p class="info-card-title">${escapeHtml(extra.title)}</p>
          </div>
          ${flights.length ? flights.map((f) => `
            <div class="flight-row">
              <p class="flight-meta">${[escapeHtml(f.number), escapeHtml(f.airline)].filter(Boolean).join(" · ") || "Volo"}</p>
              <div class="flight-route-row">
                <span><strong>${escapeHtml(f.depCity) || "—"}</strong>${f.depTime ? ` ${escapeHtml(f.depTime)}` : ""}</span>
                <span class="arrow">→</span>
                <span><strong>${escapeHtml(f.arrCity) || "—"}</strong>${f.arrTime ? ` ${escapeHtml(f.arrTime)}` : ""}</span>
              </div>
            </div>`).join("") : `<p class="muted">Nessun volo inserito</p>`}
        </div>`;
    }).join("");

  const infoCards = (extras || []).filter((extra) => extra.type !== "flight" && extra.type !== "map").map((extra) => {
    const meta = EXTRA_META.find((t) => t.id === extra.type) || DEFAULT_EXTRA_META;
    const iconSvg = EXPORT_ICON_SVGS[extra.type] || EXPORT_ICON_DEFAULT;
    const isPacking = extra.type === "packing";
    const isCosts = extra.type === "costs";
    const cardHead = `
      <div class="info-card-head">
        <span class="info-icon" style="color:${meta.color}">${iconSvg}</span>
        <p class="info-card-title">${escapeHtml(extra.title)}</p>
      </div>`;

    if (isCosts) {
      const rows = extra.lines.filter((l) => (l.desc || "").trim() || (l.value || "").trim());
      const total = rows.reduce((sum, l) => sum + (parseFloat(String(l.value).replace(",", ".")) || 0), 0);
      const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
      return `
        <div class="info-card cost-card">
          ${cardHead}
          ${rows.length ? `<table class="cost-table">${rows.map((l) => `<tr><td>${escapeHtml(l.desc)}</td><td class="val">${fmt(parseFloat(String(l.value).replace(",", ".")) || 0)}</td></tr>`).join("")}</table>` : `<p class="muted">Nessuna voce</p>`}
          <div class="cost-total"><span>Totale</span><span>${fmt(total)}</span></div>
        </div>`;
    }

    const lines = extra.lines.filter((l) => l.text.trim());
    return `
      <div class="info-card">
        ${cardHead}
        ${lines.length ? `<ul class="acts">${lines.map((l) => `<li>${isPacking ? (l.done ? "☑ " : "☐ ") : ""}${escapeHtml(l.text)}</li>`).join("")}</ul>` : `<p class="muted">Nessuna voce</p>`}
      </div>`;
  }).join("");

  const coverStyle = coverImageUrl
    ? `background: linear-gradient(180deg, rgba(28,67,63,.15) 0%, rgba(28,67,63,.82) 100%), url('${escapeHtml(coverImageUrl)}') center/cover no-repeat;`
    : `background: linear-gradient(135deg, #1F3A4D 0%, #2E6F8E 100%);`;

  // Sezione "Percorso": presente solo quando l'utente ha aggiunto la scheda Mappa.
  // La mappa è SVG inline generato dai luoghi della scheda: nessuna richiesta
  // esterna quando l'HTML viene aperto.
  const mapExtra = (extras || []).find((extra) => extra.type === "map");
  const mapSection = mapExtra
    ? (() => {
        const points = routePointsFromList(mapExtra.locations || []);
        if (!points.markers.length) {
          return `<p class="section-label">Percorso</p><p class="muted">Aggiungi i luoghi alla scheda Mappa per vedere il percorso.</p>`;
        }
        const svg = buildTravelMapSvg(points, { title: tripTitle || "" });
        return `<p class="section-label">Percorso</p><div class="map-frame">${svg}</div>`;
      })()
    : "";

  // Full map section for waves template (wraps SVG + route stops in a section)
  // Only rendered when a map extra exists AND has at least one valid location.
  let mapSectionFull = "";
  if (mapExtra) {
    const points = routePointsFromList(mapExtra.locations || []);
    if (points.markers.length > 0) {
      const svg = buildTravelMapSvg(points, { title: tripTitle || "" });
      const routeStops = [];
      sortedDayEntries.forEach(([iso, entry]) => {
        const place = entry.place;
        if (place && (routeStops.length === 0 || routeStops[routeStops.length - 1].place !== place)) {
          routeStops.push({ place, iso });
        }
      });
      const routeHtml = routeStops
        .map((s) => `<div class="stop"><div class="pt"></div><div class="sidx">${escapeHtml(s.iso)}</div><div class="sname">${escapeHtml(s.place)}</div></div>`)
        .join("");
      mapSectionFull = `
<section id="map">
  <div class="wrap">
    <div class="section-head">
      <div class="label">Itinerario sulla mappa</div>
      <h2 class="section-title serif">Rotta del viaggio</h2>
    </div>
    <div class="map-frame">${svg}</div>
    <p class="lede" style="text-align:left">Schema indicativo delle tappe, in ordine di visita.</p>
    <div class="route-line">
      <div class="route-track">${routeHtml}</div>
    </div>
  </div>
</section>`;
    }
  }

  // --- Waves-specific parts ---

  const heroEyebrow = [continent, country].filter(Boolean).join(" · ") || "Itinerario di viaggio";

  const titleParts = (tripTitle || "Il mio viaggio").split("–").map((s) => s.trim());
  const heroSub = titleParts[1] || "";

  const nDays = sortedDayEntries.length;
  const heroNavRight = `${nDays} giorni · Itinerario`;

  const overviewTitle = heroSub ? `${titleParts[0]} — ${heroSub}` : tripTitle || "Il mio viaggio";

  const overviewFacts = [
    ["Durata", `${nDays} giorni`],
    ["Difficoltà", difficulty],
    ["Budget", budget],
    ["Periodo ideale", bestPeriod],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<div class="fact"><div class="fkey">${escapeHtml(k)}</div><div class="fval">${escapeHtml(v)}</div></div>`
    )
    .join("");

  const overviewTransport = transport
    ? `<b>Trasporti — </b>${escapeHtml(transport)}`
    : "";

  const daystrip = sortedDayEntries
    .map(([iso], i) => {
      const d = fromISO(iso);
      const dayName = sortedDayEntries[i][1].place || "";
      return `<div class="daychip"><div class="dn">${String(i + 1).padStart(2, "0")}</div><div class="dp">${escapeHtml(dayName)}</div></div>`;
    })
    .join("");

  // --- Waves extras (costs, checklist, tips) ---
  const costsBlocks = (extras || []).filter((e) => e.type === "costs");
  const otherBlocks = (extras || []).filter((e) => e.type !== "costs" && e.type !== "flight" && e.type !== "map");

  const costsHtml = costsBlocks
    .map((e) => {
      const rows = (e.lines || [])
        .filter((l) => (l.desc || "").trim() || (l.value || "").trim())
        .map(
          (l) =>
            `<tr><td class="desc">${escapeHtml(l.desc)}</td><td class="val">${escapeHtml(l.value)}</td></tr>`
        )
        .join("");
      return `<div class="extra-block"><h3 class="extra-title serif">${escapeHtml(e.title || "Costi")}</h3><table class="costs">${rows}</table></div>`;
    })
    .join("");

  const checklistHtml = otherBlocks
    .map((e) => {
      const items = (e.lines || [])
        .filter((l) => (l.text || "").trim())
        .map((l) => `<li><span class="box"></span><span>${escapeHtml(l.text)}</span></li>`)
        .join("");
      return `<div class="extra-block"><h3 class="extra-title serif">${escapeHtml(e.title || "Note")}</h3><ul class="checklist">${items}</ul></div>`;
    })
    .join("");

  const extrasGrid = `<div class="extras-col">${costsHtml}</div><div class="extras-col">${checklistHtml}</div>`;

  const tipsHtml = tips
    ? `<b>Da sapere prima di partire — </b>${escapeHtml(tips)}`
    : "";
  const tipsStyle = tips ? "" : ' style="display:none"';

  const footerSrc = sourceUrl
    ? `Fonte itinerario · <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(sourceUrl.replace("https://", ""))}</a>`
    : "";

  return {
    title: tripTitle || "Il mio viaggio",
    coverStyle,
    coverSub: dateRangeLabel ? `<p class="cover-sub">${dateRangeLabel}</p>` : "",
    styleBreakdown: categoryBreakdownBlock,
    map: mapSection,
    flights: flightCardHtml ? `<div class="info-stack flight-top">${flightCardHtml}</div>` : "",
    days: dayBlocks || '<p class="muted">Nessuna giornata pianificata.</p>',
    extras: infoCards ? `<p class="section-label">Informazioni per il viaggio</p><div class="info-stack">${infoCards}</div>` : "",
    // Waves-specific
    heroEyebrow,
    heroSub,
    heroNavRight,
    overviewTitle,
    overviewDesc: description ? escapeHtml(description) : "",
    overviewFacts,
    overviewTransport,
    daystrip,
    extrasGrid,
    tips: tipsHtml,
    tipsStyle,
    mapSectionFull,
    footerSrc,
  };
}

// Sostituisce i segnaposto {{TOKEN}} del template HTML con le parti dinamiche.
// Usa split/join invece di replace: evita che i caratteri speciali nei valori
// ($, &, ecc.) vengano interpretati come pattern.
export function renderExportTemplate(template, parts) {
  const insert = (src, token, value) => src.split(token).join(value);
  let html = template;
  html = insert(html, "{{TITLE}}", escapeHtml(parts.title));
  html = insert(html, "{{COVER_STYLE}}", parts.coverStyle);
  html = insert(html, "{{COVER_SUB}}", parts.coverSub);
  html = insert(html, "{{STYLE_BREAKDOWN}}", parts.styleBreakdown);
  html = insert(html, "{{MAP}}", parts.map);
  html = insert(html, "{{FLIGHTS}}", parts.flights);
  html = insert(html, "{{DAYS}}", parts.days);
  html = insert(html, "{{EXTRAS}}", parts.extras);
  // Waves-specific tokens
  if (parts.heroEyebrow !== undefined) html = insert(html, "{{HERO_EYEBROW}}", parts.heroEyebrow);
  if (parts.heroSub !== undefined) html = insert(html, "{{HERO_SUB}}", parts.heroSub);
  if (parts.heroNavRight !== undefined) html = insert(html, "{{HERO_NAV_RIGHT}}", parts.heroNavRight);
  if (parts.overviewTitle !== undefined) html = insert(html, "{{OVERVIEW_TITLE}}", parts.overviewTitle);
  if (parts.overviewDesc !== undefined) html = insert(html, "{{OVERVIEW_DESC}}", parts.overviewDesc);
  if (parts.overviewFacts !== undefined) html = insert(html, "{{OVERVIEW_FACTS}}", parts.overviewFacts);
  if (parts.overviewTransport !== undefined) html = insert(html, "{{OVERVIEW_TRANSPORT}}", parts.overviewTransport);
  if (parts.daystrip !== undefined) html = insert(html, "{{DAYSTRIP}}", parts.daystrip);
  if (parts.extrasGrid !== undefined) html = insert(html, "{{WAVES_EXTRAS}}", parts.extrasGrid);
  if (parts.tips !== undefined) html = insert(html, "{{TIPS}}", parts.tips);
  if (parts.tipsStyle !== undefined) html = insert(html, "{{TIPS_STYLE}}", parts.tipsStyle);
  if (parts.mapSectionFull !== undefined) html = insert(html, "{{MAP_SECTION}}", parts.mapSectionFull);
  if (parts.footerSrc !== undefined) html = insert(html, "{{FOOTER_SRC}}", parts.footerSrc);
  return html;
}