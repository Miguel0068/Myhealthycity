// === ANDES CITY — main.js UNIFICADO ===
// Router estable + HOME compacto (logo, acordeones, recomendaciones, mapa preview)
// Basado en tu router estable y resumiendo el UI grande solo para HOME.
// (No hay ui-legacy.js; no hay inyecciones dinámicas.)

/* ===========================
   0) Config y utilidades
   =========================== */
const MODULES = {
  contaminacion: "modules/contaminacion/index.html",
  incidencias:   "modules/incidencias/index.html",
  movilidad:     "modules/movilidad/index.html",

};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const mainContent = $("#main-content");

// Monta el canvas de logo en la barra lateral (top-left)
function mountSidebarLogoCanvas() {
  // Contenedor de logo en sidebar
  const slot = document.querySelector('.sidebar .logo');
  if (!slot) return;

  // Limpia restos (img/iconos antiguos)
  slot.querySelectorAll('.logo-icon, img').forEach(n => n.remove());

  // Crea canvas si no existe
  let canvas = document.getElementById('logo-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'logo-canvas';
    canvas.width = 200;
    canvas.height = 90;
    // estilos responsivos suaves
    canvas.style.width = '200px';
    canvas.style.height = '90px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    slot.prepend(canvas);
  }
}

function transitionContent(html, afterRender) {
  if (!mainContent) return;
  mainContent.classList.remove("fade-in");
  mainContent.classList.add("fade-out");
  setTimeout(() => {
    mainContent.innerHTML = html;
    mainContent.classList.remove("fade-out");
    mainContent.classList.add("fade-in");
    if (typeof afterRender === "function") afterRender();
  }, 160);
}

// Sincroniza tema al hijo (si el módulo lo soporta)
function syncThemeToIframes() {
  const frames = $$(".module-frame");
  const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  frames.forEach(f => {
    try { f.contentWindow?.postMessage({ type: "set-theme", theme }, "*"); } catch {}
  });
}
new MutationObserver(syncThemeToIframes).observe(document.body, { attributes: true, attributeFilter: ["class"] });

/* ===========================
   1) HOME — datos y helpers (resumen del UI largo)
   =========================== */
// Datos compactos para tarjetas del HOME
const HC = {
  predicciones: [
    { t: "Tráfico", d: "Congestión moderada 17:00–19:00 en Av. Unidad Nacional. Alterna: Lizarzaburu." },
    { t: "Clima",   d: "Lluvia ligera esta noche (60%). Lleva capa si sales después de las 19:00." },
    { t: "Aire",    d: "AQI Bueno→Moderado 06:00–09:00 cerca del terminal." }
  ],
  avisos: [
    { t: "Municipalidad", d: "Calle Venezuela cierre parcial 09:00–14:00 (mantenimiento)." },
    { t: "Eventos",       d: "Feria de productores – Plaza Alfaro, sábado 10:00." },
    { t: "Seguridad",     d: "Desvíos por corrida atlética domingo 07:00–10:00." }
  ],
  turismo: [
    { t: "Mirador",     d: "Amanecer despejado — excelentes vistas tempranas." },
    { t: "Gastronomía", d: "Mercado tradicional: hornado y jugos naturales." },
    { t: "Cultura",     d: "Museo de la Ciudad — exposición temporal." }
  ],
  aurora: [
    { t: "Consejo",   d: "Camina o pedalea en trayectos cortos: menos CO₂, más salud." },
    { t: "Energía",   d: "Apaga dispositivos que no uses para evitar consumo fantasma." },
    { t: "Bienestar", d: "Pausas de 5 minutos cada hora + hidratación." }
  ]
};

