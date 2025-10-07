/* =========================================================================
   ANDES CITY – script base (Home + Movilidad + Clima + Incidencias)
   - Enlaza con el HTML propuesto (sidebar, main-content, orb de Aurora)
   - Aurora orb: panel flotante con fallback local y fetch opcional a /api/chat
   ========================================================================== */

/* -------------------- Config -------------------- */
const API_BASE =
  window.API_BASE ||
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE_URL : "") ||
  ""; // ej: "https://andes-city-api.onrender.com"

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const mainContent = $("#main-content");
const navItems = $$(".menu li");
const orb = $("#aurora-orb");

/* -------------------- Transición de vistas -------------------- */
function transitionContent(html) {
  mainContent.classList.remove("fade-in");
  mainContent.classList.add("fade-out");
  setTimeout(() => {
    mainContent.innerHTML = html;
    mainContent.classList.remove("fade-out");
    mainContent.classList.add("fade-in");
  }, 220);
}

/* -------------------- Utilidades de mapa -------------------- */
function baseOSM(mapId, center = [-1.664, -78.654], zoom = 13) {
  const map = L.map(mapId, { zoomControl: true }).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  return map;
}
function addLegend(map, title, items) {
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.style.background = "#fff";
    div.style.padding = "10px";
    div.style.borderRadius = "8px";
    div.style.border = "1px solid rgba(0,0,0,.08)";
    div.innerHTML = `<b>${title}</b><br>`;
    items.forEach((it) => {
      div.innerHTML += `<div style="margin-top:4px;">
        <span style="background:${it.color};width:14px;height:10px;display:inline-block;margin-right:6px;border:1px solid rgba(0,0,0,.15)"></span>${it.label}
      </div>`;
    });
    return div;
  };
  legend.addTo(map);
}

/* -------------------- Datos simulados -------------------- */
const mockPredicciones = [
  {
    t: "Tráfico",
    d: "Congestión moderada 17:00–19:00 en Av. Unidad Nacional. Usa Av. Lizarzaburu como alterna.",
  },
  {
    t: "Clima",
    d: "Lluvia ligera esta noche. Prob. 60%. Lleva capa si sales después de las 19:00.",
  },
  {
    t: "Calidad del aire",
    d: "Índice Bueno→Moderado 06:00–09:00 cerca del terminal. Evita actividad intensa.",
  },
];
const mockAvisos = [
  { t: "Municipalidad", d: "Cierre parcial en Calle Venezuela 09:00–14:00 (mantenimiento)." },
  { t: "Eventos", d: "Feria de productores – Plaza Alfaro, sábado 10:00." },
  { t: "Seguridad", d: "Desvíos por corrida atlética domingo 07:00–10:00." },
];

const auroraTips = [
  "🌱 Cuida los espacios verdes: cada planta suma.",
  "🚶‍♀️ Caminar o pedalear reduce estrés urbano.",
  "💧 Hidrátate; la salud mental también importa.",
  "⚡ Ahorra energía: apaga lo que no uses.",
  "🌤️ Agenda desconexiones breves durante el día.",
];

