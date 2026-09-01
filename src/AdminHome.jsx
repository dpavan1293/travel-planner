import React, { useState, useEffect, useRef } from "react";
import storage from "./storage";
import { Plus, X, Globe, Pencil, Trash2, ArrowLeftRight, Search, RefreshCw } from "lucide-react";
import { AirplaneLoader } from "./App";
const CONTINENTS = ["Europa", "Asia", "Africa", "Americhe", "Oceania"];

function AdminImportModal({ onClose, onSave, editItem }) {
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState(null);
  const [title, setTitle] = useState(editItem?.title || "");
  const [coverUrl, setCoverUrl] = useState(editItem?.coverUrl || "");
  const [continent, setContinent] = useState(editItem?.continent || "Europa");
  const [country, setCountry] = useState(editItem?.country || "");
  const [description, setDescription] = useState(editItem?.description || "");
  const [difficulty, setDifficulty] = useState(editItem?.difficulty || "facile");
  const [budget, setBudget] = useState(editItem?.budget || "medio");
  const [bestPeriod, setBestPeriod] = useState(editItem?.bestPeriod || "");
  const [sourceUrl, setSourceUrl] = useState(editItem?.sourceUrl || "");
  const [saving, setSaving] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const fileRef = useRef(null);
  const hasAutoPopulated = useRef(false);

  useEffect(() => {
    if (editItem) {
      setJsonInput(JSON.stringify({ tripTitle: editItem.title, days: editItem.days || {}, extras: editItem.extras || [] }, null, 2));
      handleParseJson(JSON.stringify({ tripTitle: editItem.title, days: editItem.days || {}, extras: editItem.extras || [] }));
    }
  }, [editItem]);

  const handleParseJson = (text) => {
    setJsonInput(text);
    try {
      const data = JSON.parse(text);
      if (data && (data.days || data.tripTitle)) {
        const isFirstParse = !hasAutoPopulated.current;
        setParsed(data);
        if (isFirstParse) {
          hasAutoPopulated.current = true;
          const newTitle = data.tripTitle || data.title || "";
          if (!title && newTitle) setTitle(newTitle);
          const existingCover = data.coverImageUrl || data.coverUrl || "";
          if (!coverUrl && existingCover) {
            setCoverUrl(existingCover);
          } else if (!coverUrl && !existingCover && newTitle) {
            const query = data.country || newTitle;
            setCoverLoading(true);
            fetch(`/.netlify/functions/unsplash?q=${encodeURIComponent(query)}`)
              .then((r) => r.json())
              .then((res) => {
                const first = res.results?.[0];
                if (first?.full) setCoverUrl(first.full);
              })
              .catch(() => {})
              .finally(() => setCoverLoading(false));
          }
          if (!sourceUrl && data.sourceUrl) setSourceUrl(data.sourceUrl);
          if (data.continent) setContinent(data.continent);
          if (data.country) setCountry(data.country);
          if (data.description) setDescription(data.description);
          if (data.difficulty) setDifficulty(data.difficulty);
          if (data.budget) setBudget(data.budget);
          if (data.bestPeriod) setBestPeriod(data.bestPeriod);
        }
      } else {
        setParsed(null);
      }
    } catch {
      setParsed(null);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleParseJson(ev.target.result);
    reader.readAsText(file);
  };

  const daysCount = parsed?.days ? Object.keys(parsed.days).length : 0;

  const handleSave = async () => {
    if (!parsed || !title.trim()) return;
    setSaving(true);
    const id = editItem?.id || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
    const data = {
      id,
      title: title.trim(),
      coverUrl,
      continent,
      country: country.trim(),
      description: description.trim(),
      difficulty,
      budget,
      bestPeriod: bestPeriod.trim(),
      sourceUrl: sourceUrl.trim(),
      days: parsed.days || {},
      extras: parsed.extras || [],
      duration: daysCount,
    };
    await onSave(id, data);
    setSaving(false);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h2>{editItem ? "Modifica itinerario" : "Importa itinerario pubblico"}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-modal-section">
            <h3>Dati itinerario</h3>
            {parsed ? (
              <div className="admin-json-preview">{daysCount} giorni trovati — {parsed.tripTitle || "Senza titolo"}</div>
            ) : (
              <div className="admin-json-upload" onClick={() => fileRef.current?.click()}>
                <p>Incolla il JSON qui sotto oppure carica un file</p>
                <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFile} />
              </div>
            )}
            <textarea
              className="admin-field"
              style={{ width: "100%", minHeight: 100, padding: 10, borderRadius: 10, border: "1px solid var(--glass-border)", fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
              value={jsonInput}
              onChange={(e) => handleParseJson(e.target.value)}
              placeholder='{"tripTitle": "...", "days": {...}, "extras": [...]}'
            />
          </div>

          <div className="admin-modal-section">
            <h3>Metadati pubblici</h3>
            <div className="admin-field">
              <label>Titolo pubblico</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Roma in 5 giorni" />
            </div>
            <div className="admin-field">
              <label>URL Copertina {coverLoading && <span style={{ fontSize: 11, color: "var(--muted)" }}>— cerco su Unsplash...</span>}</label>
              <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="admin-field">
                <label>Continente</label>
                <select value={continent} onChange={(e) => setContinent(e.target.value)}>
                  {CONTINENTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label>Nazione</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Es. Italia" />
              </div>
            </div>
            <div className="admin-field">
              <label>Descrizione</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrizione dell'itinerario..." rows={2} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="admin-field">
                <label>Difficoltà</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="facile">Facile</option>
                  <option value="media">Media</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>
              <div className="admin-field">
                <label>Budget</label>
                <select value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option value="basso">Basso</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
            <div className="admin-field">
              <label>Miglior periodo</label>
              <input value={bestPeriod} onChange={(e) => setBestPeriod(e.target.value)} placeholder="Es. Aprile-Ottobre" />
            </div>
          </div>
          <div className="admin-field">
            <label>Source URL <span style={{ color: "var(--muted)", fontWeight: 400 }}>(opzionale, nascosto agli utenti)</span></label>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
          </div>
          </div>

          {parsed && (
            <div className="admin-modal-section">
              <h3>Anteprima ({daysCount} giorni)</h3>
              <div className="admin-days-preview">
                {Object.entries(parsed.days || {}).map(([iso, day], i) => (
                  <div key={iso} style={{ padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <strong>Giorno {i + 1}</strong> — {day.place}: {(day.activities || []).join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-modal-actions">
            <button className="admin-cancel-btn" onClick={onClose}>Annulla</button>
            <button className="admin-publish-btn" onClick={handleSave} disabled={!parsed || !title.trim() || saving}>
              {saving ? <><AirplaneLoader size={16} /> Salvataggio...</> : editItem ? "Salva modifiche" : "Pubblica"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminHome({ user, onSwitchToClient }) {
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");
  const [continent, setContinent] = useState("Tutti");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storage.getPublicItineraries();
      setItineraries(res?.itineraries || []);
    } catch (e) {
      setError(e.message || "Impossibile caricare gli itinerari");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (id, data) => {
    await storage.savePublicItinerary(id, data);
    setShowModal(false);
    setEditItem(null);
    load();
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Eliminare "${title}"?`)) return;
    await storage.deletePublicItinerary(id);
    load();
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const filtered = itineraries.filter((it) => {
    const matchContinent = continent === "Tutti" || it.continent === continent;
    if (!matchContinent) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.title.toLowerCase().includes(q) ||
      (it.country && it.country.toLowerCase().includes(q)) ||
      (it.description && it.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="explore-view">
      <div className="admin-header">
        <span className="admin-badge">Admin</span>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>Gestione itinerari pubblici</p>
      </div>

      <button className="admin-import-btn" onClick={onSwitchToClient} style={{ marginBottom: 12 }}>
        <ArrowLeftRight size={18} /> Passa alla modalità utente
      </button>

      <button className="admin-import-btn" onClick={handleNew}>
        <Plus size={18} /> Importa itinerario pubblico
      </button>

      {!loading && itineraries.length > 0 && (
        <>
          <div className="explore-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="explore-search"
              placeholder="Cerca per titolo, paese o parola chiave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="explore-chips">
            {["Tutti", ...CONTINENTS].map((c) => (
              <button
                key={c}
                className={`explore-chip${continent === c ? " active" : ""}`}
                onClick={() => setContinent(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="loading-wrap">
          <AirplaneLoader />
          <p className="empty-hint">Caricamento...</p>
        </div>
      ) : error ? (
        <div className="explore-empty">
          <p style={{ color: "var(--coral)", margin: "0 0 12px" }}>{error}</p>
          <button className="admin-import-btn" onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <RefreshCw size={16} /> Riprova
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="explore-empty">
          <Globe size={40} className="explore-empty-icon" />
          <p>Nessun itinerario pubblico trovato.</p>
        </div>
      ) : (
        <div className="explore-grid">
          {filtered.map((it) => (
            <div key={it.id} className="explore-card">
              <img className="explore-card-img" src={it.coverUrl} alt={it.title} onError={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #1F3A4D, #2E6F8E)"; }} />
              <div className="explore-card-body" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="explore-card-country">{it.country} — {it.continent}</p>
                  <p className="explore-card-title" style={{ margin: 0 }}>{it.title}</p>
                </div>
                <div className="admin-card-actions">
                  <button onClick={() => handleEdit(it)} title="Modifica"><Pencil size={14} /></button>
                  <button className="delete-btn" onClick={() => handleDelete(it.id, it.title)} title="Elimina"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AdminImportModal
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={handleSave}
          editItem={editItem}
        />
      )}
    </div>
  );
}
