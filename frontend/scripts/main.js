// === ANDES CITY — MAIN (Router estable + puente UI) ===
// - Maneja navegación por secciones usando data-section
// - Abre módulos en iframe con altura estable (sin "ventanas enanas")
// - Emite eventos para que la UI vieja se enganche sin romper el router

// ====== Config ======
const MODULES = {
  contaminacion: "modules/contaminacion/index.html",
  incidencias: "modules/incidencias/index.html",
};

// ====== Util ======
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Transición + render
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
  }, 180);
}

// Tema → iframes
function syncThemeToIframes() {
  const frames = $$(".module-frame");
  const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  frames.forEach((f) => {
    try { f.contentWindow.postMessage({ type: "set-theme", theme }, "*"); } catch {}
  });
}
new MutationObserver(syncThemeToIframes).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});

// ====== HOME ======
function loadHome() {
  transitionContent(`
    <section class="welcome fade-in">
      <!-- 🔒 Zona protegida: el legacy solo puede dibujar dentro de #legacy-root -->
      <div id="legacy-root">
        <div class="logo"><!-- UI legacy puede decorar aquí --></div>
        <h2 class="brand-title">🏙️ <span class="brand-accent">Andes City</span></h2>
        <p class="brand-subtitle">Panel principal</p>
        <div class="data-card">
          <h3>Recomendaciones</h3>
          <ul id="recomendaciones" class="mini-list"></ul>
        </div>
      </div>
    </section>
  `, () => {
    console.info("[Router] HOME montado");
    // Señal para UI legacy
    document.dispatchEvent(new CustomEvent("andes:home-mounted"));
    // Cargar/forzar legacy
    injectLegacyUI(true);
    // Activar el escudo anti-clobber
    enableAntiClobberShield();
  });
}


// === Escudo anti-clobber: evita que ui-legacy.js u otros sobrescriban #main-content ===
let __ROUTER_WRITING__ = false;
function enableAntiClobberShield() {
  const host = document.getElementById("main-content");
  if (!host || host.__shieldOn) return;

  // Marca para saber que el router está escribiendo legítimamente
  const _transitionContent = window.transitionContent;
  window.transitionContent = function (html, after) {
    __ROUTER_WRITING__ = true;
    _transitionContent(html, () => {
      __ROUTER_WRITING__ = false;
      if (typeof after === "function") after();
    });
  };

  // Observa cambios extraños en main-content
  const observer = new MutationObserver((muts) => {
    if (__ROUTER_WRITING__) return; // cambios válidos del router
    // Si el HOME está activo, exigimos que siga existiendo #legacy-root
    const isHome = document.querySelector('.menu li.active[data-section="home"]');
    if (isHome) {
      const legacyRoot = document.getElementById("legacy-root");
      if (!legacyRoot) {
        console.warn("[Shield] Otro script intentó reemplazar #main-content en HOME. Restauro UI.");
        // Volver a montar el Home del router sin perder navegación
        loadHome();
      }
    }
  });
  observer.observe(host, { childList: true, subtree: true });
  host.__shieldOn = true;
}




