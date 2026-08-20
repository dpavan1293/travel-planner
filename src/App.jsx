import React, { useState, useEffect, useRef } from "react";
import storage, { authHeaders, onStorageError } from "./storage";
import netlifyIdentity from "netlify-identity-widget";
import toucanImage from "./assets/toucan.png";
import { Plane, Luggage, FileText, Moon, Plus, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Trash2, GripVertical, CalendarRange, Printer, ArrowLeft, MapPin, ShieldCheck, Syringe, StickyNote, Receipt, ArrowRight, Image as ImageIcon, Search, ArrowLeftRight, Copy, Share2, Map as MapIcon } from "lucide-react";
import {
  CATEGORIES,
  EXTRA_META,
  DEFAULT_EXTRA_META as DEFAULT_EXTRA_META_BASE,
  MONTHS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  toISO,
  fromISO,
} from "./lib/exportTemplate";
import { routePointsFromList, buildTravelMapSvg } from "./lib/travelMap";

// EXTRA_TYPES aggiunge l'icona lucide-react (usata solo nella UI) ai dati condivisi.
const EXTRA_ICONS = {
  flight: Plane,
  security: ShieldCheck,
  vaccines: Syringe,
  packing: Luggage,
  costs: Receipt,
  notes: StickyNote,
  map: MapIcon,
};
const EXTRA_TYPES = EXTRA_META.map((m) => ({ ...m, icon: EXTRA_ICONS[m.id] }));
const DEFAULT_EXTRA_META = { ...DEFAULT_EXTRA_META_BASE, icon: FileText };

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

