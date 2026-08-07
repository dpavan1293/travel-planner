import React, { useState, useEffect, useRef } from "react";
import storage from "./storage";
import { Plane, Luggage, FileText, Moon, Plus, X, ChevronLeft, ChevronRight, Trash2, GripVertical, CalendarRange, Printer, ArrowLeft, MapPin, ShieldCheck, Syringe, StickyNote, Receipt, ArrowRight, Image as ImageIcon, Search } from "lucide-react";

const CATEGORIES = [
  { id: "citta", label: "Città", color: "#2F6F6B" },
  { id: "mare", label: "Mare", color: "#1F86A8" },
  { id: "cultura", label: "Cultura", color: "#6B4F8A" },
  { id: "animali", label: "Animali", color: "#6B8E4E" },
  { id: "trasferimento", label: "Trasferimento", color: "#7A7566" },
  { id: "avventura", label: "Avventura", color: "#C1503C" },
];

const EXTRA_TYPES = [
  { id: "flight", label: "Volo", icon: Plane, color: "#2E6F8E" },
  { id: "security", label: "Sicurezza", icon: ShieldCheck, color: "#C1503C" },
  { id: "vaccines", label: "Vaccinazioni", icon: Syringe, color: "#3F7D4A" },
  { id: "packing", label: "Cosa portare", icon: Luggage, color: "#B98B3E" },
  { id: "costs", label: "Costi", icon: Receipt, color: "#4A7A5E" },
  { id: "notes", label: "Note", icon: StickyNote, color: "#7C6FDB" },
];
const DEFAULT_EXTRA_META = { label: "Scheda", icon: FileText, color: "#7A7566" };

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

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const WEEKDAYS = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const WEEKDAYS_SHORT = ["lun","mar","mer","gio","ven","sab","dom"];

