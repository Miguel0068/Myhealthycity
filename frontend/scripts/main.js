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

// === Sección Home ===
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

    // === Mapa local (sin conexión) ===
    setTimeout(() => {
        const map = L.map('map-preview').setView([0, 0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                map.setView([latitude, longitude], 14);
                L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("📍 Tu ubicación")
                    .openPopup();
            });
        }
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

        // === 🚲 MOVILIDAD SOSTENIBLE ===
if (section === "movilidad") {
    // Primero cambiamos el contenido visual
    transitionContent(`
        <div class="data-card fade-in">
            <h3>🚲 Movilidad Sostenible</h3>
            <p>Visualiza rutas ecológicas, puntos de carga y tráfico en tiempo real.</p>
            <div id="map-container" style="height:80vh; width:100%; border-radius:12px; overflow:hidden; margin-top:10px;"></div>
        </div>
    `);

    // Luego esperamos a que el DOM inserte el contenedor del mapa
    setTimeout(() => {
        const mapContainer = document.getElementById("map-container");
        if (!mapContainer) {
            console.error("❌ No se encontró el contenedor del mapa.");
            return;
        }

        // Crear el mapa solo si el contenedor está listo
        const map = L.map(mapContainer, { zoomControl: true, preferCanvas: true })
            .setView([-12.0464, -77.0428], 12);

        // Capas base
        const voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd', maxZoom: 20
        }).addTo(map);

        const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri — sources: Esri, USGS, IGN, etc.', maxZoom: 19
        });

        const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: © OSM, SRTM | Style: © OpenTopoMap (CC-BY-SA)',
            maxZoom: 17
        });

        // Selector simple de capas base
        const baseSelector = L.control({ position: 'topright' });
        baseSelector.onAdd = function () {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.style.background = '#fff';
            div.style.padding = '6px';
            div.style.fontSize = '12px';
            div.innerHTML = `
                <b>Base:</b><br>
                <button id="b1">🗺️ Voyager</button>
                <button id="b2">🛰️ Satélite</button>
                <button id="b3">⛰️ Topo</button>
            `;
            return div;
        };
        baseSelector.addTo(map);

        // Activar botones
        setTimeout(() => {
            document.getElementById("b1").onclick = () => { map.eachLayer(l => map.removeLayer(l)); voyager.addTo(map); };
            document.getElementById("b2").onclick = () => { map.eachLayer(l => map.removeLayer(l)); esriSat.addTo(map); };
            document.getElementById("b3").onclick = () => { map.eachLayer(l => map.removeLayer(l)); openTopo.addTo(map); };
        }, 500);

        // Ubicación actual
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude, longitude } = pos.coords;
                map.setView([latitude, longitude], 14);
                L.marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup("📍 Estás aquí")
                    .openPopup();
            });
        }

    }, 600); // aumentamos el retardo para asegurar el render
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

                    const utterance = new SpeechSynthesisUtterance(reply);
                    utterance.lang = "es-ES";
                    utterance.pitch = 1.2;
                    utterance.rate = 1;
                    speechSynthesis.speak(utterance);
                };

                sendBtn.addEventListener("click", sendMessage);
                userInput.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
            }, 300);
        }
    });
});