// Estilos mínimos para acordeones (inyectados una sola vez)
function ensureAccordionStyles(){
  if (document.getElementById("ac-accordion-styles")) return;
  const css = `
  .ac-acc{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .ac-acc .acc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;cursor:pointer}
  .ac-acc .acc-head:hover{background:var(--hover-bg)}
  .acc-title{display:flex;align-items:center;gap:8px;font-weight:600}
  .acc-badge{font-size:12px;padding:4px 8px;border-radius:999px;background:var(--hover-bg);border:1px solid var(--line)}
  .acc-chev{transition:transform .2s ease;font-weight:700;opacity:.7}
  .ac-acc.open .acc-chev{transform:rotate(90deg)}
  .ac-acc .acc-body{overflow:hidden;max-height:0;transition:max-height .25s ease}
  .ac-acc.open .acc-body{max-height:520px}
  .ac-acc .mini-list{padding:12px}
  `;
  const tag = document.createElement("style");
  tag.id = "ac-accordion-styles";
  tag.textContent = css;
  document.head.appendChild(tag);
}

function buildAccordion({id, icon, title, items}){
  return `
    <article class="ac-acc" data-acc-id="${id}">
      <div class="acc-head" role="button" aria-expanded="false" aria-controls="${id}">
        <div class="acc-title"><span>${icon}</span><span>${title}</span></div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="acc-badge">${items.length}</span>
          <span class="acc-chev">›</span>
        </div>
      </div>
      <div class="acc-body" id="${id}">
        <ul class="mini-list">
          ${items.map(x=>`<li><b>${x.t}:</b> ${x.d}</li>`).join("")}
        </ul>
      </div>
    </article>
  `;
}

function attachAccordions(root=document){
  root.querySelectorAll(".ac-acc .acc-head").forEach(head=>{
    head.addEventListener("click", ()=>{
      const acc = head.closest(".ac-acc");
      const body = acc.querySelector(".acc-body");
      const open = acc.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      body.style.maxHeight = open ? (body.scrollHeight + "px") : "0px";
    });
  });
}

/* ===========================
   2) HOME — render
   =========================== */
function loadHome() {
  ensureAccordionStyles();

  transitionContent(`
    <section class="welcome fade-in">
      <div class="logo" style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:8px">
        <div class="aurora-circle" style="width:64px;height:64px;border-radius:50%;
             background: radial-gradient(circle at 30% 30%, #aeefff, #0077ff);
             box-shadow:0 0 18px rgba(0,0,0,.18)"></div>
        <h1 class="brand-title" style="margin:0">
          <span class="brand-accent" style="
            background: linear-gradient(90deg, #7ed0ff 0%, #9af5e3 100%);
            -webkit-background-clip:text;background-clip:text;color:transparent;">Andes City</span>
        </h1>
      </div>
      <p class="brand-subtitle" style="text-align:center;color:#5C7FA3">Predicciones, avisos y mapa activo de tu ciudad</p>

      <div class="data-card">
        <h3>🧭 Panorama de hoy</h3>
        <div class="cards-grid" id="ac-grid">
          ${buildAccordion({ id:"acc-pred",   icon:"🔮", title:"Predicciones", items: HC.predicciones })}
          ${buildAccordion({ id:"acc-avisos", icon:"📣", title:"Avisos",       items: HC.avisos })}
          ${buildAccordion({ id:"acc-tur",    icon:"🗺️", title:"Turismo",      items: HC.turismo })}
          ${buildAccordion({ id:"acc-aur",    icon:"💡", title:"Aurora",       items: HC.aurora })}
        </div>
      </div>

      <div class="data-card" style="margin-top:14px">
        <h3>🗺️ Mapa urbano</h3>
        <div id="map-preview" style="height:360px;border-radius:12px;border:1px solid var(--line);margin-top:8px"></div>
      </div>
    </section>
  `, () => {
    // Animación suave del “logo”
    const logo = $(".aurora-circle");
    if (logo) {
      logo.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], {
        duration: 1100, iterations: 1, easing: "ease-out"
      });
    }

    // Acordeones
    attachAccordions(mainContent);

    // Mapa preview (Leaflet opcional)
    if (typeof L !== "undefined") {
      const el = $("#map-preview");
      if (el && !el._leaflet_id) {
        const map = L.map(el).setView([-1.664, -78.654], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18, attribution: "© OpenStreetMap"
        }).addTo(map);
        L.marker([-1.664, -78.654]).addTo(map).bindPopup("📍 Riobamba").openPopup();
        setTimeout(() => map.invalidateSize(), 200);
      }
    }
  });
}