function pad(n) { return String(n).padStart(2, "0"); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function formatShortDate(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()} ${d.getFullYear()}`;
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

const emptyDay = () => ({ place: "", activities: [""], accommodation: "", categories: [], image: "" });
const emptyFlight = () => ({ id: uid(), number: "", airline: "", depTime: "", depCity: "", arrTime: "", arrCity: "" });

const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;650;700&display=swap');

  .tp-root {
    --ink: #1B2430;
    --muted: rgba(27,36,48,0.62);
    --line: rgba(255,255,255,0.55);
    --glass: rgba(255,255,255,0.4);
    --glass-strong: rgba(255,255,255,0.62);
    --glass-border: rgba(255,255,255,0.65);
    --accent: #2E6F8E;
    --accent-dark: #204F66;
    --teal: #1F5C56;
    --coral: #C1503C;
    --brass-dark: #8C6A2E;
    --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
    --font-text: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
    --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Inter", monospace;
    --font-page-title: "Canela", Georgia, serif;
    font-family: var(--font-text);
    color: var(--ink);
    min-height: 100vh;
    min-height: 100dvh;
    padding: 32px 20px 80px;
    box-sizing: border-box;
    position: relative;
    overflow-x: hidden;
    background: linear-gradient(135deg, #AEE1F9 0%, #8FD3D9 40%, #7FCBB4 65%, #F5C089 100%);
    background-attachment: fixed;
  }
  .tp-root * { box-sizing: border-box; }
  .tp-wrap { max-width: 720px; margin: 0 auto; position: relative; z-index: 1; }

  .tp-blob { position: fixed; border-radius: 50%; filter: blur(70px); z-index: 0; pointer-events: none; animation: floaty 20s ease-in-out infinite; }
  .tp-blob-1 { width: 440px; height: 440px; background: rgba(255,255,255,0.55); top: -140px; left: -120px; }
  .tp-blob-2 { width: 380px; height: 380px; background: rgba(247,178,103,0.55); bottom: -160px; right: -90px; animation-delay: -7s; }
  .tp-blob-3 { width: 320px; height: 320px; background: rgba(94,168,201,0.5); top: 45%; right: -140px; animation-delay: -13s; }
  @keyframes floaty { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(18px,-22px); } }
  @media (prefers-reduced-motion: reduce) { .tp-blob { animation: none; } }

  .tp-header { margin-bottom: 28px; }
  .tp-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .tp-eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-dark); margin: 0; }
  .back-link {
    display: flex; align-items: center; gap: 5px; border: none; background: var(--glass); backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 6px 12px;
    color: var(--ink); font-size: 12.5px; cursor: pointer;
  }
  .back-link:hover { background: var(--glass-strong); }
  .export-btn {
    display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.45);
    background: linear-gradient(135deg, rgba(46,111,142,0.92), rgba(32,79,102,0.92));
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    color: #fff; font-size: 12.5px; padding: 8px 15px; border-radius: 20px; cursor: pointer; white-space: nowrap;
    box-shadow: 0 6px 18px rgba(32,79,102,0.3);
  }
  .export-btn:hover { filter: brightness(1.08); }
  .export-btn:disabled { opacity: .5; cursor: default; }
  .tp-title-input {
    font-family: var(--font-page-title); font-size: 34px; font-weight: 350; color: var(--ink);
    border: none; background: transparent; padding: 2px 0; width: 100%; outline: none;
    border-bottom: 1px solid transparent;
  }
  .tp-title-input:hover, .tp-title-input:focus { border-bottom: 1px solid var(--glass-border); }
  .cover-toggle-link { border: none; background: none; color: var(--muted); font-size: 12.5px; cursor: pointer; padding: 6px 0 0; }
  .cover-toggle-link:hover { color: var(--accent-dark); }
  .cover-input-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .cover-input-row .tp-input { flex: 1; }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(15,25,35,0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px;
  }
  .modal-card {
    background: rgba(255,255,255,0.88); backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid var(--glass-border); border-radius: 22px; width: 100%; max-width: 560px; max-height: 80vh;
    display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(15,25,35,0.35); overflow: hidden;
  }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; }
  .modal-title { font-family: var(--font-display); font-weight: 650; font-size: 17px; margin: 0; }
  .modal-search-row { display: flex; gap: 8px; padding: 0 20px 14px; }
  .modal-search-row .tp-input { flex: 1; }
  .modal-body { padding: 0 20px 16px; overflow-y: auto; flex: 1; }
  .unsplash-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .unsplash-thumb {
    position: relative; border: none; padding: 0; border-radius: 10px; overflow: hidden; cursor: pointer;
    aspect-ratio: 4 / 3; background: var(--glass);
  }
  .unsplash-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .unsplash-thumb:hover img { filter: brightness(0.85); }
  .unsplash-credit {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 6px; font-size: 9.5px; color: #fff;
    background: linear-gradient(0deg, rgba(0,0,0,0.65), transparent); text-align: left;
  }
  .modal-footnote { font-size: 11px; color: var(--muted); text-align: center; padding: 10px 20px 16px; margin: 0; }
  .modal-footnote a { color: var(--accent-dark); }
  @media (max-width: 480px) {
    .unsplash-grid { grid-template-columns: repeat(2, 1fr); }
    .modal-card { max-height: 85vh; }
  }

  .tp-card {
    background: var(--glass); backdrop-filter: blur(26px) saturate(160%); -webkit-backdrop-filter: blur(26px) saturate(160%);
    border: 1px solid var(--glass-border); border-radius: 24px; padding: 20px; margin-bottom: 20px;
    box-shadow: 0 10px 34px rgba(15,30,45,0.14), inset 0 1px 0 rgba(255,255,255,0.55);
  }
  .tp-section-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 14px; }

  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .cal-month { font-family: var(--font-display); font-size: 16px; font-weight: 600; text-transform: capitalize; }
  .cal-nav { display: flex; gap: 6px; }
  .cal-nav button {
    border: 1px solid var(--glass-border); background: var(--glass); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-radius: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink);
  }
  .cal-nav button:hover { background: var(--glass-strong); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .cal-wd { font-family: var(--font-mono); font-size: 9px; text-align: center; color: var(--muted); padding-bottom: 3px; text-transform: uppercase; }
  .cal-cell {
    position: relative; height: 30px; border-radius: 8px; border: 1px solid transparent;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; font-size: 11.5px; color: var(--ink); background: transparent;
  }
  .cal-cell:hover { background: var(--glass); }
  .cal-cell.dim { color: rgba(27,36,48,0.32); }
  .cal-cell.today { border-color: var(--accent); font-weight: 600; }
  .cal-cell.selected { background: rgba(27,36,48,0.85); backdrop-filter: blur(6px); color: #fff; }
  .cal-dots { position: absolute; bottom: 3px; display: flex; gap: 2px; }
  .cal-dot-mini { width: 4px; height: 4px; border-radius: 50%; box-shadow: 0 0 4px currentColor; }

  .range-zone { margin-top: 14px; }
  .range-form { border: 1px solid var(--glass-border); background: rgba(255,255,255,0.2); border-radius: 16px; padding: 14px; }
  .range-form-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .range-form-row > div { flex: 1; }
  .range-form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }

  .day-editor { border-top: 1px solid var(--glass-border); margin-top: 16px; padding-top: 16px; }
  .day-editor-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 8px; }
  .day-editor-head-actions { display: flex; align-items: center; gap: 4px; }
  .day-editor-date { font-family: var(--font-mono); font-size: 13px; color: var(--muted); flex: 1; text-align: center; }
  .icon-btn {
    border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--muted);
    display: flex; align-items: center; padding: 5px; border-radius: 8px;
  }
  .icon-btn:hover { background: var(--glass); color: var(--coral); }

  .field-label { font-size: 12px; color: var(--muted); margin: 0 0 6px; font-weight: 500; }
  .tp-input, .tp-textinput {
    width: 100%; border: 1px solid var(--glass-border); border-radius: 12px; padding: 9px 12px;
    font-family: var(--font-text); font-size: 14px; color: var(--ink); background: rgba(255,255,255,0.55);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); outline: none;
  }
  .tp-input::placeholder, .tp-textinput::placeholder { color: rgba(27,36,48,0.42); }
  .tp-input:focus, .tp-textinput:focus { border-color: var(--accent); background: rgba(255,255,255,0.75); }
  .place-input { font-family: var(--font-display); font-size: 17px; font-weight: 600; }
  .image-field-row { display: flex; align-items: center; gap: 10px; }
  .image-field-row .tp-input { flex: 1; }
  .image-preview { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--glass-border); }

  .cat-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .cat-chip {
    font-size: 12.5px; padding: 6px 12px; border-radius: 20px; border: 1px solid var(--glass-border);
    cursor: pointer; background: rgba(255,255,255,0.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    color: var(--ink); display: flex; align-items: center; gap: 6px;
  }
  .cat-chip .dot { width: 7px; height: 7px; border-radius: 50%; }
  .cat-chip.active { border-color: currentColor; font-weight: 500; background: rgba(255,255,255,0.6); }
  .ticket-body .cat-tags { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 0 5px; }
  .ticket-body .cat-tag {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; font-weight: 600; padding: 2px 8px;
    border-radius: 10px; background: rgba(255,255,255,0.5);
  }

  .field-block { margin-bottom: 16px; }
  .list-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .list-row.drag-over { background: rgba(255,255,255,0.3); border-radius: 12px; }
  .list-row .tp-input { flex: 1; }
  .grip { cursor: grab; color: var(--muted); display: flex; align-items: center; padding: 2px; flex-shrink: 0; }
  .grip:active { cursor: grabbing; }
  .add-line-btn {
    display: flex; align-items: center; gap: 6px; border: 1px dashed var(--glass-border); background: rgba(255,255,255,0.2);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    color: var(--muted); font-size: 13px; padding: 8px 12px; border-radius: 12px; cursor: pointer; width: 100%;
    justify-content: center; margin-top: 4px;
  }
  .add-line-btn:hover { border-color: var(--accent); color: var(--accent-dark); }

  .day-editor-footer { display: flex; justify-content: flex-end; margin-top: 4px; }
  .danger-link { color: var(--coral); background: none; border: none; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 6px 4px; }
  .danger-link:hover { text-decoration: underline; }

  .ticket-list { display: flex; flex-direction: column; gap: 10px; }
  .ticket {
    position: relative; display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,0.4);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--glass-border); border-radius: 18px; padding: 14px 16px; cursor: pointer; transition: border-color .15s, transform .15s;
    box-shadow: 0 6px 20px rgba(15,30,45,0.1);
  }
  .ticket:hover { border-color: var(--accent); transform: translateY(-1px); }
  .date-badge {
    width: 56px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 9px 2px; border-radius: 14px; background: rgba(255,255,255,0.5); border: 1px solid var(--glass-border);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
  }
  .date-badge .wd { font-family: var(--font-text); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  .date-badge .dnum { font-family: var(--font-display); font-size: 23px; font-weight: 650; line-height: 1; margin: 3px 0; }
  .date-badge .mo { font-family: var(--font-text); font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
  .ticket-body { flex: 1; padding: 2px 0; min-width: 0; }
  .ticket-body .place-title { font-family: var(--font-display); font-size: 15.5px; font-weight: 600; margin: 0 0 3px; color: var(--ink); }
  .ticket-body .cat { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; margin: 0 0 4px; }
  .ticket-body .acts { font-size: 13.5px; color: var(--ink); margin: 0 0 4px; line-height: 1.4; }
  .ticket-body .stay { font-size: 12.5px; color: var(--muted); display: flex; align-items: center; gap: 5px; }

  .extras-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .add-extra-wrap { position: relative; flex-shrink: 0; }
  .add-extra-btn {
    display: flex; align-items: center; gap: 6px; border: 1px dashed var(--glass-border); background: rgba(255,255,255,0.25);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    color: var(--muted); font-size: 13px; padding: 10px 14px; border-radius: 14px; cursor: pointer; height: 100%;
  }
  .add-extra-btn:hover { border-color: var(--accent); color: var(--accent-dark); }
  .extra-menu {
    position: absolute; top: calc(100% + 6px); left: 0; background: rgba(255,255,255,0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border); border-radius: 14px; box-shadow: 0 10px 28px rgba(15,30,45,0.18); z-index: 5; min-width: 170px; overflow: hidden;
  }
  .extra-menu button {
    display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: none; text-align: left;
    padding: 9px 12px; font-size: 13.5px; cursor: pointer; color: var(--ink);
  }
  .extra-menu button:hover { background: rgba(255,255,255,0.6); }
  .extra-menu-ic { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .extra-card {
    background: rgba(255,255,255,0.4); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--glass-border); border-radius: 18px; padding: 16px; margin-top: 12px;
    box-shadow: 0 6px 20px rgba(15,30,45,0.1);
  }
  .extra-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .extra-card-head .ic {
    width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,0.5);
    display: flex; align-items: center; justify-content: center; color: var(--accent-dark); flex-shrink: 0;
  }
  .extra-title-input { flex: 1; border: none; background: transparent; font-family: var(--font-display); font-size: 17px; font-weight: 600; outline: none; }
  .check-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .check-row input[type=checkbox] { width: 16px; height: 16px; accent-color: var(--accent); flex-shrink: 0; }
  .check-row .tp-input.done { text-decoration: line-through; color: var(--muted); }

  .cost-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .cost-row .desc-input { flex: 1; }
  .cost-row .value-input { width: 90px; text-align: right; flex-shrink: 0; }
  .cost-total {
    display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 12px;
    border-top: 1px solid var(--glass-border); font-family: var(--font-display); font-weight: 650; font-size: 16px; color: var(--ink);
  }

  .flight-card {
    border: 1px solid var(--glass-border); background: rgba(255,255,255,0.28); border-radius: 14px;
    padding: 12px 14px; margin-bottom: 10px;
  }
  .flight-card-top { display: flex; gap: 8px; margin-bottom: 12px; }
  .flight-card-top .tp-input { flex: 1; }
  .flight-route { display: flex; align-items: center; gap: 10px; }
  .flight-point { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .flight-point-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0; font-weight: 600; }
  .flight-arrow { color: var(--accent); flex-shrink: 0; margin-top: 14px; }
  .flight-card-footer { display: flex; justify-content: flex-end; margin-top: 8px; }

  .empty-hint { font-size: 13.5px; color: var(--muted); text-align: center; padding: 18px 0; }

  .launcher-shell { max-width: 440px; margin: 0 auto; text-align: center; min-height: calc(100vh - 112px); min-height: calc(100dvh - 112px); display: flex; flex-direction: column; justify-content: center; }
  .launcher-footer { margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--glass-border); }
  .launcher-footer .back-link { margin: 0 auto; }
  .launcher-title { font-family: var(--font-page-title); font-size: 30px; font-weight: 350; margin: 0 0 6px; }
  .launcher-sub { font-size: 14px; color: var(--muted); margin: 0 0 26px; }
  .create-card {
    background: rgba(255,255,255,0.35); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1.5px dashed var(--glass-border); border-radius: 20px; padding: 26px; margin-bottom: 24px; text-align: center;
  }
  .create-card .field-label { margin-bottom: 10px; text-align: center; }
  .create-stack { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .create-stack .tp-input { width: 100%; font-size: 16px; padding: 11px 13px; text-align: center; }
  .create-stack .export-btn { padding: 10px 28px; }
  .trip-list { display: flex; flex-direction: column; gap: 10px; text-align: left; }
  .trip-card {
    position: relative; display: flex; align-items: center; gap: 14px;
    background: rgba(255,255,255,0.4); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--glass-border); border-radius: 18px; padding: 14px 16px; cursor: pointer;
    transition: border-color .15s, transform .15s; box-shadow: 0 6px 20px rgba(15,30,45,0.1);
  }
  .trip-card:hover { border-color: var(--accent); transform: translateY(-1px); }
  .trip-card .ic {
    width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.55);
    display: flex; align-items: center; justify-content: center; color: var(--teal); flex-shrink: 0;
  }
  .trip-card-title { font-family: var(--font-display); font-size: 17px; font-weight: 600; margin: 0 0 2px; }
  .trip-card-meta { font-size: 12.5px; color: var(--muted); margin: 0; font-family: var(--font-mono); }
  .trip-delete { margin-left: auto; }
  .new-trip-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; max-width: 260px; margin-left: auto; margin-right: auto;
    border: 1px dashed var(--glass-border);
    background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    color: var(--muted); font-size: 13.5px; padding: 12px; border-radius: 16px; cursor: pointer; margin-bottom: 24px;
  }
  .new-trip-btn:hover { border-color: var(--accent); color: var(--accent-dark); }

  @media (max-width: 600px) {
    /* I filtri di sfocatura e lo sfondo fisso richiedono repaint costosi durante
       lo scroll sui browser mobile. Manteniamo lo stile, evitando compositing continuo. */
    .tp-root { padding: 18px 12px 56px; background-attachment: scroll; }
    .tp-blob { display: none; }
    .tp-root *, .tp-root *::before, .tp-root *::after {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    .tp-wrap { max-width: 100%; }
    .tp-header { margin-bottom: 18px; }
    .tp-title-input { font-size: 26px; }
    .tp-card { padding: 14px; border-radius: 18px; margin-bottom: 12px; }
    .cal-header { margin-bottom: 8px; }
    .field-block { margin-bottom: 12px; }
    .field-label { margin-bottom: 4px; }
    .cat-row { margin-bottom: 8px; gap: 5px; }
    .cat-chip { padding: 5px 10px; font-size: 12px; }
    .day-editor { margin-top: 12px; padding-top: 12px; }
    .day-editor-head { margin-bottom: 10px; }
    .list-row { margin-bottom: 6px; }
    .ticket-list { gap: 8px; }
    .ticket { padding: 11px 12px; gap: 11px; }
    .date-badge { width: 46px; padding: 7px 2px; }
    .extra-card { padding: 13px; margin-top: 10px; }
    .extra-card-head { margin-bottom: 9px; }
    .create-card { padding: 16px; }
    .trip-list { gap: 8px; }
    .trip-card { padding: 11px 13px; gap: 11px; }
    .ticket, .trip-card, .extra-card { content-visibility: auto; contain-intrinsic-size: auto 100px; }
    .launcher-shell { min-height: calc(100vh - 74px); min-height: calc(100dvh - 74px); }
    .launcher-title { font-size: 24px; }
    .launcher-sub { margin-bottom: 18px; }
  }

  @media print {
    .tp-root { background: #fff; padding: 0; min-height: 0; }
    .tp-blob { display: none !important; }
    .no-print { display: none !important; }
    .tp-title-input { border: none !important; }
    .tp-card { background: #fff; backdrop-filter: none; box-shadow: none; border: none; border-radius: 0; padding: 0; margin-bottom: 22px; break-inside: avoid; }
    .icon-btn, .add-line-btn, .grip, .add-extra-wrap, .danger-link, .day-editor, .cal-grid, .cal-header, .range-zone { display: none !important; }
    .tp-input, .tp-textinput, .extra-title-input { border: none !important; background: transparent !important; backdrop-filter: none !important; padding: 2px 0 !important; }
    .ticket, .extra-card { background: #fff; backdrop-filter: none; border: 1px solid #ddd; break-inside: avoid; }
    .list-row { margin-bottom: 2px; }
  }
`;

export default function TravelPlanner({ user, onLogout }) {
  const [view, setView] = useState("loading");
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get("trips-index");
        if (res && res.value) {
          setTrips(JSON.parse(res.value));
          setView("launcher");
          return;
        }
      } catch (e) {
        // no index yet
      }
      try {
        const legacy = await storage.get("trip-data");
        if (legacy && legacy.value) {
          const data = JSON.parse(legacy.value);
          const id = uid();
          const entry = { id, title: data.tripTitle || "Il mio viaggio", createdAt: Date.now() };
          await storage.set("trips-index", JSON.stringify([entry]));
          await storage.set(`trip:${id}`, legacy.value);
          setTrips([entry]);
          setView("launcher");
          return;
        }
      } catch (e) {
        // no legacy data either
      }
      setTrips([]);
      setView("launcher");
    })();
  }, []);

  const persistIndex = (next) => {
    setTrips(next);
    storage.set("trips-index", JSON.stringify(next)).catch(() => {});
  };

  const createTrip = async (name) => {
    const title = name.trim() || "Nuovo viaggio";
    const id = uid();
    const entry = { id, title, createdAt: Date.now() };
    persistIndex([entry, ...trips]);
    try {
      await storage.set(`trip:${id}`, JSON.stringify({ tripTitle: title, days: {}, extras: [] }));
    } catch (e) {
      // will retry via autosave once planner loads
    }
    setCurrentTripId(id);
    setView("planner");
  };

  const openTrip = (id) => {
    setCurrentTripId(id);
    setView("planner");
  };

  const deleteTrip = (id) => {
    persistIndex(trips.filter((t) => t.id !== id));
    storage.delete(`trip:${id}`).catch(() => {});
  };

  const renameTrip = (id, title) => {
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, title } : t));
      storage.set("trips-index", JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <div className="tp-root">
      <style>{SHARED_STYLES}</style>
      <div className="tp-blob tp-blob-1" />
      <div className="tp-blob tp-blob-2" />
      <div className="tp-blob tp-blob-3" />
      <div className="tp-wrap">
        {view === "loading" && <p className="empty-hint">Caricamento...</p>}
        {view === "launcher" && (
          <TripLauncher trips={trips} onCreate={createTrip} onOpen={openTrip} onDelete={deleteTrip} user={user} onLogout={onLogout} />
        )}
        {view === "planner" && currentTripId && (
          <PlannerView
            key={currentTripId}
            tripId={currentTripId}
            onBack={() => setView("launcher")}
            onTitleChange={(title) => renameTrip(currentTripId, title)}
          />
        )}
      </div>
    </div>
  );
}

