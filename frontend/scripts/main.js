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

// === Utilidad: fetch con reintentos ===
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1500) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            console.warn(`⚠️ Intento ${i + 1} fallido para ${url}:`, err.message);
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error("❌ No se pudo conectar después de varios intentos.");
}

// === Sección Home predeterminada ===
async function loadHome() {
    transitionContent(`
        <section class="welcome fade-in">
            <h1>🏙️ Bienvenido a <span>My Healthy City</span></h1>
            <p>Explora tu ciudad inteligente, monitorea su salud y conecta con soluciones sostenibles impulsadas por IA.</p>

            <div id="aurora-tips" class="data-card">
                <h3>💡 Consejos de Aurora</h3>
                <p>Cargando sabiduría urbana...</p>
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

    // === Consejos de Aurora ===
    try {
        const res = await fetchWithRetry(`${BACKEND_URL}/api/aurora_tips`);
        const data = await res.json();
        console.log("✅ Aurora tips:", data);

        if (data.tips && Array.isArray(data.tips)) {
            const tipsList = data.tips.map(t => `<li>${t}</li>`).join("");
            document.getElementById("aurora-tips").innerHTML = `
                <h3>💡 Consejos de Aurora</h3>
                <ul style="list-style:none; margin-top:10px;">${tipsList}</ul>
            `;
        } else {
            document.getElementById("aurora-tips").innerHTML = `
                <h3>💡 Consejos de Aurora</h3>
                <p>⚠️ Aurora está despierta, pero no puede responder ahora.</p>
            `;
        }
    } catch (err) {
        console.error("❌ Error al conectar con Aurora:", err);
        document.getElementById("aurora-tips").innerHTML = `
            <h3>💡 Consejos de Aurora</h3>
            <p style="color:red;">⚠️ Aurora está despertando... intenta nuevamente en unos segundos.</p>
            <small>(${err.message})</small>
        `;
    }

    // === Mapa ===
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

// === Cargar Home ===
document.addEventListener("DOMContentLoaded", loadHome);

// === Navegación dinámica ===
sections.forEach(item => {
    item.addEventListener("click", async () => {
        const section = item.getAttribute("data-section");
        sections.forEach(li => li.classList.remove("active"));
        item.classList.add("active");

        if (section === "home") return loadHome();

        if (section === "movilidad") {
            return transitionContent(`
                <div class="data-card fade-in">
                    <h3>🚲 Movilidad Sostenible</h3>
                    <p>Visualiza rutas ecológicas, puntos de carga y tráfico en tiempo real (en desarrollo).</p>
                </div>
            `);
        }

        if (section === "contaminacion") {
            try {
                const res = await fetchWithRetry(`${BACKEND_URL}/api/data`);
                const data = await res.json();
                transitionContent(`
                    <div class="data-card fade-in">
                        <h3>🌫️ Contaminación Ambiental</h3>
                        <p><strong>Temperatura:</strong> ${data.info.temperature} °C</p>
                        <p><strong>Calidad del aire:</strong> ${data.info.air_quality}</p>
                        <p><strong>Tráfico:</strong> ${data.info.traffic_level}</p>
                    </div>
                `);
            } catch (err) {
                transitionContent(`
                    <div class="data-card fade-in">
                        ❌ Error al conectar con el backend (${err.message})
                    </div>
                `);
            }
            return;
        }

        if (section === "incidencias") {
            return transitionContent(`
                <div class="data-card fade-in">
                    <h3>⚠️ Incidencias Urbanas</h3>
                    <p>Reporta incidencias y ayuda a tu ciudad con predicciones IA (en desarrollo).</p>
                </div>
            `);
        }

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
                    const message = userInput.value.trim();
                    if (!message) return;
                    chatBox.innerHTML += `<p class="user"><b>Tú:</b> ${message}</p>`;
                    userInput.value = "";

                    try {
                        const res = await fetchWithRetry(`${BACKEND_URL}/api/chat`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ message })
                        });
                        const data = await res.json();
                        const reply = data.reply || "Aurora está pensando... 🌌";

                        chatBox.innerHTML += `<p class="bot"><b>Aurora:</b> ${reply}</p>`;
                        chatBox.scrollTop = chatBox.scrollHeight;

                        avatar.classList.add("active");
                        setTimeout(() => avatar.classList.remove("active"), 1500);

                        const utterance = new SpeechSynthesisUtterance(reply);
                        utterance.lang = "es-ES";
                        utterance.pitch = 1.2;
                        utterance.rate = 1;
                        speechSynthesis.speak(utterance);
                    } catch (err) {
                        console.error("❌ Error Aurora:", err);
                        chatBox.innerHTML += `<p class="bot" style="color:red;">⚠️ Aurora no responde aún (${err.message})</p>`;
                    }
                };

                sendBtn.addEventListener("click", sendMessage);
                userInput.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
            }, 300);
        }
    });
});
