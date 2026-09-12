// Guscio HTML/CSS dell'export di viaggio.
//
// Sta in un modulo JS e viene importato dalla funzione serverless export.js:
// Netlify impacchetta con esbuild solo i moduli importati, quindi un file .html
// letto a runtime con readFileSync non arriverebbe mai sul server. Il template
// è comunque facilmente modificabile da qui, una stringa per volta.
//
// Per aggiungere un nuovo template:
//   1. Aggiungi un entry in TEMPLATES con la chiave scelta
//   2. Usa gli stessi placeholder {{...}} (TITLE, COVER_STYLE, ecc.)
//   3. Passa ?template=<chiave> nella URL di export per attivarlo

// Template "waves" — design alternativo con hero a tutata pagina, sezione overview,
// route schematic e stile più editorial. Il contenuto è inline come stringa JS
// per compatibilità con esbuild (serverless Netlify) che non supporta ?raw imports.
const WAVES = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">

<style>
  :root{
    --cream:#FFFFFF;
    --cream-deep:#F4F4F4;
    --paper:#FFFFFF;
    --ink:#1A1A1A;
    --ink-soft:#555555;
    --ink-faint:#999999;
    --line:#E5E5E5;
    --lagoon:#2E6E67;
    --lagoon-deep:#1C433F;
    --lagoon-pale:#E8F4F1;
    --gold:#B08349;
    --radius:2px;
    --measure:62ch;
  }

  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    background:#E8E4DC;
    color:var(--ink);
    font-family:'Jost', sans-serif;
    font-weight:300;
    -webkit-font-smoothing:antialiased;
  }

  .sheet{
    max-width:960px;
    margin:40px auto;
    background:var(--paper);
    box-shadow:0 30px 70px rgba(20,20,15,0.18);
    overflow:hidden;
  }

  .serif{font-family:'Playfair Display', serif;}

  .wrap{
    max-width:640px;
    margin:0 auto;
    padding:0 32px;
    text-align:center;
  }

  .label{
    font-family:'Jost', sans-serif;
    font-size:12px;
    letter-spacing:.22em;
    text-transform:uppercase;
    color:var(--lagoon-deep);
    font-weight:500;
  }

  .label::before{
    content:'';
    display:inline-block;
    width:22px;
    height:1px;
    background:var(--gold);
    margin-right:10px;
    vertical-align:middle;
  }

  .hero{
    position:relative;
    min-height:88vh;
    display:flex;
    flex-direction:column;
    justify-content:flex-end;
    background:
      radial-gradient(120% 90% at 15% -10%, #3C8079 0%, transparent 55%),
      linear-gradient(160deg, var(--lagoon-deep) 0%, var(--lagoon) 60%, #3E827A 100%);
    color:#F4EFE1;
    overflow:hidden;
    padding-bottom:0;
  }
  .hero.has-cover{
    background:
      linear-gradient(180deg, rgba(28,67,63,.15) 0%, rgba(28,67,63,.82) 100%),
      var(--cover-url) center/cover no-repeat;
  }

  .hero-nav{
    position:relative;
    z-index:2;
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:28px 32px 0;
    font-size:12px;
    letter-spacing:.2em;
    text-transform:uppercase;
    color:#DCE9E4;
  }

  .hero-body{
    position:relative;
    z-index:2;
    max-width:960px;
    margin:0 auto;
    width:100%;
    padding:120px 32px 64px;
    text-align:center;
  }

  .hero-eyebrow{
    font-size:13px;
    letter-spacing:.3em;
    text-transform:uppercase;
    color:#C9E2DB;
    margin-bottom:22px;
  }

  .hero-title{
    font-size:clamp(48px, 9vw, 104px);
    line-height:.98;
    font-weight:400;
    letter-spacing:.01em;
    margin:0;
  }

  .hero-sub{
    font-family:'Playfair Display', serif;
    font-style:italic;
    font-weight:400;
    font-size:clamp(18px, 2.6vw, 26px);
    color:#DCEAE5;
    margin:18px 0 0;
  }

  .hero-dates{
    margin-top:34px;
    font-size:13px;
    letter-spacing:.28em;
    text-transform:uppercase;
    color:#BFDAD3;
  }

  .hero-meta{
    margin-top:46px;
    display:flex;
    justify-content:center;
    gap:0;
    flex-wrap:wrap;
    border-top:1px solid rgba(244,239,225,.25);
    padding-top:26px;
  }

  .hero-meta div{
    padding:0 26px;
    border-right:1px solid rgba(244,239,225,.25);
    text-align:left;
  }
  .hero-meta div:last-child{border-right:none;}

  .hero-meta .mval{
    font-family:'Playfair Display', serif;
    font-size:22px;
    font-weight:400;
  }
  .hero-meta .mkey{
    font-size:11px;
    letter-spacing:.18em;
    text-transform:uppercase;
    color:#B7D4CC;
    margin-top:2px;
  }

  .wave{
    position:relative;
    z-index:2;
    display:block;
    width:100%;
    height:90px;
    margin-top:40px;
  }

  section{padding:72px 0;}
  section + section{border-top:1px solid var(--line);}

  .section-head{margin-bottom:44px;}
  .section-title{
    font-family:'Playfair Display', serif;
    font-weight:400;
    font-size:clamp(30px, 4vw, 42px);
    margin:14px 0 0;
  }

  .lede{
    max-width:var(--measure);
    font-size:17px;
    line-height:1.75;
    color:var(--ink-soft);
    font-weight:300;
    text-align:left;
    margin:0 auto;
  }

  /* Category breakdown */
  .cat-breakdown{margin-bottom:44px;display:flex;flex-direction:column;gap:16px;max-width:480px;margin-left:auto;margin-right:auto;text-align:left;}
  .cat-row-item{display:flex;align-items:center;gap:14px;}
  .cat-row-icon{width:22px;height:22px;flex-shrink:0;}
  .cat-row-icon svg{width:100%;height:100%;}
  .cat-row-label{width:120px;flex-shrink:0;font-size:13.5px;font-weight:500;color:var(--ink);}
  .cat-row-bar{flex:1;height:7px;border-radius:6px;background:var(--line);overflow:hidden;}
  .cat-row-bar span{display:block;height:100%;}
  .cat-row-pct{width:38px;flex-shrink:0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink-faint);}

  .daystrip{
    margin-top:40px;
    display:flex;
    gap:0;
    overflow-x:auto;
    padding-bottom:10px;
    scrollbar-width:thin;
  }
  .daychip{
    flex:0 0 auto;
    width:132px;
    padding:0 18px 0 0;
    position:relative;
  }
  .daychip::after{
    content:'';
    position:absolute;
    top:9px; left:0; right:18px;
    height:1px;
    background:var(--line);
  }
  .daychip:last-child::after{display:none;}
  .daychip .dn{
    width:19px;height:19px;
    border:1px solid var(--lagoon);
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:9px;color:var(--lagoon-deep);
    background:var(--cream);
    position:relative;z-index:1;
    font-weight:500;
  }
  .daychip .dp{
    margin-top:14px;
    font-size:12.5px;
    line-height:1.4;
    color:var(--ink-soft);
    padding-right:14px;
  }

  /* Day-by-day itinerary */
  .day-row{
    display:grid;
    grid-template-columns:100px 1fr;
    gap:32px;
    padding:40px 0;
    position:relative;
    text-align:left;
  }
  .day-row + .day-row{border-top:1px solid var(--line);}

  .day-rail{position:relative;}
  .day-num{
    font-family:'Playfair Display', serif;
    font-size:42px;
    font-weight:400;
    color:var(--lagoon-deep);
    line-height:1;
  }
  .day-date{
    margin-top:10px;
    font-size:11px;
    letter-spacing:.14em;
    text-transform:uppercase;
    color:var(--ink-faint);
  }

  .day-place{
    font-family:'Playfair Display', serif;
    font-style:italic;
    font-size:22px;
    font-weight:400;
    margin:0 0 6px;
  }

  .day-tags{
    display:none !important;
  }
  .tag{
    font-size:10.5px;
    letter-spacing:.12em;
    text-transform:uppercase;
    color:var(--lagoon-deep);
    border:1px solid var(--lagoon);
    padding:4px 10px;
    border-radius:20px;
    background:var(--lagoon-pale);
  }

  .day-activities{list-style:none !important;list-style-type:none !important;margin:0;padding:0;padding-left:0 !important;}
  .day-activities li{
    display:flex;
    gap:12px;
    align-items:flex-start;
    padding:9px 0;
    font-size:15px;
    line-height:1.55;
    color:var(--ink);
    border-top:1px solid var(--cream-deep);
    list-style:none !important;
    margin-left:0 !important;
  }
  .day-activities li:first-child{border-top:none;}
  .day-activities .icon{
    flex:0 0 auto;
    width:16px;height:16px;
    margin-top:3px;
    color:var(--lagoon);
  }
  .day-activities .icon svg{width:100%;height:100%;display:block;}

  .day-stay{
    margin-top:20px;
    padding-top:16px;
    border-top:1px dashed var(--line);
    font-size:12.5px;
    letter-spacing:.06em;
    color:var(--ink-soft);
    display:flex;
    align-items:center;
    gap:8px;
  }
  .day-stay .icon{width:14px;height:14px;color:var(--gold);}
  .day-stay .icon svg{width:100%;height:100%;}

  @media (max-width:640px){
    .day-row{grid-template-columns:1fr;gap:14px;}
    .day-rail{display:flex;align-items:baseline;gap:12px;}
  }

  .extras-stack{display:flex;flex-direction:column;text-align:left;}

  .extra-block{max-width:520px;margin-left:auto;margin-right:auto;}
  .extra-block + .extra-block{margin-top:40px;}
  .extra-title{
    font-family:'Playfair Display', serif;
    font-size:20px;
    margin:0 0 20px;
  }

  table.costs{width:100%;border-collapse:collapse;}
  table.costs tr{border-top:1px solid var(--line);}
  table.costs tr:first-child{border-top:none;}
  table.costs td{padding:13px 0;font-size:14px;vertical-align:top;}
  table.costs td.desc{color:var(--ink);padding-right:18px;}
  table.costs td.val{
    color:var(--lagoon-deep);
    text-align:right;
    white-space:nowrap;
    font-family:'Playfair Display', serif;
    font-size:15px;
  }

  ul.checklist{list-style:none;margin:0;padding:0;}
  ul.checklist li{
    display:flex;gap:12px;align-items:flex-start;
    font-size:14px;line-height:1.6;color:var(--ink-soft);
    padding:10px 0;border-top:1px solid var(--cream-deep);
  }
  ul.checklist li:first-child{border-top:none;}
  ul.checklist .box{
    flex:0 0 auto;width:13px;height:13px;margin-top:3px;
    border:1px solid var(--gold);border-radius:3px;
  }

  .tips-box{
    margin-top:56px;
    padding:28px 30px;
    background:var(--paper);
    border-left:2px solid var(--lagoon);
    font-size:13.5px;
    line-height:1.75;
    color:var(--ink-soft);
  }
  .tips-box b{color:var(--ink);font-weight:500;}

  .route-line{
    margin-top:70px;
    position:relative;
    padding-top:0;
  }
  .route-track{
    position:relative;
    display:flex;
    align-items:flex-start;
    overflow-x:auto;
    padding:10px 0 30px;
  }
  .route-track::before{
    content:'';
    position:absolute;
    top:5px; left:0; right:0;
    height:1px;
    background:repeating-linear-gradient(to right, var(--gold) 0 6px, transparent 6px 11px);
  }
  .stop{
    flex:0 0 auto;
    width:150px;
    text-align:center;
    padding-top:16px;
    position:relative;
  }
  .stop .pt{
    position:absolute;top:0;left:50%;
    transform:translateX(-50%);
    width:11px;height:11px;border-radius:50%;
    background:var(--lagoon-deep);
    border:2px solid var(--cream);
    outline:1px solid var(--lagoon-deep);
  }
  .stop .sname{
    margin-top:14px;
    font-size:12.5px;
    line-height:1.4;
    color:var(--ink);
    padding:0 8px;
  }
  .stop .sidx{
    font-size:10px;letter-spacing:.14em;color:var(--ink-faint);
    text-transform:uppercase;
  }

  footer{
    padding:56px 0 70px;
    text-align:center;
  }
  footer .fmark{
    font-family:'Playfair Display', serif;
    font-style:italic;
    font-size:20px;
    margin-bottom:10px;
  }
  footer .fsrc{
    font-size:12px;
    color:var(--ink-faint);
  }
  footer .fsrc a{color:var(--lagoon-deep);}

  .map-frame{
    max-width:700px;
    margin:0 auto 40px;
    border-radius:12px;
    overflow:hidden;
    border:1px solid var(--line);
  }
  .map-frame svg{display:block;width:100%;height:auto;}

  @media (max-width:640px){
    .wrap{padding:0 20px;}
    .hero-meta{gap:0;}
    .hero-meta div{padding:0 16px;}
  }

  @media (max-width:940px){
    body{background:var(--paper);}
    .sheet{margin:0;box-shadow:none;max-width:none;}
  }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; max-width: none; }
    .hero { min-height: auto; padding: 40px 0 0; }
    section { padding: 48px 0; }
    .day-row, .extra-block { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="sheet">

<header class="hero" style="{{COVER_STYLE}}">
  <nav class="hero-nav">
    <span>Itinerario di viaggio</span>
    <span>{{HERO_NAV_RIGHT}}</span>
  </nav>
  <div class="hero-body">
    <div class="hero-eyebrow">{{HERO_EYEBROW}}</div>
    <h1 class="hero-title serif">{{TITLE}}</h1>
    <p class="hero-sub">{{HERO_SUB}}</p>
    <div class="hero-dates">{{COVER_SUB}}</div>
  </div>
  <svg class="wave" viewBox="0 0 1200 90" preserveAspectRatio="none">
    <path d="M0,40 C150,90 350,0 600,40 C850,80 1050,10 1200,40 L1200,90 L0,90 Z" fill="#FFFFFF"></path>
  </svg>
</header>

<section id="overview">
  <div class="wrap">
    <div class="section-head">
      <div class="label">Panoramica</div>
      <h2 class="section-title serif">{{OVERVIEW_TITLE}}</h2>
    </div>
    <p class="lede">{{OVERVIEW_DESC}}</p>
    {{STYLE_BREAKDOWN}}
    <div class="daystrip">{{DAYSTRIP}}</div>
  </div>
</section>

<section id="itinerary">
  <div class="wrap">
    <div class="section-head">
      <div class="label">Giorno per giorno</div>
      <h2 class="section-title serif">Il programma</h2>
    </div>
    <div>{{DAYS}}</div>
  </div>
</section>

<section id="extras">
  <div class="wrap">
    <div class="section-head">
      <div class="label">Da sapere</div>
      <h2 class="section-title serif">Costi, note &amp; bagaglio</h2>
    </div>
    <div class="extras-stack">{{WAVES_EXTRAS}}</div>
    <div class="tips-box"{{TIPS_STYLE}}>{{TIPS}}</div>
  </div>
</section>

{{MAP_SECTION}}

<footer>
  <div class="fmark serif">{{TITLE}}</div>
  <div class="fsrc">{{FOOTER_SRC}}</div>
</footer>

</div>
</body>
</html>`;

const CLASSIC = `<!DOCTYPE html>
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
  .map-frame { max-width: 560px; margin: 0 auto 44px; var(--rule); border-radius: 16px; overflow: hidden; break-inside: avoid; }
  .map-frame svg { display: block; width: 100%; height: auto; }
.tm-root {
  --map-sea: #F4F8FA;
  --map-land: #E8D5BF;
  --map-coast: rgba(140, 155, 145, 0.35);

  --map-lake: rgba(155, 195, 215, 0.45);
  --map-lake-label: #7EA4B8;

  --map-border: rgba(160, 145, 130, 0.40);
  --map-border-disputed: rgba(180, 150, 110, 0.35);

  --map-city-dot: #9A7A64;
  --map-city-label: #7A6455;

  --map-route: #5A8A9E;
  --map-route-casing: rgba(255, 255, 255, 0.90);
  --map-route-dash: 8 5;

  --map-marker-ring: #5A8A9E;
  --map-marker-bg: #FFFFFF;
  --map-marker-text: #3A6A7E;

  --map-label: #3A5A66;

  --map-line-w: 3;
  --map-marker-r: 10;

  font-family: var(--font-mono);
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

export const TEMPLATES = {
  classic: { name: "Classico", html: CLASSIC },
  waves: { name: "Waves", html: WAVES },
};

// Backward compatibility: export vecchio nome
export const EXPORT_TEMPLATE = CLASSIC;