/* ===========================
   3) Módulos en iframe (Contaminación / Incidencias)
   =========================== */
function calcModuleHeight() {
  return Math.max(560, Math.round(window.innerHeight * 0.86) - 120);
}

function loadModuleIframe(src, title) {
  const h = calcModuleHeight();
  transitionContent(`
    <section class="welcome fade-in" style="padding:0">
      <div class="data-card module-card" style="padding:0; overflow:hidden; border-radius:16px">
        <div class="mod-skeleton" style="height:${h}px;display:flex;align-items:center;justify-content:center;
             background:linear-gradient(180deg,#fafafa,#f2f4f7);border-bottom:1px solid #e5e7eb;">
          <div class="spinner" style="width:36px;height:36px;border-radius:50%;
               border:3px solid #c7cde1;border-top-color:#111827;animation:spin 1s linear infinite"></div>
        </div>
        <iframe class="module-frame" src="${src}" title="${title || "Módulo Andes City"}"
          loading="eager" style="width:100%;height:${h}px;display:none;border:0" allow="fullscreen"></iframe>
      </div>
    </section>
  `, () => {
    const frame = $(".module-frame");
    const skeleton = $(".mod-skeleton");
    const setH = () => {
      const newH = calcModuleHeight();
      frame.style.height = newH + "px";
      if (skeleton) skeleton.style.height = newH + "px";
    };
    setH();
    window.addEventListener("resize", setH);

    frame.addEventListener("load", () => {
      if (skeleton) skeleton.style.display = "none";
      frame.style.display = "block";
      syncThemeToIframes();
    });

    // Fallback por si onload no dispara
    setTimeout(() => {
      if (skeleton && skeleton.style.display !== "none") {
        skeleton.style.display = "none";
        frame.style.display = "block";
      }
    }, 8000);
  });
}

/* ===========================
   4) Router (navegación)
   =========================== */
function navigate(section) {
  $$(".menu li").forEach(n => n.classList.remove("active"));
  const act = $(`.menu li[data-section="${section}"]`);
  if (act) act.classList.add("active");

  if (section === "home")          return loadHome();
  if (section === "contaminacion") return loadModuleIframe(MODULES.contaminacion, "Clima & Calidad del Aire");
  if (section === "incidencias")   return loadModuleIframe(MODULES.incidencias, "Incidencias Urbanas");

  transitionContent(`<div class="data-card fade-in"><h3>${section}</h3><p class="muted">Contenido en construcción.</p></div>`);
}

document.addEventListener("DOMContentLoaded", () => {
  const menu = $(".menu");
  if (menu) {
    // fase de captura para evitar handlers anteriores
    menu.addEventListener("click", (ev) => {
      const li = ev.target.closest("li[data-section]");
      if (!li) return;
      ev.preventDefault();
      ev.stopPropagation();
      navigate(li.getAttribute("data-section"));
    }, true);
  }

  // 👉 Inserta el canvas en la barra lateral (logo arriba-izquierda)
  mountSidebarLogoCanvas();

  // Vista inicial
  navigate("home");
});

/* ===========================
   5) Estilos mínimos (por si faltan)
   =========================== */
(function ensureBaseStyles(){
  if (document.getElementById("andes-inline-styles")) return;
  const tag = document.createElement("style");
  tag.id = "andes-inline-styles";
  tag.textContent = `
    @keyframes spin {to{transform:rotate(1turn)}}
    .fade-in{animation:fi .18s ease both}
    .fade-out{animation:fo .18s ease both}
    @keyframes fi{from{opacity:0; transform:translateY(4px)}to{opacity:1; transform:none}}
    @keyframes fo{from{opacity:1}to{opacity:0}}
    .data-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;box-shadow:0 6px 24px rgba(16,24,40,.06)}
    .data-card h3{color:var(--ink)}           /* asegura color correcto en modo oscuro */
    .brand-subtitle{color:var(--muted)}       /* subtítulo toma la variable de tema */
    .welcome{max-width:1200px;margin:0 auto;padding:8px 12px}
    .menu li.active{font-weight:600}
  `;
  document.head.appendChild(tag);
})();