function TripLauncher({ trips, onCreate, onOpen, onDelete, user, onLogout }) {
  const [showForm, setShowForm] = useState(trips.length === 0);
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (showForm && inputRef.current) inputRef.current.focus();
  }, [showForm]);

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name);
    setName("");
    setShowForm(false);
  };

  return (
    <div className="launcher-shell">
      <p className="tp-eyebrow" style={{ marginBottom: 10 }}>Travel planner</p>
      <h1 className="launcher-title">I tuoi viaggi</h1>
      <p className="launcher-sub">
        {trips.length === 0 ? "Dai un nome al tuo primo viaggio per iniziare." : "Scegli un viaggio da continuare a pianificare o creane uno nuovo."}
      </p>

      {showForm ? (
        <div className="create-card">
          <p className="field-label">Nome del viaggio</p>
          <div className="create-stack">
            <input
              ref={inputRef}
              className="tp-input"
              value={name}
              placeholder="Es. Giappone, aprile 2027"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button className="export-btn" onClick={submit}>Crea viaggio</button>
            {trips.length > 0 && (
              <button className="cover-toggle-link" onClick={() => setShowForm(false)}>Annulla</button>
            )}
          </div>
        </div>
      ) : (
        <button className="new-trip-btn" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nuovo viaggio
        </button>
      )}

      {trips.length > 0 && (
        <div className="trip-list">
          {trips.map((t) => (
            <div key={t.id} className="trip-card" onClick={() => onOpen(t.id)}>
              <div className="ic"><MapPin size={18} /></div>
              <div>
                <p className="trip-card-title">{t.title}</p>
                <p className="trip-card-meta">Creato il {formatShortDate(t.createdAt)}</p>
              </div>
              <button
                className="icon-btn trip-delete"
                aria-label="Elimina viaggio"
                onClick={(e) => { e.stopPropagation(); if (window.confirm(`Eliminare il viaggio "${t.title}"? L'azione non è reversibile.`)) onDelete(t.id); }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="launcher-footer">
          <button className="back-link" onClick={onLogout}>
            {user.email || "Account"} · Esci
          </button>
        </div>
      )}
    </div>
  );
}

function PlannerView({ tripId, onBack, onTitleChange }) {
  const [tripTitle, setTripTitle] = useState("");
  const [days, setDays] = useState({});
  const [extras, setExtras] = useState([]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [showUnsplashPicker, setShowUnsplashPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(null);
  const dayEditorRef = useRef(null);
  const scrollOnSelectRef = useRef(false);

  useEffect(() => {
    if (selectedDate && scrollOnSelectRef.current && dayEditorRef.current) {
      dayEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollOnSelectRef.current = false;
  }, [selectedDate]);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const [showRangeForm, setShowRangeForm] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [loaded, setLoaded] = useState(false);

  const allCategories = CATEGORIES;

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(`trip:${tripId}`);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (data.tripTitle) setTripTitle(data.tripTitle);
          if (data.coverImageUrl) { setCoverImageUrl(data.coverImageUrl); setShowCoverInput(true); }
          if (data.days) {
            const migrated = {};
            Object.entries(data.days).forEach(([iso, d]) => {
              migrated[iso] = {
                place: d.place || "",
                activities: d.activities && d.activities.length ? d.activities : [""],
                accommodation: d.accommodation || "",
                categories: d.categories || (d.category ? [d.category] : []),
                image: d.image || "",
              };
            });
            setDays(migrated);
            const isoKeys = Object.keys(migrated);
            if (isoKeys.length) {
              const earliest = isoKeys.sort()[0];
              const startDate = fromISO(earliest);
              setCurrentMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
            }
          }
          if (data.extras) {
            const migratedExtras = data.extras.map((e) =>
              e.type === "flight" && (!e.flights || !e.flights.length) ? { ...e, flights: [emptyFlight()] } : e
            );
            setExtras(migratedExtras);
          }
        }
      } catch (e) {
        // fresh trip, nothing stored yet
      } finally {
        setLoaded(true);
      }
    })();
  }, [tripId]);

  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({ tripTitle, days, extras, coverImageUrl });
    const t = setTimeout(() => {
      storage.set(`trip:${tripId}`, payload).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [tripTitle, days, extras, coverImageUrl, loaded, tripId]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => onTitleChange(tripTitle || "Nuovo viaggio"), 400);
    return () => clearTimeout(t);
  }, [tripTitle, loaded]);

  const grid = getMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth());
  const today = new Date();

  const openDay = (iso) => {
    setDays((prev) => (prev[iso] ? prev : { ...prev, [iso]: emptyDay() }));
    setSelectedDate(iso);
  };

  const navigateDay = (delta) => {
    if (!selectedDate) return;
    const next = fromISO(selectedDate);
    next.setDate(next.getDate() + delta);
    const nextIso = toISO(next);
    setDays((prev) => (prev[nextIso] ? prev : { ...prev, [nextIso]: emptyDay() }));
    setSelectedDate(nextIso);
    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const updateDay = (iso, patch) => setDays((prev) => ({ ...prev, [iso]: { ...prev[iso], ...patch } }));

  const removeDay = (iso) => {
    setDays((prev) => { const n = { ...prev }; delete n[iso]; return n; });
    if (selectedDate === iso) setSelectedDate(null);
  };

  const createRange = () => {
    if (!rangeStart || !rangeEnd) return;
    let start = fromISO(rangeStart);
    let end = fromISO(rangeEnd);
    if (start > end) { const tmp = start; start = end; end = tmp; }
    setDays((prev) => {
      const next = { ...prev };
      const cur = new Date(start);
      while (cur <= end) {
        const iso = toISO(cur);
        if (!next[iso]) next[iso] = emptyDay();
        cur.setDate(cur.getDate() + 1);
      }
      return next;
    });
    setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setShowRangeForm(false);
    setRangeStart("");
    setRangeEnd("");
  };

  const addExtra = (type) => {
    const meta = EXTRA_TYPES.find((t) => t.id === type) || DEFAULT_EXTRA_META;
    const id = uid();
    if (type === "flight") {
      setExtras((prev) => [...prev, { id, type, title: meta.label, flights: [emptyFlight()] }]);
    } else {
      const initialLines = type === "costs" ? [{ desc: "", value: "" }] : [{ text: "", done: false }];
      setExtras((prev) => [...prev, { id, type, title: meta.label, lines: initialLines }]);
    }
    setShowExtraMenu(false);
  };

  const updateExtra = (id, patch) => setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeExtra = (id) => setExtras((prev) => prev.filter((e) => e.id !== id));

  const sortedDayEntries = Object.entries(days).sort(([a], [b]) => (a < b ? -1 : 1));

  const escapeHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const exportItinerary = () => {
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
      const cats = (entry.categories || []).map((cid) => allCategories.find((c) => c.id === cid)).filter(Boolean);
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
        const cat = allCategories.find((c) => c.id === cid);
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

    const flightCardHtml = extras
      .filter((extra) => extra.type === "flight")
      .map((extra) => {
        const meta = EXTRA_TYPES.find((t) => t.id === extra.type) || DEFAULT_EXTRA_META;
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

    const infoCards = extras.filter((extra) => extra.type !== "flight").map((extra) => {
      const meta = EXTRA_TYPES.find((t) => t.id === extra.type) || DEFAULT_EXTRA_META;
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
      ? `background-image: linear-gradient(180deg, rgba(15,26,33,.1) 40%, rgba(15,26,33,.82)), url('${escapeHtml(coverImageUrl)}'); background-size: cover; background-position: center;`
      : `background: linear-gradient(135deg, #1F3A4D 0%, #2E6F8E 100%);`;

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(tripTitle || "Itinerario")}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
  :root { --paper: #FBF9F4; --ink: #22303B; --muted: #7A7B72; --gold: #C9A24B; --rule: #E7E2D6; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: var(--ink); background: #DEDAD0; margin: 0; }
  .sheet { max-width: 880px; margin: 44px auto; background: var(--paper); box-shadow: 0 30px 70px rgba(20,20,15,0.2); overflow: hidden; }
  .cover {
    ${coverStyle}
    min-height: 340px; display: flex; align-items: flex-end; padding: 48px 48px 40px;
  }
  .cover-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,0.75); margin: 0 0 10px; }
  .cover h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 42px; color: #fff; margin: 0 0 8px; line-height: 1.1; }
  .cover-sub { font-family: 'Inter', sans-serif; font-size: 14px; color: rgba(255,255,255,0.88); margin: 0; letter-spacing: .01em; }
  .wrap { padding: 44px 48px 70px; }
  .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 0 0 26px; padding-bottom: 12px; border-bottom: 1px solid var(--rule); }
  .timeline { margin-bottom: 46px; }
  .tl-item { display: flex; gap: 22px; margin-bottom: 30px; break-inside: avoid; }
  .tl-rail { width: 14px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; }
  .tl-node { width: 13px; height: 13px; border-radius: 50%; box-shadow: 0 0 0 4px var(--paper), 0 0 0 5px var(--rule); margin-top: 5px; flex-shrink: 0; }
  .tl-line { width: 2px; flex: 1; background: var(--rule); margin-top: 6px; }
  .tl-item:last-child .tl-line { display: none; }
  .tl-content { flex: 1; padding-bottom: 4px; }
  .tl-content.has-image { display: flex; gap: 22px; align-items: flex-start; }
  .tl-content.has-image.img-left { flex-direction: row-reverse; }
  .tl-text { flex: 1; min-width: 0; }
  .tl-image { width: 190px; flex-shrink: 0; }
  .tl-image img { width: 100%; height: 132px; object-fit: cover; border-radius: 12px; box-shadow: 0 10px 24px rgba(34,48,59,0.16); display: block; }
  .tl-date { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 6px; }
  .tl-text h3 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; margin: 0 0 8px; color: var(--ink); }
  .tags { margin-bottom: 8px; }
  .tag { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin: 0 5px 5px 0; }
  .acts { margin: 6px 0 0; padding: 0; list-style: none; }
  .acts li { position: relative; padding-left: 17px; margin-bottom: 6px; font-size: 14px; line-height: 1.5; }
  .acts li::before { content: ''; position: absolute; left: 0; top: 7px; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); }
  .stay { display: inline-flex; align-items: center; margin-top: 10px; padding: 7px 13px; background: rgba(31,58,77,0.06); border-radius: 10px; font-size: 13px; color: var(--ink); }
  .muted { font-size: 13.5px; color: var(--muted); margin: 4px 0 0; }
  .cat-breakdown { margin-bottom: 44px; display: flex; flex-direction: column; gap: 16px; }
  .cat-row-item { display: flex; align-items: center; gap: 14px; }
  .cat-row-icon { width: 22px; height: 22px; flex-shrink: 0; }
  .cat-row-icon svg { width: 100%; height: 100%; }
  .cat-row-label { width: 120px; flex-shrink: 0; font-size: 13.5px; font-weight: 500; color: var(--ink); }
  .cat-row-bar { flex: 1; height: 7px; border-radius: 6px; background: var(--rule); overflow: hidden; }
  .cat-row-bar span { display: block; height: 100%; }
  .cat-row-pct { width: 38px; flex-shrink: 0; text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }
  .info-stack { display: flex; flex-direction: column; }
  .flight-top { margin-bottom: 44px; }
  .info-card {
    padding: 28px 4px; border-bottom: 1px solid var(--rule); break-inside: avoid;
  }
  .info-stack .info-card:last-child { border-bottom: none; }
  .info-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .info-icon { width: 24px; height: 24px; flex-shrink: 0; }
  .info-icon svg { width: 100%; height: 100%; }
  .info-card-title { font-family: 'Fraunces', serif; font-size: 16.5px; font-weight: 600; margin: 0; color: var(--ink); }
  .cost-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .cost-table td { padding: 6px 0; border-bottom: 1px solid #F1EFE6; }
  .cost-table td.val { text-align: right; white-space: nowrap; padding-left: 12px; }
  .flight-card .info-card-head { justify-content: center; }
  .flight-row { padding: 14px 0; border-bottom: 1px solid #F1EFE6; text-align: center; }
  .flight-row:last-child { border-bottom: none; }
  .flight-meta { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--muted); margin: 0 0 6px; text-transform: uppercase; letter-spacing: .06em; }
  .flight-route-row { font-family: 'IBM Plex Mono', monospace; font-size: 14.5px; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .flight-route-row .arrow { color: var(--muted); }
  .cost-total { display: flex; justify-content: space-between; margin-top: 12px; padding: 10px 14px; background: rgba(201,162,75,0.14); border-radius: 8px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 14.5px; }
  footer { border-top: 1px solid var(--rule); margin-top: 50px; padding-top: 18px; text-align: center; }
  footer p { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0; }
  @media (max-width: 940px) {
    body { background: var(--paper); }
    .sheet { margin: 0; box-shadow: none; max-width: none; }
  }
  @media (max-width: 620px) {
    .cover { padding: 34px 26px 30px; min-height: 260px; }
    .cover h1 { font-size: 30px; }
    .wrap { padding: 32px 22px 50px; }
    .tl-content.has-image, .tl-content.has-image.img-left { flex-direction: column; }
    .tl-image { width: 100%; }
    .tl-image img { height: 170px; }
    .cat-row-label { width: 90px; font-size: 12.5px; }
    .info-card { padding: 22px 0; }
  }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; max-width: none; }
    .cover { break-after: avoid; }
    .tl-item, .info-card { break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="cover">
      <div>
        <p class="cover-eyebrow">Itinerario di viaggio</p>
        <h1>${escapeHtml(tripTitle || "Il mio viaggio")}</h1>
        ${dateRangeLabel ? `<p class="cover-sub">${dateRangeLabel}</p>` : ""}
      </div>
    </div>
    <div class="wrap">
      ${categoryBreakdownBlock}
      ${flightCardHtml ? `<div class="info-stack flight-top">${flightCardHtml}</div>` : ""}
      <p class="section-label">Programma</p>
      <div class="timeline">
        ${dayBlocks || '<p class="muted">Nessuna giornata pianificata.</p>'}
      </div>
      ${infoCards ? `<p class="section-label">Informazioni per il viaggio</p><div class="info-stack">${infoCards}</div>` : ""}
      <footer><p>${escapeHtml(tripTitle || "Itinerario")} — documento di viaggio</p></footer>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(tripTitle || "itinerario").trim().replace(/[^a-z0-9\-_ ]/gi, "") || "itinerario"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="tp-header">
        <div className="tp-header-top no-print">
          <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> I tuoi viaggi</button>
          <button className="export-btn" onClick={exportItinerary} disabled={!loaded}>
            <Printer size={14} /> Esporta itinerario
          </button>
        </div>
        <input
          className="tp-title-input"
          value={tripTitle}
          onChange={(e) => setTripTitle(e.target.value)}
          placeholder="Nome del viaggio"
        />
        {showCoverInput ? (
          <div className="cover-input-row no-print">
            <input
              className="tp-input"
              value={coverImageUrl}
              placeholder="URL immagine di copertina (per l'export)"
              onChange={(e) => setCoverImageUrl(e.target.value)}
            />
            <button
              className="icon-btn"
              onClick={() => setShowUnsplashPicker(true)}
              aria-label="Cerca foto su Unsplash"
              title="Cerca una foto"
            >
              <ImageIcon size={16} />
            </button>
            <button
              className="icon-btn"
              onClick={() => { setShowCoverInput(false); setCoverImageUrl(""); }}
              aria-label="Rimuovi copertina"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button className="cover-toggle-link no-print" onClick={() => setShowCoverInput(true)}>
            + Immagine di copertina (per l'export)
          </button>
        )}
      </div>

      <UnsplashPicker
        open={showUnsplashPicker}
        query={tripTitle}
        onClose={() => setShowUnsplashPicker(false)}
        onSelect={(url) => { setCoverImageUrl(url); setShowCoverInput(true); }}
      />

      <div className="tp-card no-print">
        <div className="cal-header">
          <div className="cal-month">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
          <div className="cal-nav">
            <button aria-label="Mese precedente" onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
            <button aria-label="Mese successivo" onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="cal-grid">
          {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
          {grid.map((d, i) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === currentMonth.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = selectedDate === iso;
            const entry = days[iso];
            const cats = entry && entry.categories ? entry.categories.map((cid) => allCategories.find((c) => c.id === cid)).filter(Boolean) : [];
            return (
              <button
                key={i}
                className={`cal-cell ${!inMonth ? "dim" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => openDay(iso)}
              >
                {d.getDate()}
                {entry && (
                  <span className="cal-dots">
                    {cats.length
                      ? cats.slice(0, 3).map((c) => <span key={c.id} className="cal-dot-mini" style={{ background: isSelected ? "#fff" : c.color, color: c.color }} />)
                      : <span className="cal-dot-mini" style={{ background: isSelected ? "#fff" : "var(--accent)", color: "var(--accent)" }} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="range-zone">
          {!showRangeForm ? (
            <button className="add-line-btn" onClick={() => setShowRangeForm(true)}>
              <CalendarRange size={14} /> Crea più giorni insieme
            </button>
          ) : (
            <div className="range-form">
              <div className="range-form-row">
                <div>
                  <p className="field-label">Dal</p>
                  <input type="date" className="tp-input" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                </div>
                <div>
                  <p className="field-label">Al</p>
                  <input type="date" className="tp-input" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                </div>
              </div>
              <div className="range-form-actions">
                <button className="danger-link" onClick={() => { setShowRangeForm(false); setRangeStart(""); setRangeEnd(""); }}>Annulla</button>
                <button className="export-btn" onClick={createRange}>Crea giornate</button>
              </div>
            </div>
          )}
        </div>

        {selectedDate && days[selectedDate] && (
          <div ref={dayEditorRef}>
            <DayEditor
              iso={selectedDate}
              data={days[selectedDate]}
              categories={allCategories}
              onChange={(patch) => updateDay(selectedDate, patch)}
              onClose={() => setSelectedDate(null)}
              onDelete={() => removeDay(selectedDate)}
              onNavigate={navigateDay}
            />
          </div>
        )}
      </div>

      <div className="tp-card">
        <p className="tp-section-label">Itinerario</p>
        {sortedDayEntries.length === 0 ? (
          <p className="empty-hint">Nessuna giornata ancora. Clicca una data sul calendario per iniziare.</p>
        ) : (
          <div className="ticket-list">
            {sortedDayEntries.map(([iso, entry]) => {
              const d = fromISO(iso);
              const cats = (entry.categories || []).map((cid) => allCategories.find((c) => c.id === cid)).filter(Boolean);
              const activities = entry.activities.filter((a) => a.trim());
              return (
                <div key={iso} className="ticket" onClick={() => { scrollOnSelectRef.current = true; setSelectedDate(iso); }}>
                  <div className="date-badge">
                    <span className="wd">{WEEKDAYS_SHORT[(d.getDay() + 6) % 7]}</span>
                    <span className="dnum">{d.getDate()}</span>
                    <span className="mo">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                  </div>
                  <div className="ticket-body">
                    {entry.place && <p className="place-title">{entry.place}</p>}
                    {cats.length > 0 && (
                      <div className="cat-tags">
                        {cats.map((c) => <span key={c.id} className="cat-tag" style={{ color: c.color }}>{c.label}</span>)}
                      </div>
                    )}
                    <p className="acts">{activities.length ? activities.join(" · ") : "Nessuna attività"}</p>
                    {entry.accommodation && (
                      <p className="stay"><Moon size={12} /> {entry.accommodation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="tp-card">
        <p className="tp-section-label">Schede extra</p>
        <div className="extras-row">
          <div className="add-extra-wrap">
            <button className="add-extra-btn" onClick={() => setShowExtraMenu((s) => !s)}>
              <Plus size={15} /> Aggiungi
            </button>
            {showExtraMenu && (
              <div className="extra-menu">
                {EXTRA_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => addExtra(t.id)}>
                      <span className="extra-menu-ic" style={{ background: `${t.color}26`, color: t.color }}><Icon size={14} /></span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {extras.map((extra) => (
          <ExtraCard key={extra.id} extra={extra} onChange={(patch) => updateExtra(extra.id, patch)} onDelete={() => removeExtra(extra.id)} />
        ))}
      </div>
    </>
  );
}

function DayEditor({ iso, data, categories, onChange, onClose, onDelete, onNavigate }) {
  const d = fromISO(iso);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [showUnsplashPicker, setShowUnsplashPicker] = useState(false);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 60) return;
    onNavigate(deltaX < 0 ? 1 : -1);
  };

  const activeCategories = data.categories || [];
  const toggleCategory = (id) => {
    const next = activeCategories.includes(id) ? activeCategories.filter((c) => c !== id) : [...activeCategories, id];
    onChange({ categories: next });
  };

  const setActivity = (i, val) => {
    const next = [...data.activities];
    next[i] = val;
    onChange({ activities: next });
  };
  const addActivity = () => onChange({ activities: [...data.activities, ""] });
  const removeActivity = (i) => {
    const next = data.activities.filter((_, idx) => idx !== i);
    onChange({ activities: next.length ? next : [""] });
  };
  const handleDrop = (i) => {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setOverIndex(null); return; }
    const next = [...data.activities];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    onChange({ activities: next });
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="day-editor" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="day-editor-head">
        <button className="icon-btn" onClick={() => onNavigate(-1)} aria-label="Giorno precedente"><ChevronLeft size={18} /></button>
        <span className="day-editor-date">{WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()].toLowerCase()} {d.getFullYear()}</span>
        <div className="day-editor-head-actions">
          <button className="icon-btn" onClick={() => onNavigate(1)} aria-label="Giorno successivo"><ChevronRight size={18} /></button>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi"><X size={18} /></button>
        </div>
      </div>

      <div className="field-block">
        <p className="field-label">Titolo / luogo</p>
        <input
          className="tp-textinput place-input"
          value={data.place || ""}
          placeholder="Es. Roma – centro storico"
          onChange={(e) => onChange({ place: e.target.value })}
        />
      </div>

      <div className="field-block">
        <p className="field-label">Immagine (URL, opzionale — per l'export)</p>
        <div className="image-field-row">
          {data.image && <img className="image-preview" src={data.image} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
          <input
            className="tp-input"
            value={data.image || ""}
            placeholder="https://..."
            onChange={(e) => onChange({ image: e.target.value })}
          />
          <button
            className="icon-btn no-print"
            onClick={() => setShowUnsplashPicker(true)}
            aria-label="Cerca foto su Unsplash"
            title="Cerca una foto"
          >
            <ImageIcon size={16} />
          </button>
        </div>
      </div>

      <UnsplashPicker
        open={showUnsplashPicker}
        query={data.place}
        onClose={() => setShowUnsplashPicker(false)}
        onSelect={(url) => onChange({ image: url })}
      />

      <p className="field-label">Categorie</p>
      <div className="cat-row">
        {categories.map((c) => (
          <button
            key={c.id}
            className={`cat-chip ${activeCategories.includes(c.id) ? "active" : ""}`}
            style={{ color: activeCategories.includes(c.id) ? c.color : "var(--ink)" }}
            onClick={() => toggleCategory(c.id)}
          >
            <span className="dot" style={{ background: c.color }} /> {c.label}
          </button>
        ))}
      </div>

      <div className="field-block">
        <p className="field-label">Programma della giornata</p>
        {data.activities.map((a, i) => (
          <div
            className={`list-row ${overIndex === i ? "drag-over" : ""}`}
            key={i}
            onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
            onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
            onDrop={() => handleDrop(i)}
          >
            <span
              className="grip"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              aria-label="Trascina per riordinare"
            >
              <GripVertical size={15} />
            </span>
            <input
              className="tp-input"
              value={a}
              placeholder={`Attività ${i + 1}`}
              onChange={(e) => setActivity(i, e.target.value)}
            />
            <button className="icon-btn" onClick={() => removeActivity(i)} aria-label="Rimuovi attività"><X size={15} /></button>
          </div>
        ))}
        <button className="add-line-btn" onClick={addActivity}><Plus size={14} /> Aggiungi attività</button>
      </div>

      <div className="field-block">
        <p className="field-label">Pernottamento</p>
        <input
          className="tp-textinput"
          value={data.accommodation}
          placeholder="Es. Hotel Bellavista, Roma"
          onChange={(e) => onChange({ accommodation: e.target.value })}
        />
      </div>

      <div className="day-editor-footer">
        <button className="danger-link" onClick={() => { if (window.confirm("Eliminare questa giornata dall'itinerario?")) onDelete(); }}><Trash2 size={13} /> Elimina giornata</button>
      </div>
    </div>
  );
}

function ExtraCard({ extra, onChange, onDelete }) {
  const meta = EXTRA_TYPES.find((t) => t.id === extra.type) || DEFAULT_EXTRA_META;
  const Icon = meta.icon;
  const isPacking = extra.type === "packing";
  const isCosts = extra.type === "costs";
  const isFlight = extra.type === "flight";

  const setLine = (i, patch) => {
    const next = [...extra.lines];
    next[i] = { ...next[i], ...patch };
    onChange({ lines: next });
  };
  const addLine = () => onChange({ lines: [...extra.lines, isCosts ? { desc: "", value: "" } : { text: "", done: false }] });
  const removeLine = (i) => {
    const next = extra.lines.filter((_, idx) => idx !== i);
    onChange({ lines: next.length ? next : [isCosts ? { desc: "", value: "" } : { text: "", done: false }] });
  };

  const setFlight = (i, patch) => {
    const next = [...extra.flights];
    next[i] = { ...next[i], ...patch };
    onChange({ flights: next });
  };
  const addFlight = () => onChange({ flights: [...extra.flights, emptyFlight()] });
  const removeFlight = (i) => {
    const next = extra.flights.filter((_, idx) => idx !== i);
    onChange({ flights: next.length ? next : [emptyFlight()] });
  };

  const total = isCosts
    ? extra.lines.reduce((sum, l) => sum + (parseFloat(String(l.value || "").replace(",", ".")) || 0), 0)
    : 0;
  const formatEUR = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div className="extra-card">
      <div className="extra-card-head">
        <div className="ic" style={{ background: `${meta.color}26`, color: meta.color }}><Icon size={16} /></div>
        <input className="extra-title-input" value={extra.title} onChange={(e) => onChange({ title: e.target.value })} />
        <button className="icon-btn" onClick={() => { if (window.confirm("Eliminare questa scheda?")) onDelete(); }} aria-label="Elimina scheda"><Trash2 size={15} /></button>
      </div>

      {isFlight ? (
        <>
          {extra.flights.map((f, i) => (
            <div className="flight-card" key={f.id || i}>
              <div className="flight-card-top">
                <input
                  className="tp-input"
                  value={f.number}
                  placeholder="Numero volo (es. AZ 123)"
                  onChange={(e) => setFlight(i, { number: e.target.value })}
                />
                <input
                  className="tp-input"
                  value={f.airline}
                  placeholder="Compagnia"
                  onChange={(e) => setFlight(i, { airline: e.target.value })}
                />
              </div>
              <div className="flight-route">
                <div className="flight-point">
                  <p className="flight-point-label">Partenza</p>
                  <input
                    className="tp-input"
                    value={f.depCity}
                    placeholder="Città / aeroporto"
                    onChange={(e) => setFlight(i, { depCity: e.target.value })}
                  />
                  <input
                    type="time"
                    className="tp-input"
                    value={f.depTime}
                    onChange={(e) => setFlight(i, { depTime: e.target.value })}
                  />
                </div>
                <ArrowRight className="flight-arrow" size={16} />
                <div className="flight-point">
                  <p className="flight-point-label">Arrivo</p>
                  <input
                    className="tp-input"
                    value={f.arrCity}
                    placeholder="Città / aeroporto"
                    onChange={(e) => setFlight(i, { arrCity: e.target.value })}
                  />
                  <input
                    type="time"
                    className="tp-input"
                    value={f.arrTime}
                    onChange={(e) => setFlight(i, { arrTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="flight-card-footer">
                <button className="danger-link" onClick={() => removeFlight(i)}><Trash2 size={13} /> Rimuovi volo</button>
              </div>
            </div>
          ))}
          <button className="add-line-btn" onClick={addFlight}><Plus size={14} /> Aggiungi volo</button>
        </>
      ) : isCosts ? (
        <>
          {extra.lines.map((line, i) => (
            <div className="cost-row" key={i}>
              <input
                className="tp-input desc-input"
                value={line.desc || ""}
                placeholder="Descrizione"
                onChange={(e) => setLine(i, { desc: e.target.value })}
              />
              <input
                className="tp-input value-input"
                value={line.value || ""}
                placeholder="0,00"
                inputMode="decimal"
                onChange={(e) => setLine(i, { value: e.target.value })}
              />
              <button className="icon-btn" onClick={() => removeLine(i)} aria-label="Rimuovi riga"><X size={15} /></button>
            </div>
          ))}
          <button className="add-line-btn" onClick={addLine}><Plus size={14} /> Aggiungi voce</button>
          <div className="cost-total">
            <span>Totale</span>
            <span>{formatEUR(total)}</span>
          </div>
        </>
      ) : (
        <>
          {extra.lines.map((line, i) => (
            <div className="check-row" key={i}>
              {isPacking && (
                <input type="checkbox" checked={!!line.done} onChange={(e) => setLine(i, { done: e.target.checked })} />
              )}
              <input
                className={`tp-input ${isPacking && line.done ? "done" : ""}`}
                value={line.text}
                placeholder="Scrivi qui..."
                onChange={(e) => setLine(i, { text: e.target.value })}
              />
              <button className="icon-btn" onClick={() => removeLine(i)} aria-label="Rimuovi riga"><X size={15} /></button>
            </div>
          ))}
          <button className="add-line-btn" onClick={addLine}><Plus size={14} /> Aggiungi riga</button>
        </>
      )}
    </div>
  );
}

// Modale di selezione foto da Unsplash. Componente generico e riutilizzabile:
// oggi è collegato solo all'immagine di copertina del viaggio, ma può essere
// riusato tale e quale per l'immagine di una singola giornata in futuro
// (basta passargli query/onSelect diversi da dove serve).
function UnsplashPicker({ open, query, onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState(query || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearchQuery(query || "");
    runSearch(query || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runSearch = async (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) { setResults([]); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/.netlify/functions/unsplash?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella ricerca");
      setResults(data.results || []);
    } catch (e) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (photo) => {
    onSelect(photo.full);
    if (photo.downloadLocation) {
      fetch(`/.netlify/functions/unsplash?download=${encodeURIComponent(photo.downloadLocation)}`).catch(() => {});
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <p className="modal-title">Scegli una foto</p>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi"><X size={18} /></button>
        </div>

        <div className="modal-search-row">
          <input
            className="tp-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(searchQuery)}
            placeholder="Cerca su Unsplash..."
          />
          <button className="icon-btn" onClick={() => runSearch(searchQuery)} aria-label="Cerca"><Search size={16} /></button>
        </div>

        <div className="modal-body">
          {loading && <p className="empty-hint">Caricamento foto...</p>}
          {!loading && error && <p className="empty-hint" style={{ color: "var(--coral)" }}>{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="empty-hint">Nessuna foto trovata. Prova un'altra ricerca.</p>
          )}
          {!loading && !error && results.length > 0 && (
            <div className="unsplash-grid">
              {results.map((p) => (
                <button key={p.id} className="unsplash-thumb" onClick={() => handlePick(p)}>
                  <img src={p.thumb} alt={p.description} loading="lazy" />
                  {p.authorName && <span className="unsplash-credit">{p.authorName}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="modal-footnote">Foto fornite da <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></p>
      </div>
    </div>
  );
}