/* -------------------- Aurora (panel flotante) -------------------- */
function ensureAuroraPanel() {
  if ($("#aurora-panel")) return $("#aurora-panel");
  const panel = document.createElement("div");
  panel.id = "aurora-panel";
  panel.style.position = "fixed";
  panel.style.right = "96px";
  panel.style.bottom = "24px";
  panel.style.width = "320px";
  panel.style.maxHeight = "60vh";
  panel.style.background = "var(--card)";
  panel.style.border = "1px solid var(--line)";
  panel.style.borderRadius = "16px";
  panel.style.boxShadow = "0 18px 50px rgba(13,43,76,.18)";
  panel.style.display = "none";
  panel.style.overflow = "hidden";
  panel.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px">
      <div style="width:10px;height:10px;border-radius:999px;background:radial-gradient(45% 45% at 50% 50%, #fff 0%, #9fe5ff 60%, #8FD6FF 100%);box-shadow:0 0 12px #9fe5ff;"></div>
      <strong>Aurora</strong><span style="color:var(--muted)"> · demo</span>
      <button id="aurora-close" style="margin-left:auto;border:none;background:transparent;cursor:pointer;font-size:18px;line-height:1">×</button>
    </div>
    <div id="aurora-log" style="padding:10px 12px;overflow:auto;height:260px"></div>
    <div style="display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)">
      <input id="aurora-input" type="text" placeholder="Pregúntame algo…" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--card);color:var(--ink)" />
      <button id="aurora-send" style="border:none;border-radius:10px;padding:10px 12px;background:var(--accent);color:#05304f;cursor:pointer">Enviar</button>
    </div>`;
  document.body.appendChild(panel);
  $("#aurora-close", panel).onclick = () => (panel.style.display = "none");
  $("#aurora-send", panel).onclick = () => sendAurora();
  $("#aurora-input", panel).addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendAurora();
  });
  function sendAurora() {
    const input = $("#aurora-input", panel);
    const log = $("#aurora-log", panel);
    const msg = (input.value || "").trim();
    if (!msg) return;
    log.insertAdjacentHTML("beforeend", `<p><b>Tú:</b> ${msg}</p>`);
    input.value = "";
    // Intento al backend si existe API_BASE; si falla, tip local
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        clearTimeout(timeout);
        const reply = (data && (data.reply || data.message)) || auroraTips[Math.floor(Math.random() * auroraTips.length)];
        log.insertAdjacentHTML("beforeend", `<p><b>Aurora:</b> ${reply}</p>`);
        log.scrollTop = log.scrollHeight;
      })
      .catch(() => {
        clearTimeout(timeout);
        const reply = auroraTips[Math.floor(Math.random() * auroraTips.length)];
        log.insertAdjacentHTML(
          "beforeend",
          `<p><b>Aurora:</b> ${reply} <br><i style="color:var(--muted)">modo demo local</i></p>`
        );
        log.scrollTop = log.scrollHeight;
      });
  }
  return panel;
}
if (orb) {
  orb.addEventListener("click", () => {
    const p = ensureAuroraPanel();
    p.style.display = p.style.display === "none" ? "block" : "none";
  });
}

/* -------------------- HOME -------------------- */
function renderHome() {
  transitionContent(`
    <section class="home">
      <header class="hero">
        <div>
          <h1>Decisiones locales, datos urbanos.</h1>
          <p class="sub">Predicciones, avisos y mapa activo — demo IA.</p>
        </div>
      </header>

      <div class="card-group">
        <article class="card">
          <h3>🔮 Predicciones y recomendaciones</h3>
          <ul id="pred-list" class="list"></ul>
        </article>
        <article class="card">
          <h3>📣 Avisos</h3>
          <ul id="avisos-list" class="list"></ul>
        </article>
      </div>

      <article class="card card-map">
        <div class="card-head">
          <h3>🗺️ Mapa urbano (demo)</h3>
          <p class="muted">Zonas: tráfico, clima, calidad del aire.</p>
        </div>
        <div id="map-preview" class="map"></div>
      </article>
    </section>
  `);

  // Listas
  const pl = $("#pred-list");
  const al = $("#avisos-list");
  mockPredicciones.forEach((p) => pl.insertAdjacentHTML("beforeend", `<li><b>${p.t}:</b> ${p.d}</li>`));
  mockAvisos.forEach((a) => al.insertAdjacentHTML("beforeend", `<li><b>${a.t}:</b> ${a.d}</li>`));

  // Mapa
  const map = baseOSM("map-preview");
  // Tráfico (polilínea)
  L.polyline(
    [
      [-1.655, -78.66],
      [-1.66, -78.655],
      [-1.665, -78.65],
    ],
    { color: "#FF6B6B", weight: 5, opacity: 0.6 }
  )
    .addTo(map)
    .bindPopup("Congestión moderada 17:00–19:00");

  // Clima (lluvia)
  L.circle([-1.67, -78.645], {
    radius: 600,
    color: "#3AA3FF",
    fillColor: "#A7D8FF",
    fillOpacity: 0.35,
  })
    .addTo(map)
    .bindPopup("Lluvia ligera (60%)");

  // Aire (marcadores)
  L.marker([-1.662, -78.66]).addTo(map).bindPopup("AQI: Bueno");
  L.marker([-1.668, -78.652]).addTo(map).bindPopup("AQI: Moderado 06:00–09:00");
}

/* -------------------- MOVILIDAD -------------------- */
function renderMovilidad() {
  transitionContent(`
    <div class="card fade-in">
      <h3>🚲 Movilidad</h3>
      <p class="muted">Rutas, puntos de interés y alcance.</p>
      <div id="map-mov" class="map" style="height:70vh"></div>
    </div>
  `);

  const map = L.map("map-mov", { zoomControl: true }).setView([-1.664, -78.654], 13);
  const voyager = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap & CARTO",
    subdomains: "abcd",
    maxZoom: 20,
  }).addTo(map);
  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "© Esri, USGS, IGN", maxZoom: 19 }
  );
  const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenTopoMap, SRTM",
    maxZoom: 17,
  });

  L.control.layers(
    { "🗺️ Voyager": voyager, "🛰️ Satélite": satellite, "⛰️ Topográfico": topo },
    null,
    { position: "topright", collapsed: false }
  ).addTo(map);

  // Puntos simulados
  const points = [
    { lat: -1.662, lng: -78.655, name: "CicloRuta Central" },
    { lat: -1.666, lng: -78.648, name: "Punto Ecológico Sur" },
    { lat: -1.658, lng: -78.662, name: "Estación Verde Norte" },
  ];
  points.forEach((p) => L.marker([p.lat, p.lng]).addTo(map).bindPopup(`🚴 <b>${p.name}</b>`));

  // Alcance
  L.circle([-1.664, -78.654], {
    radius: 2000,
    color: "#00aaff",
    fillColor: "#00aaff",
    fillOpacity: 0.1,
  }).addTo(map);

  // Ubicación del usuario
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      L.marker([latitude, longitude]).addTo(map).bindPopup("📍 Estás aquí").openPopup();
      map.setView([latitude, longitude], 14);
    });
  }
}

/* -------------------- CLIMA -------------------- */
function renderClima() {
  transitionContent(`
    <div class="card fade-in">
      <h3>🌦️ Clima</h3>
      <p class="muted">Precipitaciones y temperatura simuladas.</p>
      <div id="map-clima" class="map" style="height:70vh"></div>
    </div>
  `);

  const map = baseOSM("map-clima");
  // Áreas de lluvia
  const lluvia = [
    { lat: -1.67, lng: -78.645, r: 600, p: "Lluvia ligera (60%)" },
    { lat: -1.652, lng: -78.662, r: 400, p: "Chubascos aislados (30%)" },
  ];
  lluvia.forEach((z) =>
    L.circle([z.lat, z.lng], { radius: z.r, color: "#3AA3FF", fillColor: "#A7D8FF", fillOpacity: 0.35 })
      .addTo(map)
      .bindPopup(z.p)
  );

  // Temperaturas (pines)
  const temps = [
    { lat: -1.664, lng: -78.654, t: 22 },
    { lat: -1.658, lng: -78.646, t: 21 },
    { lat: -1.672, lng: -78.66, t: 19 },
  ];
  temps.forEach((p) => L.marker([p.lat, p.lng]).addTo(map).bindPopup(`🌡️ ${p.t}°C`));

  addLegend(map, "Capas", [
    { color: "#A7D8FF", label: "Precipitación" },
    { color: "#999999", label: "Marcadores de temperatura" },
  ]);
}

/* -------------------- INCIDENCIAS -------------------- */
function renderIncidencias() {
  transitionContent(`
    <div class="card fade-in">
      <h3>⚠️ Incidencias Urbanas</h3>
      <p class="muted">Reportes ciudadanos simulados y leyenda.</p>
      <div id="map-inc" class="map" style="height:70vh"></div>
    </div>
  `);

  const map = L.map("map-inc", { zoomControl: true }).setView([-1.6635, -78.6547], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors, estilo HOT | OSM France",
    maxZoom: 19,
  }).addTo(map);

  const tipos = {
    basura: { color: "#4CAF50", icon: "🗑️", label: "Basura" },
    accidente: { color: "#F44336", icon: "🚗", label: "Accidente" },
    cierre: { color: "#FF9800", icon: "🚧", label: "Cierre" },
    inseguridad: { color: "#3F51B5", icon: "🚨", label: "Inseguridad" },
  };
  const reportes = [
    { lat: -1.662, lng: -78.654, tipo: "basura", lugar: "Centro Histórico" },
    { lat: -1.669, lng: -78.663, tipo: "accidente", lugar: "Av. Celso Andrade" },
    { lat: -1.655, lng: -78.647, tipo: "cierre", lugar: "Calle Tarqui" },
    { lat: -1.672, lng: -78.64, tipo: "inseguridad", lugar: "Zona Norte" },
  ];

  reportes.forEach((r) => {
    const t = tipos[r.tipo];
    const m = L.circleMarker([r.lat, r.lng], {
      radius: 12,
      color: "#111",
      fillColor: t.color,
      fillOpacity: 0.85,
      weight: 1.5,
    }).addTo(map);
    m.bindPopup(`<b>${t.icon} ${r.lugar}</b><br>Tipo: ${t.label}<br>📅 Reporte ciudadano`);
  });

  addLegend(
    map,
    "Tipos de incidencias",
    Object.values(tipos).map((t) => ({ color: t.color, label: `${t.icon} ${t.label}` }))
  );
}

/* -------------------- Router (sidebar) -------------------- */
function activateNav(target) {
  navItems.forEach((li) => li.classList.remove("active"));
  const el = navItems.find((li) => li.getAttribute("data-section") === target);
  if (el) el.classList.add("active");
}

function navigate(section) {
  switch (section) {
    case "home":
      activateNav("home");
      return renderHome();
    case "movilidad":
      activateNav("movilidad");
      return renderMovilidad();
    case "clima":
      activateNav("clima");
      return renderClima();
    case "incidencias":
      activateNav("incidencias");
      return renderIncidencias();
    default:
      return renderHome();
  }
}

navItems.forEach((item) =>
  item.addEventListener("click", () => navigate(item.getAttribute("data-section")))
);

/* -------------------- Init -------------------- */
document.addEventListener("DOMContentLoaded", () => {
  navigate("home"); // carga HOME
});
