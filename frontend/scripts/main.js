// === 🌐 Configuración local sin conexión a backend ===

// === Elementos del DOM ===
const sections = document.querySelectorAll(".menu li");
const mainContent = document.getElementById("main-content");

// === Animación de transición ===
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

// === Respuestas locales de Aurora para el chat ===
function auroraLocalResponse(message) {
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

function fillMiniList(id, items){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = "";
  items.forEach(x => el.insertAdjacentHTML("beforeend", `<li><b>${x.t}:</b> ${x.d}</li>`));
}

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

// —— Activación de acordeones (toggle altura y aria) ——
function attachAccordions(root=document){
  root.querySelectorAll(".ac-acc .acc-head").forEach(head=>{
    head.addEventListener("click", ()=>{
      const acc = head.closest(".ac-acc");
      const body = acc.querySelector(".acc-body");
      const open = acc.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      // Ajuste de altura para transición suave
      if(open){
        body.style.maxHeight = body.scrollHeight + "px";
      }else{
        body.style.maxHeight = "0px";
      }
    });
  });
}


// === HOME (nuevo layout compacto + mapa con acordeones) ===
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

  // 2) inicializar mapa (con guard para no duplicar)
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

  // activar acordeones
  attachAccordions(mainContent);

  // Mapa
  setTimeout(() => {
    const map = L.map('map-preview').setView([-1.664, -78.654], 13); // Riobamba, Ecuador
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([-1.664, -78.654]).addTo(map).bindPopup("📍 Riobamba, Ecuador").openPopup();
  }, 300);
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
      `);

      setTimeout(() => {
        const map = L.map('map-container', { zoomControl: true }).setView([-1.664, -78.654], 13);

        // === Capas base ===
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

        // === Control de capas ===
        const baseMaps = { "🗺️ Voyager": voyager, "🛰️ Satélite": satellite, "⛰️ Topográfico": topo };
        L.control.layers(baseMaps, null, { position: 'topright', collapsed: false }).addTo(map);

        // === Icono de bicicleta ===
        const bikeIcon = L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
          iconSize: [28, 28]
        });

        // === Puntos simulados de movilidad ===
        const points = [
          { lat: -1.662, lng: -78.655, name: "CicloRuta Central" },
          { lat: -1.666, lng: -78.648, name: "Punto Ecológico Sur" },
          { lat: -1.658, lng: -78.662, name: "Estación Verde Norte" }
        ];

        points.forEach(p => {
          L.marker([p.lat, p.lng], { icon: bikeIcon })
            .addTo(map)
            .bindPopup(`🚴 <b>${p.name}</b>`);
        });

        // === Círculo de alcance ===
        L.circle([-1.664, -78.654], { radius: 2000, color: "#00aaff", fillColor: "#00aaff", fillOpacity: 0.1 }).addTo(map);

        // === Ubicación actual del usuario (si disponible) ===
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            L.marker([latitude, longitude]).addTo(map).bindPopup("📍 Estás aquí").openPopup();
            map.setView([latitude, longitude], 14);
          });
        }
      }, 600);
    }

    // === 🌫️ CONTAMINACIÓN ===
    if (section === "contaminacion") {
      transitionContent(`
        <div class="data-card fade-in">
          <h3>🌫️ Contaminación Ambiental</h3>
          <p>Visualiza zonas simuladas de calidad del aire en Riobamba, Ecuador.</p>
          <div id="pollution-map" style="height:80vh; width:100%; border-radius:12px; overflow:hidden; margin-top:10px;"></div>
        </div>
      `);

      setTimeout(() => {
        const map = L.map("pollution-map").setView([-1.664, -78.654], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
        }).addTo(map);

        const levels = [
          { color: "#00e400", label: "Bueno" },
          { color: "#ffff00", label: "Moderado" },
          { color: "#ff7e00", label: "Dañino (sensibles)" },
          { color: "#ff0000", label: "Dañino" },
          { color: "#8f3f97", label: "Muy dañino" },
          { color: "#7e0023", label: "Peligroso" }
        ];

        const simulatedZones = [
          { lat: -1.659, lng: -78.654, level: 2, name: "Centro Histórico" },
          { lat: -1.662, lng: -78.67, level: 3, name: "Sur de Riobamba" },
          { lat: -1.648, lng: -78.64, level: 1, name: "Parque Ecológico" },
          { lat: -1.67, lng: -78.63, level: 4, name: "Zona Industrial" }
        ];

        simulatedZones.forEach(z => {
          const lvl = levels[z.level];
          L.circle([z.lat, z.lng], {
            radius: 1500, color: "#222", fillColor: lvl.color, fillOpacity: 0.6, weight: 1
          })
          .addTo(map)
          .bindPopup(`<b>${z.name}</b><br>Índice: <b>${lvl.label}</b>`);
        });

        const legend = L.control({ position: "bottomright" });
        legend.onAdd = function () {
          const div = L.DomUtil.create("div", "info legend");
          div.style.background = "#fff";
          div.style.padding = "10px";
          div.style.borderRadius = "8px";
          div.innerHTML = "<b>🌀 Niveles AQI</b><br>";
          levels.forEach(l => {
            div.innerHTML += `<div style="margin-top:3px;">
              <span style="background:${l.color};width:14px;height:10px;display:inline-block;margin-right:5px;"></span>${l.label}
            </div>`;
          });
          return div;
        };
        legend.addTo(map);
      }, 800);
    }

    // === ⚠️ INCIDENCIAS URBANAS ===
    if (section === "incidencias") {
      transitionContent(`
        <div class="data-card fade-in">
          <h3>⚠️ Incidencias Urbanas</h3>
          <p>Reporta y analiza incidencias en Riobamba, Ecuador.</p>
          <div id="incident-map" style="height:80vh; width:100%; border-radius:12px; overflow:hidden; margin-top:10px;"></div>
        </div>
      `);

      setTimeout(() => {
        const map = L.map('incident-map', { zoomControl: true }).setView([-1.6635, -78.6547], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors, estilo HOT | servido por OSM France',
          maxZoom: 19
        }).addTo(map);

        const tipos = {
          basura:      { color: "#4CAF50", icon: "🗑️" },
          accidente:   { color: "#F44336", icon: "🚗" },
          cierre:      { color: "#FF9800", icon: "🚧" },
          inseguridad: { color: "#3F51B5", icon: "🚨" }
        };

        const reportes = [
          { lat: -1.662, lng: -78.654, tipo: "basura", lugar: "Centro Histórico" },
          { lat: -1.669, lng: -78.663, tipo: "accidente", lugar: "Av. Celso Andrade" },
          { lat: -1.655, lng: -78.647, tipo: "cierre", lugar: "Calle Tarqui" },
          { lat: -1.672, lng: -78.64,  tipo: "inseguridad", lugar: "Zona Norte" }
        ];

        reportes.forEach(r => {
          const t = tipos[r.tipo];
          const marker = L.circleMarker([r.lat, r.lng], {
            radius: 12, color: "#111", fillColor: t.color, fillOpacity: 0.8, weight: 1.5
          }).addTo(map);
          marker.bindPopup(`<b>${t.icon} ${r.lugar}</b><br>Tipo: ${r.tipo}<br>📅 Reporte ciudadano`);
        });

        const legend = L.control({ position: "bottomright" });
        legend.onAdd = function () {
          const div = L.DomUtil.create("div", "info legend");
          div.style.background = "#fff";
          div.style.padding = "10px";
          div.style.borderRadius = "8px";
          div.innerHTML = "<b>📊 Tipos de incidencias</b><br>";
          Object.entries(tipos).forEach(([k, v]) => {
            div.innerHTML += `<div style="margin-top:4px;">
              <span style="background:${v.color};width:14px;height:10px;display:inline-block;margin-right:5px;"></span>${v.icon} ${k.charAt(0).toUpperCase()+k.slice(1)}
            </div>`;
          });
          return div;
        };
        legend.addTo(map);
      }, 500);
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
      `);

      setTimeout(() => {
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
      }, 300);
    }
  });
});