/* =========================================================
   6) LOGO CANVAS — (picos OFF + subrayado animado + contraste)
   Pegado tal cual, sin alterar tu lógica ni el router.
   ========================================================= */
(function initAndesCanvasLogo() {
  // borra restos de <img> si quedaron
  document.querySelectorAll('.logo-icon').forEach(n => n.remove());

  const el = document.getElementById('logo-canvas');
  if (!el) return;

  const ctx = el.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  function parseColorToRgb(c) {
    if (!c) return {r: 0, g: 0, b: 0};
    if (c.startsWith('rgb')) {
      const [r,g,b] = c.match(/\d+/g).map(Number);
      return {r, g, b};
    }
    if (c[0] === '#') {
      const hex = c.length === 4
        ? c.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3')
        : c;
      const int = parseInt(hex.slice(1), 16);
      return { r: (int>>16)&255, g: (int>>8)&255, b: int&255 };
    }
    return {r: 0, g: 0, b: 0};
  }
  function relLuma({r,g,b}) {
    const cv = [r,g,b].map(v=>{
      v/=255;
      return (v<=0.03928)? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    });
    return 0.2126*cv[0]+0.7152*cv[1]+0.0722*cv[2];
  }
  function sidebarIsDark() {
    const sb = document.querySelector('.sidebar');
    const bg = getComputedStyle(sb||document.body).backgroundColor;
    return relLuma(parseColorToRgb(bg)) < 0.35;
  }

  function resize() {
    const cssW = el.clientWidth || 200;
    const cssH = el.clientHeight || 90;
    el.width = Math.round(cssW * DPR);
    el.height = Math.round(cssH * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  let t = 0;
  const speed = 0.018;

  function draw() {
    const w = el.width / DPR;
    const h = el.height / DPR;

    const darkBg = sidebarIsDark();
    const ink      = darkBg ? '#ECECEC' : '#171717';
    const baseLine = darkBg ? '#EFEFEF' : '#6BA0B5';
    const glowA    = '#7ED0FF';
    const glowB    = '#9AF5E3';

    ctx.clearRect(0, 0, w, h);

    // Texto marca
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = '700 20px "Inter Tight", "Outfit", system-ui, sans-serif';
    ctx.textBaseline = 'top';

    const title = 'ANDES CITY';
    const startX = w * 0.10;
    let x = startX, yText = h * 0.60;
    const track = 1.8;

    for (const ch of title) {
      ctx.fillText(ch, x, yText);
      x += ctx.measureText(ch).width + track + (ch === ' ' ? 6 : 0);
    }
    ctx.restore();

    // Subrayado degradado + shimmer
    const ulY = yText + 24;
    const ulL = startX;
    const ulR = Math.min(w * 0.92, x);

    const grad = ctx.createLinearGradient(ulL, 0, ulR, 0);
    grad.addColorStop(0.00, glowB);
    grad.addColorStop(0.50, glowA);
    grad.addColorStop(1.00, baseLine);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ulL, ulY);
    ctx.lineTo(ulR, ulY);
    ctx.stroke();

    const band = Math.max(24, (ulR-ulL)*0.12);
    const cx = ulL + ((Math.sin(t) + 1) / 2) * (ulR - ulL - band) + band/2;

    const grad2 = ctx.createRadialGradient(cx, ulY, 0, cx, ulY, band/2);
    grad2.addColorStop(0.0, darkBg ? 'rgba(126,208,255,0.55)' : 'rgba(126,208,255,0.8)');
    grad2.addColorStop(1.0, 'rgba(126,208,255,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(cx - band/2, ulY - 6, band, 12);

    ctx.save();
    ctx.shadowColor = darkBg ? 'rgba(126,208,255,0.45)' : 'rgba(126,208,255,0.65)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, ulY, 2.4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function loop() { t += speed; draw(); requestAnimationFrame(loop); }

  const obs = new MutationObserver(() => draw());
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => { resize(); draw(); });

  function start() {
    const s = el.style;
    if (!s.width)  s.width  = '200px';
    if (!s.height) s.height = '90px';
    resize();
    draw();
    loop();
  }
  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
