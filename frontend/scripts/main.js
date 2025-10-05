// === 🌐 Configuración global ===
const BACKEND_URL = "https://myhealthycity-backend.onrender.com"; // ✅ URL pública de tu backend Flask

// === 📦 Selección de elementos del DOM ===
const sections = document.querySelectorAll(".menu li");
const mainContent = document.getElementById("main-content");

// Crear panel dinámico para cargar los módulos (mantiene el dashboard fijo)
let dynamicPanel = document.createElement("div");
dynamicPanel.id = "dynamic-panel";
mainContent.appendChild(dynamicPanel);

// === 🧭 Manejo de clics en la barra lateral ===
sections.forEach(item => {
    item.addEventListener("click", async () => {
        const section = item.getAttribute("data-section");
        dynamicPanel.innerHTML = `<div class="data-card"><h3>${section.toUpperCase()}</h3><p>Cargando...</p></div>`;

        // === 🗺️ MAPA URBANO ===
        if (section === "mapa") {
            dynamicPanel.innerHTML = `
                <div class="data-card">
                    <h3>🗺️ Mapa Urbano Interactivo</h3>
                    <div id="map" style="height: 500px; border-radius: 15px; margin-top: 15px;"></div>

                    <!-- Panel de control del mapa -->
                    <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="map-btn" data-layer="green">🌳 Zonas Verdes</button>
                        <button class="map-btn" data-layer="pollution">🌫️ Contaminación</button>
                        <button class="map-btn" data-layer="traffic">🚗 Tráfico</button>
                        <button class="map-btn" data-layer="reset">🔄 Reset</button>
                    </div>
                </div>
            `;

            // Esperar a que el DOM cargue el div del mapa
            setTimeout(() => {
                const map = L.map('map').setView([0, 0], 13);

                // Capa base (OpenStreetMap)
                const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                // Geolocalización del usuario
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        map.setView([lat, lon], 14);

                        // Marcador de ubicación
                        L.marker([lat, lon])
                            .addTo(map)
                            .bindPopup(`<b>Tu ubicación</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`)
                            .openPopup();
                    }, () => alert("⚠️ No se pudo obtener tu ubicación."));
                }

                // Capas simuladas
                const greenLayer = L.circle([0, 0], { radius: 200, color: "green", opacity: 0.5 });
                const pollutionLayer = L.circle([0.01, 0.01], { radius: 300, color: "red", opacity: 0.5 });
                const trafficLayer = L.polyline([[0,0],[0.01,0.02],[0.02,0.03]], { color: "orange", weight: 5 });

                // Control de botones del mapa
                document.querySelectorAll(".map-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const layer = btn.getAttribute("data-layer");

                        map.eachLayer(l => { if (l !== baseLayer) map.removeLayer(l); }); // limpia

                        switch(layer) {
                            case "green": greenLayer.addTo(map); break;
                            case "pollution": pollutionLayer.addTo(map); break;
                            case "traffic": trafficLayer.addTo(map); break;
                            case "reset": break; // solo limpiar
                        }
                    });
                });
            }, 300);
        }

        // === 🚲 MOVILIDAD ===
        else if (section === "movilidad") {
            dynamicPanel.innerHTML = `
                <div class="data-card">
                    <h3>🚲 Movilidad Sostenible</h3>
                    <p>Datos en desarrollo. Se integrarán rutas ecológicas y flujo vehicular en tiempo real.</p>
                    <p>💡 Consejo: Evita horas punta y usa medios alternativos. ¡Tu ciudad respira contigo!</p>
                </div>
            `;
        }

        // === 🌫️ CONTAMINACIÓN ===
        else if (section === "contaminacion") {
            try {
                const response = await fetch(`${BACKEND_URL}/api/data`);
                const data = await response.json();

                dynamicPanel.innerHTML = `
                    <div class="data-card">
                        <h3>🌫️ Datos Ambientales</h3>
                        <p><strong>Temperatura:</strong> ${data.info.temperature} °C</p>
                        <p><strong>Calidad del aire:</strong> ${data.info.air_quality}</p>
                        <p><strong>Tráfico:</strong> ${data.info.traffic_level}</p>
                        <p style="margin-top:15px;">🧠 Micity recomienda salir con mascarilla si la calidad del aire es baja.</p>
                    </div>
                `;
            } catch (error) {
                dynamicPanel.innerHTML = `
                    <div class="data-card" style="color:red;">
                        ❌ Error al conectar con el backend (${BACKEND_URL})
                    </div>
                `;
            }
        }

        // === ⚠️ INCIDENCIAS ===
        else if (section === "incidencias") {
            dynamicPanel.innerHTML = `
                <div class="data-card">
                    <h3>⚠️ Incidencias Urbanas</h3>
                    <p>Muy pronto podrás reportar baches, basura acumulada o cortes de luz en tu zona.</p>
                    <p>📍 IA predice focos de congestión basados en reportes previos y tráfico actual.</p>
                </div>
            `;
        }

        // === 🤖 MICITY CHATBOT ===
        else if (section === "micity") {
            dynamicPanel.innerHTML = `
                <div class="data-card">
                    <h3>🤖 Micity Chatbot</h3>
                    <div id="chat-box" style="height:300px; overflow-y:auto; background:var(--card-bg); border-radius:10px; padding:10px; margin-bottom:10px; border:1px solid var(--border-color);"></div>
                    <div class="chat-input">
                        <input id="user-input" type="text" placeholder="Escribe tu mensaje..." 
                            style="width:80%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color);">
                        <button id="send-btn" 
                            style="padding:10px 15px; border:none; background:var(--text-color); color:var(--bg-color); border-radius:8px;">Enviar</button>
                    </div>
                </div>
            `;

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
                    chatBox.innerHTML += `<p><b>Micity:</b> ${data.reply || "No tengo respuesta para eso aún 😅"}</p>`;
                    chatBox.scrollTop = chatBox.scrollHeight;
                } catch (err) {
                    chatBox.innerHTML += `<p style="color:red;">❌ Error al conectar con el servidor (${BACKEND_URL})</p>`;
                }
            });
        }
    });
});