// Garantisce che le giornate del viaggio siano sempre consecutive: riempie con giorni vuoti
// qualsiasi "buco" tra la prima e l'ultima data presente.
function fillGaps(daysObj) {
  const keys = Object.keys(daysObj).sort();
  if (keys.length < 2) return daysObj;
  const next = { ...daysObj };
  const cur = fromISO(keys[0]);
  const end = fromISO(keys[keys.length - 1]);
  while (cur <= end) {
    const iso = toISO(cur);
    if (!next[iso]) next[iso] = emptyDay();
    cur.setDate(cur.getDate() + 1);
  }
  return next;
}
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
  .tp-header-actions { display: flex; align-items: center; gap: 8px; }
  .share-panel {
    background: rgba(255,255,255,0.4); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--glass-border); border-radius: 16px; padding: 14px 16px; margin-bottom: 12px;
  }
  .share-link-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .share-link-row .tp-input { flex: 1; font-family: var(--font-mono); font-size: 12px; }
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

  .range-zone {  margin-top: 14px; }
  #spostamento { display:none}
  .range-form { border: 1px solid var(--glass-border); background: rgba(255,255,255,0.2); border-radius: 16px; padding: 14px; }
  .range-form-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .range-form-row > div { flex: 1; min-width: 0; }
  .range-form-row input[type="date"] { min-width: 0; }
  .range-form-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }

  .day-editor { border-top: 1px solid var(--glass-border); margin-top: 16px; padding-top: 16px; }
  .day-editor-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 8px; }
  .day-editor-head-actions { display: flex; align-items: center; gap: 4px; }
  .day-editor-center { flex: 1; text-align: center; min-width: 0; }
  .day-editor-step { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--accent); margin: 0 0 2px; }
  .day-editor-date { font-family: var(--font-display); font-size: 15.5px; font-weight: 650; color: var(--ink); margin: 0; line-height: 1.2; }
  .day-editor-slide { animation: daySlideNext .3s cubic-bezier(0.25, 0.8, 0.25, 1); }
  .day-editor-slide.slide-prev { animation-name: daySlidePrev; }
  @keyframes daySlideNext { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes daySlidePrev { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; transform: translateX(0); } }
  @media (prefers-reduced-motion: reduce) { .day-editor-slide { animation: none; } }
  .icon-btn {
    border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--muted);
    display: flex; align-items: center; padding: 5px; border-radius: 8px;
  }
  .icon-btn:hover { background: var(--glass); color: var(--coral); }

  .field-label { font-size: 12px; color: var(--muted); margin: 0 0 6px; font-weight: 500; }
  .field-hint { font-weight: 400; opacity: .8; }
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
    position: absolute; top: calc(100% + 6px); left: 0; background: rgba(255,255,255); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
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
  .loading-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px 16px; }
  .loading-wrap .empty-hint { padding: 0; }
  .spinner {
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid rgba(46,111,142,0.18);
    border-top-color: var(--accent);
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-banner {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    background: rgba(193,80,60,0.94); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    color: #fff; font-size: 13px; line-height: 1.4; padding: 12px 14px; border-radius: 14px; margin-bottom: 18px;
    box-shadow: 0 8px 22px rgba(193,80,60,0.3);
  }
  .error-banner span { flex: 1; min-width: 180px; }
  .error-banner button {
    border: 1px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.16); color: #fff;
    border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
  }
  .error-banner button:hover { background: rgba(255,255,255,0.28); }
  .error-banner-close { border: none !important; background: none !important; padding: 4px !important; display: flex; }
  .error-banner-network { background: rgba(140,106,46,0.94); box-shadow: 0 8px 22px rgba(140,106,46,0.3); }

  .launcher-shell { max-width: 720px; margin: 0 auto; text-align: center; min-height: calc(100vh - 112px); min-height: calc(100dvh - 112px); display: flex; flex-direction: column; justify-content: center; }
  .launcher-hero { display: flex; align-items: center; justify-content: center; gap: 26px; margin-bottom: 20px; }
  .launcher-toucan { width: 166px; height: auto; flex-shrink: 0; object-fit: contain; }
  .launcher-copy { max-width: 420px; padding-top: 40px; text-align: left; }
  .launcher-content { width: 100%; max-width: 440px; margin: 0 auto; }
  .launcher-footer { margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--glass-border); }
  .launcher-footer .back-link { margin: 0 auto; }
  .launcher-title { font-family: var(--font-page-title); font-size: 42px; font-weight: 350; margin: 0 0 8px; }
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
  .trip-card-actions { display: flex; align-items: center; gap: 2px; margin-left: auto; flex-shrink: 0; }
  .new-trip-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; max-width: 260px; margin-left: auto; margin-right: auto;
    border: 1px dashed var(--glass-border);
    background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    color: var(--muted); font-size: 13.5px; padding: 12px; border-radius: 16px; cursor: pointer; margin-bottom: 24px;
  }
  .new-trip-btn:hover { border-color: var(--accent); color: var(--accent-dark); }

  /* --- Ricerca luogo (geocoding) --- */
  .loc-search { position: relative; min-width: 0; }
  .loc-search-row { position: relative; display: flex; align-items: center; }
  .loc-search-ic { position: absolute; left: 12px; color: var(--muted); pointer-events: none; }
  .loc-search-row .tp-input { padding-left: 34px; padding-right: 34px; }
  .loc-spinner {
    position: absolute; right: 12px; width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(46,111,142,0.18); border-top-color: var(--accent); animation: spin .7s linear infinite;
  }
  .loc-results {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20;
    background: rgba(255,255,255,0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border); border-radius: 12px; box-shadow: 0 12px 28px rgba(15,30,45,0.16);
    max-height: 240px; overflow-y: auto; padding: 4px;
  }
  .loc-result {
    display: flex; align-items: center; gap: 9px; width: 100%; border: none; background: none;
    text-align: left; padding: 8px 10px; font-size: 13px; color: var(--ink); cursor: pointer; border-radius: 9px;
  }
  .loc-result:hover { background: rgba(46,111,142,0.08); color: var(--accent-dark); }
  .loc-result svg { flex-shrink: 0; color: var(--muted); }
  .loc-result span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* --- Scheda Mappa --- */
  .map-card { display: flex; flex-direction: column; }
  .map-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .map-card-legend { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
  .map-card-legend-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .map-card-count {
    font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted);
    background: rgba(255,255,255,0.5); border: 1px solid var(--glass-border); padding: 3px 10px; border-radius: 20px; white-space: nowrap;
  }
  .map-frame { margin-top: 4px; border: 1px solid var(--glass-border); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(15,30,45,0.1); }
  .map-frame svg { display: block; width: 100%; max-width: 320px; height: auto; margin: 0 auto; }
  .tm-root {
    --map-sea: #E7EFEE;
    --map-land: #F6F1E6;
    --map-coast: rgba(96,110,95,0.4);
    --map-lake: rgba(116,158,178,0.45);
    --map-lake-label: #6B8EA6;
    --map-border: rgba(140,124,108,0.55);
    --map-border-disputed: rgba(176,132,92,0.6);
    --map-city-dot: #A66F4E;
    --map-city-label: #5C4436;
    --map-route: #6E6F67;
    --map-route-casing: rgba(110,111,103,0.3);
    --map-route-dash: 12 7;
    --map-marker-ring: #6E6F67;
    --map-marker-bg: #FFFFFF;
    --map-marker-text: #22303B;
    --map-label: #22303B;
    --map-line-w: 4.5;
    --map-marker-r: 10;
    font-family: 'IBM Plex Mono', monospace;
  }
  .map-places { margin-top: 14px; border-top: 1px solid var(--glass-border); padding-top: 12px; }
  .map-place-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
  .map-place-row {
    display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.45);
    border: 1px solid var(--glass-border); border-radius: 12px; padding: 6px 6px 6px 10px;
  }
  .map-place-num {
    width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: var(--accent); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 650;
  }
  .map-place-name { flex: 1; min-width: 0; font-size: 13px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .map-place-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
  .map-place-actions .icon-btn { color: var(--muted); }
  .map-place-actions .icon-btn:hover:not(:disabled) { color: var(--coral); }
  .map-place-actions .icon-btn:disabled { opacity: 0.3; cursor: default; }

  @media (max-width: 600px) {
    /* I filtri di sfocatura e lo sfondo fisso richiedono repaint costosi durante
       lo scroll sui browser mobile. Li disattiviamo qui, evitando compositing continuo. */
    .tp-root { padding: 18px 12px 56px; background-attachment: scroll; }
    .tp-blob { display: none; }
    .tp-root *, .tp-root *::before, .tp-root *::after {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    .tp-wrap { max-width: 100%; }
    .tp-header { margin-bottom: 18px; }
    .tp-title-input { font-size: 26px; }
    .tp-input, .tp-textinput, .extra-title-input { font-size: 16px; }
    .share-link-row .tp-input { font-size: 12px; }
    .tp-card { padding: 14px; border-radius: 18px; margin-bottom: 12px; }
    .cal-header { margin-bottom: 8px; }
    .range-form-row { gap: 8px; }
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
    .launcher-title { font-size: 34px; }
    .launcher-sub { margin-bottom: 18px; }
    .launcher-hero { gap: 16px; }
    .launcher-toucan { width: 30%; }
  }

  @media (max-width: 390px) {
    .launcher-hero { flex-direction: column; gap: 8px; }
    .launcher-copy { text-align: center; padding-top: 20px; }
    .launcher-toucan { width: 100px; }
  }

  @media print {
    .tp-root { background: #fff; padding: 0; min-height: 0; }
    .tp-blob { display: none !important; }
    .no-print { display: none !important; }
    .tp-title-input { border: none !important; }
    .tp-card { background: #fff; backdrop-filter: none; box-shadow: none; border: none; border-radius: 0; padding: 0; margin-bottom: 22px; break-inside: avoid; }
    .icon-btn, .add-line-btn, .grip, .add-extra-wrap, .danger-link, .day-editor, .cal-grid, .cal-header, .range-zone { display: none !important; }
    .map-places, .map-card-head, .loc-search { display: none !important; }
    .tp-input, .tp-textinput, .extra-title-input { border: none !important; background: transparent !important; backdrop-filter: none !important; padding: 2px 0 !important; }
    .ticket, .extra-card { background: #fff; backdrop-filter: none; border: 1px solid #ddd; break-inside: avoid; }
    .list-row { margin-bottom: 2px; }
  }
`;

export default function TravelPlanner({ user, onLogout, pendingShareToken }) {
  const [view, setView] = useState("loading");
  const [trips, setTrips] = useState([]);
  const [currentTripId, setCurrentTripId] = useState(null);
  const [importState, setImportState] = useState(pendingShareToken ? "pending" : "none");
  const [importError, setImportError] = useState("");
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    const unsubscribe = onStorageError(({ status }) => {
      if (status === 401) {
        setStorageError({
          type: "auth",
          message: "La sessione è scaduta. Accedi di nuovo per continuare a salvare le modifiche.",
        });
      } else if (status === 0) {
        setStorageError({
          type: "network",
          message: "Impossibile contattare il server. Controlla la connessione: le ultime modifiche potrebbero non essere salvate.",
        });
      } else {
        setStorageError({
          type: "generic",
          message: "Si è verificato un errore nel salvataggio. Riprova tra poco.",
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onLoginSuccess = () => setStorageError(null);
    netlifyIdentity.on("login", onLoginSuccess);
    return () => netlifyIdentity.off("login", onLoginSuccess);
  }, []);

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

  const duplicateTrip = async (id, title) => {
    try {
      const res = await storage.get(`trip:${id}`);
      if (!res || !res.value) return;
      const data = JSON.parse(res.value);
      const newId = uid();
      const newTitle = `${title} (copia)`;
      data.tripTitle = newTitle;
      await storage.set(`trip:${newId}`, JSON.stringify(data));
      const entry = { id: newId, title: newTitle, createdAt: Date.now() };
      persistIndex([entry, ...trips]);
    } catch (e) {
      // in caso di errore l'utente può semplicemente riprovare
    }
  };

  // Se si arriva da un link di condivisione (/shared/<token>), proponiamo di importare
  // una copia modificabile del viaggio sul nostro account, prima di mostrare l'elenco normale.
  const acceptShare = async () => {
    setImportState("importing");
    setImportError("");
    try {
      const headers = await authHeaders({ "Content-Type": "application/json" });
      const res = await fetch("/.netlify/functions/share", {
        method: "POST",
        headers,
        body: JSON.stringify({ token: pendingShareToken, accept: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import non riuscito");

      window.history.replaceState({}, "", "/");
      const entry = { id: data.tripId, title: data.title, createdAt: Date.now() };
      setTrips((prev) => {
        const next = [entry, ...prev];
        storage.set("trips-index", JSON.stringify(next)).catch(() => {});
        return next;
      });
      setImportState("done");
      setCurrentTripId(data.tripId);
      setView("planner");
    } catch (e) {
      setImportError(e.message || "Qualcosa è andato storto");
      setImportState("error");
    }
  };

  const declineShare = () => {
    window.history.replaceState({}, "", "/");
    setImportState("none");
  };

  return (
    <div className="tp-root">
      <style>{SHARED_STYLES}</style>
      <div className="tp-blob tp-blob-1" />
      <div className="tp-blob tp-blob-2" />
      <div className="tp-blob tp-blob-3" />
      <div className="tp-wrap">
        {storageError && (
          <div className={`error-banner error-banner-${storageError.type}`}>
            <span>{storageError.message}</span>
            {storageError.type === "auth" && (
              <button onClick={() => netlifyIdentity.open("login")}>Accedi di nuovo</button>
            )}
            <button className="error-banner-close" onClick={() => setStorageError(null)} aria-label="Chiudi avviso">
              <X size={14} />
            </button>
          </div>
        )}
        {importState === "pending" || importState === "importing" || importState === "error" ? (
          <div className="launcher-shell">
            <p className="tp-eyebrow" style={{ marginBottom: 10 }}>Travel planner</p>
            <h1 className="launcher-title">Viaggio condiviso</h1>
            <p className="launcher-sub">
              {importState === "error"
                ? importError
                : "Qualcuno ha condiviso un viaggio con te. Importandolo, ne riceverai una copia modificabile sul tuo account — l'originale non verrà toccato."}
            </p>
            <div className="create-stack" style={{ maxWidth: 280, margin: "0 auto" }}>
              <button className="export-btn" onClick={acceptShare} disabled={importState === "importing"}>
                {importState === "importing" ? "Importazione..." : "Importa nel mio account"}
              </button>
              <button className="cover-toggle-link" onClick={declineShare}>Non ora</button>
            </div>
          </div>
        ) : (
          <>
            {view === "loading" && (
              <div className="loading-wrap">
                <span className="spinner" aria-hidden="true"></span>
                <p className="empty-hint">Caricamento dei tuoi viaggi...</p>
              </div>
            )}
            {view === "launcher" && (
              <TripLauncher trips={trips} onCreate={createTrip} onOpen={openTrip} onDelete={deleteTrip} onDuplicate={duplicateTrip} user={user} onLogout={onLogout} />
            )}
        {view === "planner" && currentTripId && (
          <PlannerView
            key={currentTripId}
            tripId={currentTripId}
            onBack={() => setView("launcher")}
            onTitleChange={(title) => renameTrip(currentTripId, title)}
          />
        )}
          </>
        )}
      </div>
    </div>
  );
}

function TripLauncher({ trips, onCreate, onOpen, onDelete, onDuplicate, user, onLogout }) {
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
      <div className="launcher-hero">
        <img className="launcher-toucan" src={toucanImage} alt="Tucano" />
        <div className="launcher-copy">
          <p className="tp-eyebrow" style={{ marginBottom: 10 }}>TRAVEL PLANNER</p>
          <h1 className="launcher-title">TucanoPlanner</h1>
          <p className="launcher-sub">
            {trips.length === 0 ? "Dai un nome al tuo primo viaggio per iniziare." : "Scegli un viaggio da continuare a pianificare o creane uno nuovo."}
          </p>
        </div>
      </div>

      <div className="launcher-content">
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
              <div className="trip-card-actions">
                <button
                  className="icon-btn"
                  aria-label="Duplica viaggio"
                  title="Duplica"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(t.id, t.title); }}
                >
                  <Copy size={15} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Elimina viaggio"
                  onClick={(e) => { e.stopPropagation(); if (window.confirm(`Eliminare il viaggio "${t.title}"? L'azione non è reversibile.`)) onDelete(t.id); }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

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
  const [daySlideDir, setDaySlideDir] = useState("next");

  useEffect(() => {
    if (selectedDate && scrollOnSelectRef.current && dayEditorRef.current) {
      dayEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    scrollOnSelectRef.current = false;
  }, [selectedDate]);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const [showRangeForm, setShowRangeForm] = useState(true);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftNewStart, setShiftNewStart] = useState("");
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
            setDays(fillGaps(migrated));
            const isoKeys = Object.keys(migrated).sort();
            if (isoKeys.length) {
              const earliest = isoKeys[0];
              const latest = isoKeys[isoKeys.length - 1];
              const startDate = fromISO(earliest);
              setCurrentMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
              // Date già esistenti: preselezionate in "Dal"/"Al" e scheda nascosta.
              setRangeStart(earliest);
              setRangeEnd(latest);
              setShowRangeForm(false);
            } else {
              setShowRangeForm(true);
            }
          } else {
            setShowRangeForm(true);
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
    // Le nuove date si creano solo tramite "Crea più giorni insieme" (Dal/Al):
    // qui si possono solo aprire le giornate già esistenti, per evitare aggiunte involontarie.
    if (!days[iso]) return;
    setSelectedDate(iso);
  };

  const navigateDay = (delta) => {
    if (!selectedDate) return;
    const next = fromISO(selectedDate);
    next.setDate(next.getDate() + delta);
    const nextIso = toISO(next);
    // Niente creazione automatica: si naviga solo tra date già esistenti.
    if (!days[nextIso]) return;
    setDaySlideDir(delta > 0 ? "next" : "prev");
    setSelectedDate(nextIso);
    setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const updateDay = (iso, patch) => setDays((prev) => ({ ...prev, [iso]: { ...prev[iso], ...patch } }));

  const removeDay = (isoToRemove) => {
    setDays((prev) => {
      const keys = Object.keys(prev).sort();
      if (!keys.length) return prev;
      const next = { ...prev };
      delete next[isoToRemove];
      const first = keys[0];
      const last = keys[keys.length - 1];
      // Se il giorno eliminato era nel mezzo dell'itinerario, comprimiamo spostando
      // indietro di un giorno tutto ciò che viene dopo, per non lasciare "buchi".
      if (isoToRemove !== first && isoToRemove !== last && isoToRemove > first && isoToRemove < last) {
        const removedDate = fromISO(isoToRemove);
        const compacted = {};
        Object.entries(next).forEach(([iso, entry]) => {
          const d = fromISO(iso);
          if (d > removedDate) {
            d.setDate(d.getDate() - 1);
            compacted[toISO(d)] = entry;
          } else {
            compacted[iso] = entry;
          }
        });
        return compacted;
      }
      return next;
    });
    if (selectedDate === isoToRemove) setSelectedDate(null);
  };

  const presetRangeFromDays = () => {
    const keys = Object.keys(days).sort();
    if (keys.length) {
      setRangeStart(keys[0]);
      setRangeEnd(keys[keys.length - 1]);
    }
  };

  const mergeRange = (start, end) => {
    setDays((prev) => {
      const next = { ...prev };
      const cur = new Date(start);
      while (cur <= end) {
        const iso = toISO(cur);
        if (!next[iso]) next[iso] = emptyDay();
        cur.setDate(cur.getDate() + 1);
      }
      return fillGaps(next);
    });
  };

  const shiftDaysBy = (deltaDays) => {
    setDays((prev) => {
      const next = {};
      Object.entries(prev).forEach(([iso, entry]) => {
        const d = fromISO(iso);
        d.setDate(d.getDate() + deltaDays);
        next[toISO(d)] = entry;
      });
      return next;
    });
  };

  const createRange = () => {
    if (!rangeStart || !rangeEnd) return;
    let start = fromISO(rangeStart);
    let end = fromISO(rangeEnd);
    if (start > end) { const tmp = start; start = end; end = tmp; }

    const keys = Object.keys(days).sort();
    let newStartIso = toISO(start);
    let newEndIso = toISO(end);

    if (keys.length) {
      const oldStart = fromISO(keys[0]);
      const oldEnd = fromISO(keys[keys.length - 1]);
      const hasOverlap = start <= oldEnd && end >= oldStart;

      if (!hasOverlap) {
        // Le nuove date non hanno alcun giorno in comune con quelle esistenti:
        // l'intenzione è spostare l'intero viaggio sulle nuove date (come "Sposta le date").
        const deltaDays = Math.round((start - oldStart) / 86400000);
        shiftDaysBy(deltaDays);
        const shiftedStart = new Date(oldStart);
        shiftedStart.setDate(shiftedStart.getDate() + deltaDays);
        const shiftedEnd = new Date(oldEnd);
        shiftedEnd.setDate(shiftedEnd.getDate() + deltaDays);
        newStartIso = toISO(shiftedStart);
        newEndIso = toISO(shiftedEnd);
      } else {
        // Sovrapposizione con le date esistenti: estendi/aggiungi normalmente.
        mergeRange(start, end);
        const actualStart = start < oldStart ? start : oldStart;
        const actualEnd = end > oldEnd ? end : oldEnd;
        newStartIso = toISO(actualStart);
        newEndIso = toISO(actualEnd);
      }
    } else {
      mergeRange(start, end);
    }

    setRangeStart(newStartIso);
    setRangeEnd(newEndIso);
    setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setShowRangeForm(false);
  };

  const shiftTripDates = () => {
    if (!shiftNewStart) return;
    const keys = Object.keys(days).sort();
    if (!keys.length) return;
    const oldStart = fromISO(keys[0]);
    const newStart = fromISO(shiftNewStart);
    const deltaDays = Math.round((newStart - oldStart) / 86400000);
    if (deltaDays !== 0) {
      shiftDaysBy(deltaDays);
      setCurrentMonth(new Date(newStart.getFullYear(), newStart.getMonth(), 1));
      setSelectedDate(null);
    }
    setShowShiftForm(false);
    setShiftNewStart("");
  };

  const addExtra = (type) => {
    const meta = EXTRA_TYPES.find((t) => t.id === type) || DEFAULT_EXTRA_META;
    const id = uid();
    if (type === "flight") {
      setExtras((prev) => [...prev, { id, type, title: meta.label, flights: [emptyFlight()] }]);
    } else if (type === "map") {
      setExtras((prev) => [...prev, { id, type, title: meta.label, locations: [] }]);
    } else {
      const initialLines = type === "costs" ? [{ desc: "", value: "" }] : [{ text: "", done: false }];
      setExtras((prev) => [...prev, { id, type, title: meta.label, lines: initialLines }]);
    }
    setShowExtraMenu(false);
  };

  const updateExtra = (id, patch) => setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeExtra = (id) => setExtras((prev) => prev.filter((e) => e.id !== id));

  const sortedDayEntries = Object.entries(days).sort(([a], [b]) => (a < b ? -1 : 1));

  const exportItinerary = () => {
    // Apre l'itinerario come pagina web pubblica servita via HTTPS (/.netlify/functions/export),
    // così le foto caricano anche su iPhone/Safari (il file .html scaricato apriva le immagini
    // in contesto locale e Safari le bloccava).
    window.open(`${window.location.origin}/export/${tripId}`, "_blank");
  };

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareStatus, setShareStatus] = useState("idle");
  const [shareLink, setShareLink] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  const generateShareLink = async () => {
    setShareStatus("loading");
    setShareError("");
    try {
      const headers = await authHeaders({ "Content-Type": "application/json" });
      const res = await fetch("/.netlify/functions/share", {
        method: "POST",
        headers,
        body: JSON.stringify({ tripId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossibile generare il link");
      setShareLink(`${window.location.origin}/shared/${data.token}`);
      setShareStatus("ready");
    } catch (e) {
      setShareError(e.message || "Qualcosa è andato storto");
      setShareStatus("error");
    }
  };

  const copyShareLink = () => {
    navigator.clipboard?.writeText(shareLink).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  return (
    <>
      {!loaded && (
        <div className="loading-wrap">
          <span className="spinner" aria-hidden="true"></span>
          <p className="empty-hint">Caricamento itinerario...</p>
        </div>
      )}
      <div className="tp-header">
        <div className="tp-header-top no-print">
          <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> I tuoi viaggi</button>
          <div className="tp-header-actions">
            <button
              className="icon-btn"
              onClick={() => { setShowSharePanel(true); if (shareStatus === "idle") generateShareLink(); }}
              aria-label="Condividi viaggio"
              title="Condividi"
            >
              <Share2 size={16} />
            </button>
            <button className="export-btn" onClick={exportItinerary} disabled={!loaded}>
              <Printer size={14} /> Esporta itinerario
            </button>
          </div>
        </div>
        {showSharePanel && (
          <div className="share-panel no-print">
            {shareStatus === "loading" && <p className="field-label">Generazione del link...</p>}
            {shareStatus === "ready" && (
              <>
                <p className="field-label">Chiunque abbia questo link può ricevere una copia modificabile del viaggio sul proprio account</p>
                <div className="share-link-row">
                  <input className="tp-input" value={shareLink} readOnly onFocus={(e) => e.target.select()} />
                  <button className="export-btn" onClick={copyShareLink}>{shareCopied ? "Copiato!" : "Copia link"}</button>
                </div>
              </>
            )}
            {shareStatus === "error" && <p className="field-label" style={{ color: "var(--coral)" }}>{shareError}</p>}
            <button className="cover-toggle-link" onClick={() => setShowSharePanel(false)}>Chiudi</button>
          </div>
        )}
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
            <button
              className="add-line-btn"
              onClick={() => { presetRangeFromDays(); setShowRangeForm(true); }}
            >
              <CalendarRange size={14} /> Modifica date di Viaggio
            </button>
          ) : (
            <div className="range-form">
              <div className="range-form-row">
                <div>
                  <p className="field-label">Dal</p>
                  <input
                    type="date"
                    className="tp-input"
                    value={rangeStart}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRangeStart(v);
                      // Se la data "Al" è ancora vuota la allinea a quella di partenza,
                      // così il calendario del campo "Al" si apre già sul mese di partenza.
                      if (!rangeEnd) setRangeEnd(v);
                    }}
                  />
                </div>
                <div>
                  <p className="field-label">Al</p>
                  <input
                    type="date"
                    className="tp-input"
                    value={rangeEnd}
                    min={rangeStart || undefined}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="range-form-actions">
                {sortedDayEntries.length > 0 && (
                  <button
                    className="danger-link"
                    onClick={() => { presetRangeFromDays(); setShowRangeForm(false); }}
                  >
                    Annulla
                  </button>
                )}
                <button className="export-btn" onClick={createRange}>Crea giornate</button>
              </div>
            </div>
          )}
        </div>

        {sortedDayEntries.length > 0 && (
          <div className="range-zone" id="spostamento">
            {!showShiftForm ? (
              <button
                className="add-line-btn"
                onClick={() => { setShiftNewStart(sortedDayEntries[0][0]); setShowShiftForm(true); }}
              >
                <ArrowLeftRight size={14} /> Sposta le date del viaggio
              </button>
            ) : (
              <div className="range-form">
                <p className="field-label">
                  Nuova data di partenza <span className="field-hint">(attuale: {fromISO(sortedDayEntries[0][0]).getDate()} {MONTHS[fromISO(sortedDayEntries[0][0]).getMonth()].toLowerCase()} {fromISO(sortedDayEntries[0][0]).getFullYear()})</span>
                </p>
                <input type="date" className="tp-input" value={shiftNewStart} onChange={(e) => setShiftNewStart(e.target.value)} />
                <div className="range-form-actions">
                  <button className="danger-link" onClick={() => setShowShiftForm(false)}>Annulla</button>
                  <button className="export-btn" onClick={shiftTripDates}>Sposta</button>
                </div>
              </div>
            )}
          </div>
        )}

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
              dayIndex={sortedDayEntries.findIndex(([iso]) => iso === selectedDate)}
              dayTotal={sortedDayEntries.length}
              slideDir={daySlideDir}
            />
          </div>
        )}
      </div>

      <div className="tp-card">
        <p className="tp-section-label">Itinerario</p>
        {sortedDayEntries.length === 0 ? (
          <p className="empty-hint">Nessuna giornata ancora. Fissa le date con "Crea più giorni insieme" per iniziare.</p>
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

function DayEditor({ iso, data, categories, onChange, onClose, onDelete, onNavigate, dayIndex, dayTotal, slideDir }) {
  const d = fromISO(iso);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [showDayUnsplashPicker, setShowDayUnsplashPicker] = useState(false);
  const touchStartX = useRef(null);
  const dayNumber = dayIndex >= 0 ? dayIndex + 1 : null;

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
      <div key={`${iso}-${slideDir}`} className={`day-editor-slide slide-${slideDir}`}>
        <div className="day-editor-head">
          <button className="icon-btn" onClick={() => onNavigate(-1)} aria-label="Giorno precedente"><ChevronLeft size={18} /></button>
          <div className="day-editor-center">
            {dayNumber && dayTotal ? <p className="day-editor-step">Giorno {dayNumber} di {dayTotal}</p> : null}
            <p className="day-editor-date">{WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()].toLowerCase()} {d.getFullYear()}</p>
          </div>
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
            className="icon-btn"
            onClick={() => setShowDayUnsplashPicker(true)}
            aria-label="Cerca foto su Unsplash"
            title="Cerca una foto"
          >
            <ImageIcon size={16} />
          </button>
        </div>
      </div>

      <UnsplashPicker
        open={showDayUnsplashPicker}
        query={data.place || ""}
        onClose={() => setShowDayUnsplashPicker(false)}
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
    </div>
  );
}

function ExtraCard({ extra, onChange, onDelete }) {
  const meta = EXTRA_TYPES.find((t) => t.id === extra.type) || DEFAULT_EXTRA_META;
  const Icon = meta.icon;
  const isPacking = extra.type === "packing";
  const isCosts = extra.type === "costs";
  const isFlight = extra.type === "flight";
  const isMap = extra.type === "map";

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

      {isMap ? (
        <MapCard extra={extra} onChange={onChange} />
      ) : isFlight ? (
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

// Ricerca di un luogo tramite geocoding OpenStreetMap (/.netlify/functions/geocode).
// Gestisce input, debounce, risultati e chiusura del dropdown; onPick riceve { name, lat, lon }.
function useGeocodeSearch({ onPick, resetAfterPick = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const closeOnOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, []);

  const runSearch = async (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/.netlify/functions/geocode?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella ricerca");
      setResults(data.results || []);
      setOpen(true);
    } catch (e) {
      setError(e.message);
      setResults([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val) => {
    setQuery(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(() => runSearch(val), 350);
  };

  const pick = (r) => {
    onPick({ name: r.name, lat: r.lat, lon: r.lon });
    setResults([]);
    setOpen(false);
    setError("");
    if (resetAfterPick) setQuery("");
  };

  return { query, setQuery, results, open, setOpen, loading, error, wrapRef, handleChange, pick };
}

// Scheda "Mappa": l'utente aggiunge liberamente i luoghi che vuole (geocoding),
// la mappa SVG statica mostra il percorso nell'ordine della lista.
function MapCard({ extra, onChange }) {
  const locations = extra.locations || [];
  const points = routePointsFromList(locations);
  const hasLocations = points.markers.length > 0;
  const svg = hasLocations ? buildTravelMapSvg(points, { title: extra.title }) : null;
  const geo = useGeocodeSearch({ onPick: (loc) => onChange({ locations: [...locations, loc] }), resetAfterPick: true });

  const move = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= locations.length) return;
    const next = [...locations];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    onChange({ locations: next });
  };

  const remove = (i) => onChange({ locations: locations.filter((_, idx) => idx !== i) });

  return (
    <div className="map-card">
      <div className="map-card-head">
        <div className="map-card-legend"><span className="map-card-legend-dot" /><span>Percorso del viaggio</span></div>
        {hasLocations && <span className="map-card-count">{points.markers.length} tappe</span>}
      </div>

      {hasLocations ? (
        <div className="map-frame" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="empty-hint">Aggiungi i luoghi che vuoi: la mappa del percorso verrà generata nell'export.</p>
      )}

      <div className="map-places">
        <p className="field-label">Luoghi del percorso</p>
        <div className="loc-search" ref={geo.wrapRef}>
          <div className="loc-search-row">
            <MapPin size={14} className="loc-search-ic" />
            <input
              className="tp-input"
              value={geo.query}
              placeholder="Cerca un luogo da aggiungere..."
              onChange={(e) => geo.handleChange(e.target.value)}
              onFocus={() => { if (geo.results.length || geo.loading || geo.error) geo.setOpen(true); }}
            />
            {geo.loading && <span className="loc-spinner" aria-hidden="true"></span>}
          </div>
          {geo.open && (
            <div className="loc-results">
              {geo.loading && <p className="empty-hint">Ricerca in corso...</p>}
              {!geo.loading && geo.error && <p className="empty-hint" style={{ color: "var(--coral)" }}>{geo.error}</p>}
              {!geo.loading && !geo.error && geo.results.length === 0 && geo.query.trim() && (
                <p className="empty-hint">Nessun risultato per "{geo.query}".</p>
              )}
              {!geo.loading && geo.results.map((r, i) => (
                <button key={`${r.lat}-${r.lon}-${i}`} className="loc-result" onMouseDown={() => geo.pick(r)}>
                  <MapPin size={13} /> <span>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {locations.length === 0 ? (
          <p className="empty-hint">Nessun luogo aggiunto.</p>
        ) : (
          <div className="map-place-list">
            {locations.map((loc, i) => (
              <div key={i} className="map-place-row">
                <span className="map-place-num">{i + 1}</span>
                <span className="map-place-name">{loc.name}</span>
                <div className="map-place-actions">
                  <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Sposta su" title="Sposta su" disabled={i === 0}><ChevronUp size={14} /></button>
                  <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Sposta giù" title="Sposta giù" disabled={i === locations.length - 1}><ChevronDown size={14} /></button>
                  <button className="icon-btn" onClick={() => remove(i)} aria-label="Rimuovi luogo" title="Rimuovi"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
