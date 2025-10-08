// === ANDES CITY — MAIN (limpio y estable) ===
// Controla navegación por secciones y despliegue de módulos (contaminación e incidencias)
// en iframes con altura dinámica. Sustituye por completo tu archivo main.js.

// Requisitos en el HTML:
// - <ul class="menu"><li data-section="home">...</li> ...</ul>
// - <main id="main-content"></main>
// - Hojas de estilo propias del sitio (opcional). Este script agrega estilos mínimos si faltan.

// ============== Selección de elementos base ==============
const sections = document.querySelectorAll('.menu li');
const mainContent = document.getElementById('main-content');

// ============== Transición de vistas ==============
function transitionContent(html, afterRender) {
  if (!mainContent) return;
  mainContent.classList.remove('fade-in');
  mainContent.classList.add('fade-out');
  setTimeout(() => {
    mainContent.innerHTML = html;
    mainContent.classList.remove('fade-out');
    mainContent.classList.add('fade-in');
    if (typeof afterRender === 'function') afterRender();
  }, 200);
}

// ============== Tema -> iframes ==============
function syncThemeToIframes() {
  const frames = document.querySelectorAll('.module-frame');
  const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  frames.forEach((f) => {
    try { f.contentWindow.postMessage({ type: 'set-theme', theme }, '*'); } catch {}
  });
}
new MutationObserver(syncThemeToIframes).observe(document.body, { attributes: true, attributeFilter: ['class'] });

// ============== HOME (demo simple; opcional) ==============
function loadHome() {
  transitionContent(`
    <section class="welcome fade-in">
      <h2>🏙️ Andes City</h2>
      <div class="data-card">
        <h3>Panel principal</h3>
        <p class="muted">Usa el menú para abrir Contaminación o Incidencias. Este panel es de ejemplo.</p>
      </div>
    </section>
  `);
}

// ============== Módulos externos en iframe ==============
// Rutas (ajústalas a tu proyecto real)
const MODULES = {
  contaminacion: 'modules/contaminacion/index.html',
  incidencias: 'modules/incidencias/index.html',
};

// Alto dinámico del iframe (evita “ventanas enanas”) — clamp entre 560px y ~86vh
function calcModuleHeight() { return Math.max(560, Math.round(window.innerHeight * 0.86) - 120); }

// Renderiza tarjeta + iframe con skeleton de carga
function loadModuleIframe(src, title) {
  const h = calcModuleHeight();
  transitionContent(`
    <section class="welcome fade-in" style="padding:0">
      <div class="data-card module-card" style="padding:0; overflow:hidden; border-radius:16px">
        <div class="mod-skeleton" style="height:${h}px; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#fafafa,#f2f4f7); border-bottom:1px solid #e5e7eb;">
          <div class="spinner" style="width:36px;height:36px;border-radius:50%; border:3px solid #c7cde1;border-top-color:#111827;animation:spin 1s linear infinite"></div>
        </div>
        <iframe class="module-frame" src="${src}" title="${title || 'Módulo Andes City'}" loading="eager" style="width:100%; height:${h}px; display:none; border:0" allow="fullscreen"></iframe>
      </div>
    </section>
  `, () => {
    const frame = document.querySelector('.module-frame');
    const skeleton = document.querySelector('.mod-skeleton');

    const setH = () => {
      const newH = calcModuleHeight();
      frame.style.height = newH + 'px';
      if (skeleton) skeleton.style.height = newH + 'px';
    };
    setH();
    window.addEventListener('resize', setH);

    frame.addEventListener('load', () => {
      if (skeleton) skeleton.style.display = 'none';
      frame.style.display = 'block';
      setTimeout(syncThemeToIframes, 30);
    });

    // Fallback si el onload no se emite
    setTimeout(() => {
      if (skeleton && skeleton.style.display !== 'none') {
        skeleton.style.display = 'none';
        frame.style.display = 'block';
      }
    }, 8000);
  });
}

// ============== Navegación ==============
document.addEventListener('DOMContentLoaded', () => {
  // estado visual de la barra
  sections.forEach((li) => li.addEventListener('click', () => {
    sections.forEach((n) => n.classList.remove('active'));
    li.classList.add('active');
  }));

  // router simple
  sections.forEach((item) => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');

      if (section === 'home') return loadHome();
      if (section === 'contaminacion') return loadModuleIframe(MODULES.contaminacion, 'Clima & Calidad del Aire');
      if (section === 'incidencias') return loadModuleIframe(MODULES.incidencias, 'Incidencias Urbanas');

      // Placeholder para otras secciones existentes en tu proyecto
      return transitionContent(`<div class="data-card fade-in"><h3>${section || 'Sección'}</h3><p class="muted">Contenido en construcción.</p></div>`);
    });
  });

  // vista inicial
  loadHome();
});

// ============== Estilos mínimos si faltan ==============
(function ensureBaseStyles(){
  if (document.getElementById('andes-inline-styles')) return;
  const tag = document.createElement('style');
  tag.id = 'andes-inline-styles';
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