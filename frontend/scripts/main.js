// === 🌐 Configuración local sin conexión a backend ===

// === Elementos del DOM ===
const sections = document.querySelectorAll(".menu li");
const mainContent = document.getElementById("main-content");

// === Animación de transición (con callback post-render) ===
function transitionContent(html, afterRender) {
  mainContent.classList.remove("fade-in");
  mainContent.classList.add("fade-out");
  setTimeout(() => {
    mainContent.innerHTML = html;
    mainContent.classList.remove("fade-out");
    mainContent.classList.add("fade-in");
    if (typeof afterRender === "function") afterRender();
  }, 250);
}

// === Consejos estáticos de Aurora ===
const auroraTips = [
  "🌱 Cuida tus espacios verdes: cada planta es un pequeño pulmón para la ciudad.",
  "🚶‍♀️ Muévete con propósito: caminar o pedalear ayuda a reducir el ruido y el estrés urbano.",
  "💧 Hidrátate y desconecta: la salud mental también es parte del ecosistema.",
  "⚡ Usa energía con conciencia: apaga lo que no usas y tu ciudad te lo agradecerá.",
  "🌤️ Incluso los satélites descansan. Desconéctate para reconectarte."
];

// === Respuestas locales de Aurora (mock) ===
function auroraLocalResponse() {
  const responses = [
    "🌤️ Aurora: ¡Qué gusto hablar contigo! Recuerda, cada acción sostenible cuenta 💚",
    "💬 Aurora: Hoy es un buen día para cuidar tu entorno 🌎",
    "🌿 Aurora: Tu compromiso inspira a otros ciudadanos 🌱",
    "🌈 Aurora: Gracias por hacer de la ciudad un lugar más saludable 🌤️"
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// === Datos del HOME (tarjetas compactas) ===
const HC = {
  predicciones: [
    { t: "Tráfico", d: "Congestión moderada 17:00–19:00 en Av. Unidad Nacional. Alterna: Lizarzaburu." },
    { t: "Clima",   d: "Lluvia ligera esta noche (60%). Lleva capa si sales después de las 19:00." },
    { t: "Aire",    d: "AQI Bueno→Moderado 06:00–09:00 cerca del terminal." }
  ],
  avisos: [
    { t: "Municipalidad", d: "Cierre parcial Calle Venezuela 09:00–14:00 (mantenimiento)." },
    { t: "Eventos",       d: "Feria de productores – Plaza Alfaro, sábado 10:00." },
    { t: "Seguridad",     d: "Desvíos por corrida atlética domingo 07:00–10:00." }
  ],
  turismo: [
    { t: "Mirador",     d: "Amanecer en mirador local (cielo despejado temprano)." },
    { t: "Gastronomía", d: "Mercado tradicional — hornado y jugos naturales." },
    { t: "Cultura",     d: "Museo de la Ciudad — exposición temporal." }
  ],
  aurora: [
    { t: "Consejo",   d: "Camina o pedalea en trayectos cortos: menos CO₂, más salud." },
    { t: "Energía",   d: "Apaga dispositivos que no uses para evitar consumo fantasma." },
    { t: "Bienestar", d: "Pausas de 5 minutos cada hora + hidratación." }
  ]
};

// —— Estilos del acordeón (inyectados una sola vez) ——
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

// —— Constructor de tarjeta/acordeón ——
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

// —— Activación de acordeones ——
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

// === MÓDULOS IFRAME (Contaminación / Incidencias) ===
const MODULES = {
  contaminacion: "modules/contaminacion/index.html",
  incidencias:   "modules/incidencias/index.html", // 👈 agregado
};

// Cargar un módulo aislado en un iframe dentro de una data-card
function loadModuleIframe(src, title = "Módulo Andes City") {
  const html = `
    <section class="welcome fade-in" style="padding:0">
      <div class="data-card" style="padding:0; overflow:hidden">
        <iframe class="module-frame" src="${src}" title="${title}" loading="eager"></iframe>
      </div>
    </section>`;
  transitionContent(html, () => setTimeout(syncThemeToIframes, 50));
}

// Enviar el tema actual (dark/light) a todos los iframes de módulos
function syncThemeToIframes() {
  const frames = document.querySelectorAll(".module-frame");
  const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  frames.forEach(f => {
    try { f.contentWindow.postMessage({ type: "set-theme", theme }, "*"); } catch {}
  });
}

// Observa cambios de clase (cuando el botón de tema viva en el HTML)
new MutationObserver(syncThemeToIframes).observe(document.body, { attributes:true, attributeFilter:['class'] });

// === HOME (layout compacto + mapa + acordeones) ===
async function loadHome() {
  ensureAccordionStyles();

  transitionContent(`
    <section class="welcome fade-in">
      <h1 class="brand-title">
        <span class="brand-accent">ANDES CITY</span> — inteligencia urbana local
      </h1>
      <p class="brand-subtitle">Predicciones, avisos y mapa activo de tu ciudad en una sola vista.</p>

      <div class="data-card">
        <h3>🧭 Panorama de hoy</h3>
        <div class="cards-grid" id="ac-grid">
          ${buildAccordion({ id:"acc-pred",   icon:"🔮", title:"Predicciones", items: HC.predicciones })}
          ${buildAccordion({ id:"acc-avisos", icon:"📣", title:"Avisos",       items: HC.avisos })}
          ${buildAccordion({ id:"acc-tur",    icon:"🗺️", title:"Turismo",      items: HC.turismo })}
          ${buildAccordion({ id:"acc-aur",    icon:"💡", title:"Aurora",       items: HC.aurora })}
        </div>
      </div>

      <div class="city-stats">
        <div class="stat-card">🌡️ <h4>23°C</h4><p>Temperatura actual</p></div>
        <div class="stat-card">💨 <h4>Buena</h4><p>Calidad del aire</p></div>
        <div class="stat-card">🚗 <h4>Fluido</h4><p>Tráfico urbano</p></div>
      </div>

      <div class="data-card">
        <h3>🗺️ Mapa urbano</h3>
        <p>Tu ubicación aproximada y zonas urbanas activas.</p>
        <div id="map-preview"></div>
      </div>
    </section>
  `, () => {
    // 1) activar acordeones cuando el DOM ya está pintado
    attachAccordions(mainContent);

    // 2) inicializar mapa con guard (para que no se duplique)
    const mapEl = document.getElementById('map-preview');
    if (mapEl && !mapEl._leaflet_id) {
      const map = L.map(mapEl).setView([-1.664, -78.654], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.marker([-1.664, -78.654]).addTo(map).bindPopup("📍 Riobamba, Ecuador").openPopup();
    }
  });
}

// === Cargar Home al inicio ===
document.addEventListener("DOMContentLoaded", loadHome);

// === Navegación dinámica ===
sections.forEach(item => {
  item.addEventListener("click", async () => {
    const section = item.getAttribute("data-section");
    sections.forEach(li => li.classList.remove("active"));
    item.classList.add("active");

    if (section === "home") return loadHome();

    // === 🚲 MOVILIDAD ===
    if (section === "movilidad") {
      transitionContent(`
        <div class="data-card fade-in">
          <h3>🚲 Movilidad Sostenible</h3>
          <p>Explora rutas ecológicas, puntos de carga y tráfico en tiempo real en <b>Riobamba, Ecuador</b>.</p>
          <div id="map-container" style="height:80vh; width:100%; border-radius:12px; overflow:hidden; margin-top:10px;"></div>
        </div>
      `, () => {
        const map = L.map('map-container', { zoomControl: true }).setView([-1.664, -78.654], 13);

        // Capas base
        const voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap & CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri, USGS, IGN',
          maxZoom: 19
        });

        const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap, SRTM',
          maxZoom: 17
        });

        L.control.layers({ "🗺️ Voyager": voyager, "🛰️ Satélite": satellite, "⛰️ Topográfico": topo }, null, { position: 'topright', collapsed: false }).addTo(map);

        const bikeIcon = L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png", iconSize: [28, 28] });
        [
          { lat: -1.662, lng: -78.655, name: "CicloRuta Central" },
          { lat: -1.666, lng: -78.648, name: "Punto Ecológico Sur" },
          { lat: -1.658, lng: -78.662, name: "Estación Verde Norte" }
        ].forEach(p => L.marker([p.lat, p.lng], { icon: bikeIcon }).addTo(map).bindPopup(`🚴 <b>${p.name}</b>`));

        L.circle([-1.664, -78.654], { radius: 2000, color: "#00aaff", fillColor: "#00aaff", fillOpacity: 0.1 }).addTo(map);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            L.marker([latitude, longitude]).addTo(map).bindPopup("📍 Estás aquí").openPopup();
            map.setView([latitude, longitude], 14);
          });
        }
      });
      return;
    }

    // === 🌫️ CONTAMINACIÓN / CLIMA & AIRE (módulo aislado) ===
    if (section === "contaminacion") {
     
    function calcModuleHeight() {
  return Math.max(520, window.innerHeight - 180); // margen para header/toolbar
}

function loadModuleIframe(src, title = "Módulo Andes City") {
  const h = calcModuleHeight();
  const html = `
    <section class="welcome fade-in" style="padding:0">
      <div class="data-card module-card">
        <iframe
          class="module-frame"
          src="${src}"
          title="${title}"
          loading="eager"
          style="height:${h}px"
          allow="fullscreen"
        ></iframe>
      </div>
    </section>`;

  transitionContent(html, () => {
    const frame = document.querySelector(".module-frame");
    const setH  = () => { frame.style.height = calcModuleHeight() + "px"; };
    setH();
    window.addEventListener("resize", setH);
    // sincroniza tema con el hijo
    setTimeout(syncThemeToIframes, 50);
  });
}
    }

    // === ⚠️ INCIDENCIAS URBANAS (módulo aislado) ===
    if (section === "incidencias") {
      loadModuleIframe(MODULES.incidencias, "Incidencias Urbanas");
      return;
    }

    // === 💬 AURORA ===
    if (section === "aurora") {
      transitionContent(`
        <div class="data-card fade-in aurora-container">
          <h3>🌤️ Aurora</h3>
          <p>Tu asistente urbano de luz y conocimiento 🌱</p>
          <div class="aurora-circle">
            <div class="aurora-light a1"></div>
            <div class="aurora-light a2"></div>
            <div class="aurora-light a3"></div>
          </div>
          <div id="chat" class="chat-box"></div>
          <div class="chat-input">
            <input id="user-input" type="text" placeholder="Escríbeme algo..." />
            <button id="send-btn">Enviar</button>
          </div>
        </div>
      `, () => {
        const sendBtn = document.getElementById("send-btn");
        const userInput = document.getElementById("user-input");
        const chatBox = document.getElementById("chat");
        const avatar = document.querySelector(".aurora-circle");

        const sendMessage = () => {
          const msg = userInput.value.trim();
          if (!msg) return;
          chatBox.innerHTML += `<p class="user"><b>Tú:</b> ${msg}</p>`;
          userInput.value = "";

          const reply = auroraLocalResponse(msg);
          chatBox.innerHTML += `<p class="bot"><b>Aurora:</b> ${reply}</p>`;
          chatBox.scrollTop = chatBox.scrollHeight;

          avatar.classList.add("active");
          setTimeout(() => avatar.classList.remove("active"), 1500);
        };

        sendBtn.addEventListener("click", sendMessage);
        userInput.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
      });
      return;
    }
  });
});

// ===== ANDES CITY — Canvas Logo (picos OFF + subrayado animado + contraste) =====
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
