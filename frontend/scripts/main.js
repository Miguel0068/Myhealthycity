// === 🌐 Configuración global ===
const BACKEND_URL = "https://myhealthycity-backend.onrender.com";

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

// === Fallbacks locales (si Render no responde) ===
const localTips = [
    "🌱 Cuida las plantas de tu barrio y riega con agua reutilizada.",
    "🚴 Usa la bici o camina, tu ciudad y tus pulmones lo agradecerán.",
    "💡 Ahorra energía: apaga luces y desconecta cargadores.",
    "🧃 Reduce plásticos: usa botellas reutilizables."
];

function auroraLocalResponse(message) {
    const responses = [
        "🌤️ Aurora: Estoy aquí para ayudarte a hacer tu ciudad más saludable 💚",
        "💬 Aurora: Recuerda que pequeñas acciones crean grandes cambios 🌍",
        "🌿 Aurora: ¡Tu esfuerzo cuenta para un futuro sostenible!",
        "🌈 Aurora: Qué bonito verte cuidar tu entorno 🪴"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// === Fetch seguro con timeout ===
async function safeFetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn("⚠️ Conexión Render fallida:", err.message);
        return null;
    }
}

// === Sección Home ===
async function loadHome() {
    transitionContent(`
        <section class="welcome fade-in">
            <h1>🏙️ Bienvenido a <span>My Healthy City</span></h1>
            <p>Explora tu ciudad inteligente, monitorea su salud y conecta con soluciones sostenibles impulsadas por IA.</p>

            <div id="aurora-tips" class="data-card">
                <h3>💡 Consejos de Aurora</h3>
                <p>Cargando...</p>
            </div>

            <div class="city-stats">
                <div class="stat-card">🌡️ <h4>23°C</h4><p>Temperatura</p></div>
                <div class="stat-card">💨 <h4>Buena</h4><p>Calidad del aire</p></div>
                <div class="stat-card">🚗 <h4>Fluido</h4><p>Tráfico</p></div>
            </div>

            <div class="data-card">
                <h3>🗺️ Vista previa del mapa urbano</h3>
                <p>Tu ubicación aproximada y zonas urbanas activas.</p>
                <div id="map-preview" class="map-container"></div>
            </div>
        </section>
    `);

    // Intentar obtener tips desde el backend
    const data = await safeFetch(`${BACKEND_URL}/api/aurora_tips`);
    const tips = data?.tips?.length ? data.tips : localTips;
    const tipsList = tips.map(t => `<li>${t}</li>`).join("");

    document.getElementById("aurora-tips").innerHTML = `
        <h3>💡 Consejos de Aurora</h3>
        <ul style="list-style:none; margin-top:10px;">${tipsList}</ul>
        <small style="opacity:0.6;">${data ? "🌐 En línea" : "⚙️ Modo local"}</small>
    `;

    // Mapa
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

document.addEventListener("DOMContentLoaded", loadHome);

// === Navegación dinámica ===
sections.forEach(item => {
    item.addEventListener("click", async () => {
        const section = item.getAttribute("data-section");
        sections.forEach(li => li.classList.remove("active"));
        item.classList.add("active");

        if (section === "home") return loadHome();

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

                const sendMessage = async () => {
                    const msg = userInput.value.trim();
                    if (!msg) return;
                    chatBox.innerHTML += `<p class="user"><b>Tú:</b> ${msg}</p>`;
                    userInput.value = "";

                    const res = await safeFetch(`${BACKEND_URL}/api/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: msg })
                    });

                    const reply = res?.reply || auroraLocalResponse(msg);
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
