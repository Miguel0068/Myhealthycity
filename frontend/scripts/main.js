// === Selección de elementos del DOM ===
const sections = document.querySelectorAll(".menu li");
const mainContent = document.getElementById("main-content");

// === Manejo de clics en la barra lateral ===
sections.forEach(item => {
    item.addEventListener("click", async () => {
        const section = item.getAttribute("data-section");
        mainContent.innerHTML = `<div class="data-card"><h3>${section.toUpperCase()}</h3><p>Cargando...</p></div>`;

        // === 🗺️ MAPA URBANO ===
        if (section === "mapa") {
            mainContent.innerHTML = `
                <div class="data-card">
                    <h3>🗺️ Mapa Urbano Interactivo</h3>
                    <div id="map" style="height: 500px; border-radius: 15px; margin-top: 15px;"></div>
                </div>
            `;

            // Esperar a que el DOM cargue el div del mapa
            setTimeout(() => {
                const map = L.map('map').setView([0, 0], 13);

                // Cargar mapa base gratuito (OpenStreetMap)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                // Geolocalización
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        map.setView([lat, lon], 14);

                        // Agregar marcador en tu ubicación
                        L.marker([lat, lon])
                            .addTo(map)
                            .bindPopup(`<b>Tu ubicación</b><br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`)
                            .openPopup();
                    }, () => {
                        alert("⚠️ No se pudo obtener tu ubicación. Activa permisos de ubicación en el navegador.");
                    });
                } else {
                    alert("Tu navegador no soporta geolocalización.");
                }
            }, 300);
        }

        // === 🚲 MOVILIDAD ===
        else if (section === "movilidad") {
            mainContent.innerHTML = `
                <div class="data-card">
                    <h3>🚲 Movilidad Sostenible</h3>
                    <p>Módulo en desarrollo. Aquí se visualizarán rutas ecológicas y tráfico urbano.</p>
                </div>
            `;
        }

        // === 🌫️ CONTAMINACIÓN ===
        else if (section === "contaminacion") {
            try {
                const response = await fetch("http://127.0.0.1:5000/api/data");
                const data = await response.json();

                mainContent.innerHTML = `
                    <div class="data-card">
                        <h3>🌫️ Datos de Contaminación</h3>
                        <p><strong>Temperatura:</strong> ${data.info.temperature} °C</p>
                        <p><strong>Calidad del aire:</strong> ${data.info.air_quality}</p>
                        <p><strong>Nivel de tráfico:</strong> ${data.info.traffic_level}</p>
                    </div>
                `;
            } catch (error) {
                mainContent.innerHTML = `
                    <div class="data-card" style="color:red;">
                        ❌ Error al conectar con el backend. Verifica que Flask esté corriendo.
                    </div>
                `;
            }
        }

        // === ⚠️ INCIDENCIAS ===
        else if (section === "incidencias") {
            mainContent.innerHTML = `
                <div class="data-card">
                    <h3>⚠️ Incidencias Urbanas</h3>
                    <p>Próximamente podrás reportar incidencias en tu entorno urbano y ver predicciones con IA.</p>
                </div>
            `;
        }

        // === 🤖 MICITY CHATBOT ===
        else if (section === "micity") {
            mainContent.innerHTML = `
                <div class="data-card">
                    <h3>🤖 Micity Chatbot</h3>
                    <div id="chat-box" style="height:300px; overflow-y:auto; background:#f9f9f9; border-radius:10px; padding:10px; margin-bottom:10px;"></div>
                    <div class="chat-input">
                        <input id="user-input" type="text" placeholder="Escribe tu mensaje..." style="width:80%; padding:10px; border-radius:8px; border:1px solid #ccc;">
                        <button id="send-btn" style="padding:10px 15px; border:none; background:#00aaff; color:#fff; border-radius:8px;">Enviar</button>
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
                    const res = await fetch("http://127.0.0.1:5000/api/chat", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ message })
                    });
                    const data = await res.json();

                    chatBox.innerHTML += `<p><b>Micity:</b> ${data.reply || "Error en la respuesta"}</p>`;
                    chatBox.scrollTop = chatBox.scrollHeight;
                } catch (err) {
                    chatBox.innerHTML += `<p style="color:red;">❌ Error al conectar con el servidor</p>`;
                }
            });
        }
    });
});
