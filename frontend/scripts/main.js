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
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const mainContent = $("#main-content");

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
    .welcome{max-width:1200px;margin:0 auto;padding:8px 12px}
    .menu li.active{font-weight:600}
  `;
  document.head.appendChild(tag);
})();
