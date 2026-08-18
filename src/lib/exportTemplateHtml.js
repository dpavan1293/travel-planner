// Guscio HTML/CSS dell'export di viaggio.
//
// Sta in un modulo JS e viene importato dalla funzione serverless export.js:
// Netlify impacchetta con esbuild solo i moduli importati, quindi un file .html
// letto a runtime con readFileSync non arriverebbe mai sul server. Il template
// è comunque facilmente modificabile da qui, una stringa per volta.

export const EXPORT_TEMPLATE = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
  :root { --paper: #FBF9F4; --ink: #22303B; --muted: #7A7B72; --gold: #C9A24B; --rule: #E7E2D6; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: var(--ink); background: #DEDAD0; margin: 0; }
  .sheet { max-width: 880px; margin: 44px auto; background: var(--paper); box-shadow: 0 30px 70px rgba(20,20,15,0.2); overflow: hidden; }
  .cover {
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
  .map-frame { max-width: 560px; margin: 0 auto 44px; border: 1px solid var(--rule); border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(34,48,59,0.1); break-inside: avoid; }
  .map-frame svg { display: block; width: 100%; height: auto; }
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
    <div class="cover" style="{{COVER_STYLE}}">
      <div>
        <p class="cover-eyebrow">Itinerario di viaggio</p>
        <h1>{{TITLE}}</h1>
        {{COVER_SUB}}
      </div>
    </div>
    <div class="wrap">
      {{STYLE_BREAKDOWN}}
      {{FLIGHTS}}
      <p class="section-label">Programma</p>
      <div class="timeline">
        {{DAYS}}
      </div>
      {{EXTRAS}}
      {{MAP}}
      <footer><p>{{TITLE}} — documento di viaggio</p></footer>
    </div>
  </div>
</body>
</html>`;