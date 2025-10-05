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

// === Sección Home predeterminada ===
function loadHome() {
    transitionContent(`
        <section class="welcome fade-in">
            <h1>🏙️ Bienvenido a <span>My Healthy City</span></h1>
            <p>Explora tu ciudad inteligente, monitorea su salud y conecta con soluciones sostenibles impulsadas por IA.</p>

            <div class="data-card">
                <h3>💡 Consejos de Aurora</h3>
                <ul style="list-style:none; margin-top:10px;">
                    <li>🚶 Da un paseo corto: tu cuerpo y la Tierra te lo agradecerán.</li>
                    <li>🌳 Abraza un árbol. No arreglará el tráfico, pero te hará sonreír.</li>
                    <li>💧 Bebe agua (no café... bueno, tal vez uno para empezar el día ☕).</li>
                    <li>🌙 Incluso los satélites necesitan descansar: desconéctate un rato.</li>
                </ul>
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

// === Cargar Home al iniciar ===
document.addEventListener("DOMContentLoaded", loadHome);

// === Navegación dinámica ===
sections.forEach(item => {
    item.addEventListener("click", async () => {
        const section = item.getAttribute("data-section");

        // Limpiar "active" del menú
        sections.forEach(li => li.classList.remove("active"));
        item.classList.add("active");

        // === 🏠 HOME ===
        if (section === "home") {
            loadHome();
        }

        // === 🚲 MOVILIDAD ===
        else if (section === "movilidad") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>🚲 Movilidad Sostenible</h3>
                    <p>Visualiza rutas ecológicas, puntos de carga y tráfico en tiempo real (en desarrollo).</p>
                </div>
            `);
        }

        // === 🌫️ CONTAMINACIÓN ===
        else if (section === "contaminacion") {
            try {
                const res = await fetch(`${BACKEND_URL}/api/data`);
                const data = await res.json();
                transitionContent(`
                    <div class="data-card fade-in">
                        <h3>🌫️ Contaminación Ambiental</h3>
                        <p><strong>Temperatura:</strong> ${data.info.temperature} °C</p>
                        <p><strong>Calidad del aire:</strong> ${data.info.air_quality}</p>
                        <p><strong>Tráfico:</strong> ${data.info.traffic_level}</p>
                    </div>
                `);
            } catch {
                transitionContent(`<div class="data-card fade-in">❌ Error al conectar con el backend.</div>`);
            }
        }

        // === ⚠️ INCIDENCIAS ===
        else if (section === "incidencias") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>⚠️ Incidencias Urbanas</h3>
                    <p>Reporta incidencias y ayuda a tu ciudad a mejorar con predicciones IA (en desarrollo).</p>
                </div>
            `);
        }

        // === 💬 AURORA ===
        else if (section === "aurora") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>💬 Aurora</h3>
                    <div id="chat-box" class="chat-box"></div>
                    <div class="chat-input">
                        <input id="user-input" type="text" placeholder="Habla con Aurora..." />
                        <button id="send-btn">Enviar</button>
                    </div>
                </div>
            `);

            const sendBtn = document.getElementById("send-btn");
            const userInput = document.getElementById("user-input");
            const chatBox = document.getElementById("chat-box");

            sendBtn.addEventListener("click", async () => {
                const message = userInput.value.trim();
                if (!message) return;
                chatBox.innerHTML += `<p><b>Tú:</b> ${message}</p>`;
                userInput.value = "";

                try {
                    const res = await fetch(`${BACKEND_URL}/api/chat`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ message })
                    });
                    const data = await res.json();
                    chatBox.innerHTML += `<p><b>Aurora:</b> ${data.reply}</p>`;
                } catch {
                    chatBox.innerHTML += `<p style="color:red;">Error al conectar con Aurora 🌌</p>`;
                }

                chatBox.scrollTop = chatBox.scrollHeight;
            });
        }
    });
});