// Carga inicial de HOME
// (importante: esto asegura que el layout compacto siempre aparezca)
document.addEventListener("DOMContentLoaded", loadHome);


// ===== ANDES CITY — Canvas Logo (animado, tema-aware) =====
(function initAndesCanvasLogo() {
  // elimina restos de imágenes antiguas si quedaron
  document.querySelectorAll('.logo-icon').forEach(n => n.remove());

  const el = document.getElementById('logo-canvas');
  if (!el) return;

  const ctx = el.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  // Tamaño visual del canvas en la UI (sidebar)
  function resize() {
    const cssW = el.clientWidth || 200;
    const cssH = el.clientHeight || 90;
    el.width = Math.round(cssW * DPR);
    el.height = Math.round(cssH * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function theme() {
    return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  }

  // Parámetros animación subrayado
  let t = 0; // tiempo
  const speed = 0.018; // velocidad shimmer

  // Dibuja una versión más cercana a tu referencia: montañas suaves + texto + subrayado animado
  function draw() {
    const w = el.width / DPR, h = el.height / DPR;
    const mode = theme();

    // Paleta
    const ink      = (mode === 'dark') ? '#ECECEC' : '#171717';   // texto
    const strokes  = (mode === 'dark') ? '#EDEDED' : '#1E1E1E';   // contorno montañas
    const baseLine = (mode === 'dark') ? '#EDEDED' : '#6BA0B5';   // extremo del gradiente
    const glowA    = '#7ED0FF'; // azul
    const glowB    = '#9AF5E3'; // turquesa

    // Clear
    ctx.clearRect(0, 0, w, h);

    // ===== Montañas (curvas suaves tipo nevado) =====
    const yBase = h * 0.42;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    ctx.strokeStyle = strokes;

    ctx.beginPath();
    // Arranque suave izquierda
    ctx.moveTo(w * 0.06, yBase + h * 0.02);
    // Pico 1
    ctx.bezierCurveTo(w*0.18, yBase - h*0.12, w*0.26, yBase - h*0.22, w*0.36, yBase - h*0.08);
    // Valle
    ctx.bezierCurveTo(w*0.42, yBase - h*0.02, w*0.45, yBase,           w*0.50, yBase - h*0.04);
    // Pico 2 (más alto)
    ctx.bezierCurveTo(w*0.60, yBase - h*0.22, w*0.68, yBase - h*0.16,  w*0.76, yBase - h*0.06);
    // Salida derecha
    ctx.bezierCurveTo(w*0.86, yBase,           w*0.92, yBase - h*0.02, w*0.96, yBase - h*0.08);
    ctx.stroke();

    // Pequeño “nieve/lomo” en el segundo pico (detalle)
    ctx.beginPath();
    ctx.moveTo(w*0.62, yBase - h*0.19);
    ctx.quadraticCurveTo(w*0.66, yBase - h*0.15, w*0.69, yBase - h*0.12);
    ctx.stroke();

    // ===== Texto “ANDES CITY” (elegante, tracking suave) =====
    ctx.fillStyle = ink;
    ctx.font = '700 20px "Inter Tight", "Outfit", system-ui, sans-serif';
    ctx.textBaseline = 'top';

    const title = 'ANDES CITY';
    const startX = w * 0.10;
    let x = startX, yText = h * 0.57;
    const track = 1.8; // separación entre letras

    for (const ch of title) {
      ctx.fillText(ch, x, yText);
      x += ctx.measureText(ch).width + track + (ch === ' ' ? 6 : 0);
    }

    // ===== Subrayado degradado ANIMADO + glow central =====
    const ulY = yText + 24;
    const ulL = startX, ulR = Math.min(w * 0.90, x); // hasta el final del texto

    // Gradiente base (estático)
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

    // Shimmer animado: una banda que “recorre” el subrayado
    const bandWidth = Math.max(24, (ulR - ulL) * 0.12);
    const cx = ulL + ((Math.sin(t) + 1) / 2) * (ulR - ulL - bandWidth) + bandWidth/2;

    const grad2 = ctx.createRadialGradient(cx, ulY, 0, cx, ulY, bandWidth/2);
    grad2.addColorStop(0.0, mode === 'dark' ? 'rgba(126,208,255,0.75)' : 'rgba(126,208,255,0.9)');
    grad2.addColorStop(1.0, 'rgba(126,208,255,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(cx - bandWidth/2, ulY - 6, bandWidth, 12);

    // Punto de glow en el centro animado
    ctx.save();
    ctx.shadowColor = mode === 'dark' ? 'rgba(126,208,255,0.55)' : 'rgba(126,208,255,0.75)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, ulY, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    t += speed;
    draw();
    requestAnimationFrame(loop);
  }

  // Redraw en cambios de tema y resize
  const obs = new MutationObserver(() => draw());
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => { resize(); draw(); });

  // Primer render
  function start() {
    // Asegura tamaño CSS si no lo pusiste aún
    if (!el.style.width)  el.style.width  = '200px';
    if (!el.style.height) el.style.height = '90px';
    resize();
    draw();
    loop();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