// ====== Iframe para módulos ======
function calcModuleHeight() {
  return Math.max(560, Math.round(window.innerHeight * 0.86) - 120);
}
function loadModuleIframe(src, title, key) {
  const h = calcModuleHeight();
  transitionContent(`
    <section class="welcome fade-in" style="padding:0">
      <div class="data-card module-card" style="padding:0; overflow:hidden; border-radius:16px">
        <div class="mod-skeleton" style="height:${h}px; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#fafafa,#f2f4f7); border-bottom:1px solid #e5e7eb;">
          <div class="spinner" style="width:36px;height:36px;border-radius:50%; border:3px solid #c7cde1;border-top-color:#111827;animation:spin 1s linear infinite"></div>
        </div>
        <iframe class="module-frame" src="${src}" title="${title || "Módulo Andes City"}" loading="eager" style="width:100%; height:${h}px; display:none; border:0" allow="fullscreen"></iframe>
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
      // Avisar a UI que un módulo se montó (por si tu UI usa banners/animaciones globales)
      document.dispatchEvent(new CustomEvent("andes:module-mounted", { detail: { key } }));
    });

    // Fallback: si onload no llegó
    setTimeout(() => {
      if (skeleton && skeleton.style.display !== "none") {
        skeleton.style.display = "none";
        frame.style.display = "block";
        document.dispatchEvent(new CustomEvent("andes:module-mounted", { detail: { key } }));
      }
    }, 8000);
  });
}

// ====== Navegación (router) ======
function navigate(section) {
  if (!section) return;
  // Estado visual del menú
  $$(".menu li").forEach((n) => n.classList.remove("active"));
  const active = $(`.menu li[data-section="${section}"]`);
  if (active) active.classList.add("active");

  // Rutas
  if (section === "home") return loadHome();
  if (section === "contaminacion") return loadModuleIframe(MODULES.contaminacion, "Clima & Calidad del Aire", "contaminacion");
  if (section === "incidencias") return loadModuleIframe(MODULES.incidencias, "Incidencias Urbanas", "incidencias");

  // Por defecto: pantalla simple
  transitionContent(`<div class="data-card fade-in"><h3>${section}</h3><p class="muted">Contenido en construcción.</p></div>`);
}

// Interceptar clicks del menú en CAPTURA (evita que handlers viejos se cuelen)
document.addEventListener("DOMContentLoaded", () => {
  const menu = $(".menu");
  if (menu) {
    menu.addEventListener("click", (ev) => {
      const li = ev.target.closest("li[data-section]");
      if (!li) return;
      ev.preventDefault();
      ev.stopPropagation(); // bloquea handlers legados
      navigate(li.getAttribute("data-section"));
    }, true); // 👈 captura
  }

  // Ruta inicial
  navigate("home");
});

// ====== Carga dinámica de tu UI vieja (una vez) ======
let legacyLoaded = false, legacyTried = false;
function injectLegacyUI(forceInit = false) {
  const target = document.getElementById("legacy-root");
  // 👉 damos al legacy un objetivo claro (dentro del Home)
  window.__LEGACY_TARGET__ = target || null;

  if (legacyLoaded) { safeLegacyInit(); return; }
  if (legacyTried)  { safeLegacyInit(); return; }
  legacyTried = true;

  const s = document.createElement("script");
  // 🔧 AJUSTA ESTA RUTA si es necesario:
  s.src = "scripts/ui-legacy.js";
  s.async = true;
  s.onload = () => { legacyLoaded = true; console.info("[Router] ui-legacy cargado OK"); safeLegacyInit(); };
  s.onerror = (e) => { console.error("[Router] ui-legacy NO cargó (ruta?)", e); };
  document.head.appendChild(s);

  setTimeout(safeLegacyInit, 1500);

  function safeLegacyInit(){
    try {
      // Si el legacy expone una init, pásale el target seguro
      if (window.AndesLegacyUI && typeof window.AndesLegacyUI.init === "function") {
        window.AndesLegacyUI.init(window.__LEGACY_TARGET__);
        console.info("[Router] AndesLegacyUI.init() llamado");
      }
      // Fallback mínimo si el legacy no pinta nada
      const logo = document.querySelector("#legacy-root .logo");
      const recs = document.querySelector("#legacy-root #recomendaciones");
      if (logo && !logo.classList.contains("decorate-ready")) {
        logo.classList.add("decorate-ready", "animate");
      }
      if (recs && recs.children.length === 0) {
        recs.innerHTML = `
          <li>🌦️ Revisa la calidad del aire antes de actividades al aire libre.</li>
          <li>🌱 Monitorea la humedad del suelo en Agro.</li>
          <li>🌓 Activa modo oscuro por la noche.</li>`;
      }
      window.__legacyOK = true;
    } catch (err) {
      console.warn("[Router] init legacy falló (continuamos):", err);
    }
  }
}


// ====== Estilos mínimos si faltan ======
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
