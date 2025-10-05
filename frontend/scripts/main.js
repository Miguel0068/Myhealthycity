// === 🌐 Configuración local sin conexión a backend ===

// === Elementos del DOM ===
const sections = document.querySelectorAll(".menu li");
const mainContent = document.getElementById("main-content");

// === Animación de transición ===
function transitionContent(html) {
    mainContent.classList.remove("fade-in");
    mainContent.classList.add("fade-out");
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.classList.remove("fade-out");
        mainContent.classList.add("fade-in");
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

// === HOME ===
async function loadHome() {
    const tipsList = auroraTips.map(t => `<li>${t}</li>`).join("");
    transitionContent(`
        <section class="welcome fade-in">
            <h1>🏙️ Bienvenido a <span>My Healthy City</span></h1>
            <p>Explora tu ciudad inteligente, monitorea su salud y conecta con soluciones sostenibles impulsadas por IA.</p>
            <div class="data-card">
                <h3>🤖 Aurora – Asistente urbano inteligente</h3>
                <p>💬 Aurora analiza tendencias ambientales, patrones urbanos y bienestar ciudadano.  
                Aquí tienes algunas recomendaciones generadas por su algoritmo de sostenibilidad:</p>
                <ul style="list-style:none; margin-top:10px; line-height:1.6;">${tipsList}</ul>
            </div>
            <div class="city-stats">
                <div class="stat-card">🌡️ <h4>23°C</h4><p>Temperatura actual</p></div>
                <div class="stat-card">💨 <h4>Buena</h4><p>Calidad del aire</p></div>
                <div class="stat-card">🚗 <h4>Fluido</h4><p>Tráfico urbano</p></div>
            </div>
            <div class="data-card">
                <h3>🗺️ Vista previa del mapa urbano</h3>
                <p>Tu ubicación aproximada y zonas urbanas activas.</p>
                <div id="map-preview" class="map-container"></div>
            </div>
        </section>
    `);

    setTimeout(() => {
        const map = L.map('map-preview').setView([-1.664, -78.654], 13); // Riobamba, Ecuador
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        L.marker([-1.664, -78.654]).addTo(map).bindPopup("📍 Riobamba, Ecuador").openPopup();
    }, 400);
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

        // === Control de capas (bonito y simple) ===
        const baseMaps = {
            "🗺️ Voyager": voyager,
            "🛰️ Satélite": satellite,
            "⛰️ Topográfico": topo
        };
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

        // === Círculo de alcance verde ===
        L.circle([-1.664, -78.654], {
            radius: 2000,
            color: "#00aaff",
            fillColor: "#00aaff",
            fillOpacity: 0.1
        }).addTo(map);

        // === Mostrar ubicación actual del usuario ===
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("📍 Estás aquí")
                    .openPopup();
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

                const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
                        radius: 1500,
                        color: "#222",
                        fillColor: lvl.color,
                        fillOpacity: 0.6,
                        weight: 1
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
