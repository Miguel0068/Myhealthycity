// === 🌐 Configuración global ===
const BACKEND_URL = "https://myhealthycity-backend.onrender.com";

// === Elementos del DOM ===
const sections = document.querySelectorAll(".menu li");
const mainContent = document.getElementById("main-content");

// Función de transición suave
function transitionContent(html) {
    mainContent.classList.add("fade-out");
    setTimeout(() => {
        mainContent.innerHTML = html;
        mainContent.classList.remove("fade-out");
        mainContent.classList.add("fade-in");
    }, 300);
}

// === Navegación dinámica ===
sections.forEach(item => {
    item.addEventListener("click", async () => {
        const section = item.getAttribute("data-section");

        // === 🗺️ MAPA URBANO ===
        if (section === "mapa") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>🗺️ Mapa Urbano</h3>
                    <div id="map" class="map-container"></div>
                </div>
            `);

            setTimeout(() => {
                const map = L.map('map').setView([0, 0], 13);
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
                            .bindPopup("<b>Tu ubicación</b>")
                            .openPopup();
                    });
                }
            }, 400);
        }

        // === 🚲 MOVILIDAD ===
        else if (section === "movilidad") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>🚲 Movilidad Sostenible</h3>
                    <p>Datos en desarrollo: rutas ecológicas, estaciones de transporte y energía limpia.</p>
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
                        <p><strong>Nivel de tráfico:</strong> ${data.info.traffic_level}</p>
                    </div>
                `);
            } catch (e) {
                transitionContent(`<div class="data-card fade-in">❌ Error al conectar con el servidor</div>`);
            }
        }

        // === ⚠️ INCIDENCIAS ===
        else if (section === "incidencias") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>⚠️ Incidencias Urbanas</h3>
                    <p>Próximamente podrás reportar problemas urbanos y recibir predicciones con IA.</p>
                </div>
            `);
        }

        // === 🤖 AURORA (IA) ===
        else if (section === "aurora") {
            transitionContent(`
                <div class="data-card fade-in">
                    <h3>🤖 Aurora</h3>
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
            });
        }
    });
});
