(function () {
  // ====== Resolución del endpoint (Render/Local) ======
  function resolveApiBase() {
    // 1) JS global opcional
    if (typeof window.AURORA_API_BASE === "string" && window.AURORA_API_BASE.trim()) {
      return window.AURORA_API_BASE.replace(/\/+$/, "");
    }
    // 2) <meta name="aurora-api-base" content="https://...">
    const meta = document.querySelector('meta[name="aurora-api-base"]');
    if (meta && meta.content) {
      return meta.content.replace(/\/+$/, "");
    }
    // 3) Misma origin (backend y frontend juntos)
    return ""; // rutas relativas: /api/...
  }
  const API_BASE = resolveApiBase();

  // Helper fetch con timeout
  async function fetchJSON(url, opts = {}, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return data;
    } finally {
      clearTimeout(id);
    }
  }

  // ====== UI refs ======
  const chat = document.getElementById("chat");
  const input = document.getElementById("userInput");
  const btn = document.getElementById("sendBtn");

  function push(role, text) {
    const p = document.createElement("p");
    p.className = role === "user" ? "user" : "bot";
    p.innerHTML = `<b>${role === "user" ? "Tú" : "Aurora"}:</b> ${text}`;
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
  }

  // ====== Ping de salud (opcional, muestra un aviso si falla) ======
  (async function healthCheck() {
    try {
      await fetchJSON(`${API_BASE}/api/health`, { method: "GET" }, 6000);
    } catch (e) {
      push("bot", "⚠️ No encuentro el servicio en el servidor. Revisaré de nuevo al enviar tu mensaje.");
    }
  })();

  // ====== Envío de mensaje ======
  async function send() {
    const text = (input.value || "").trim();
    if (!text) return;

    push("user", text);
    input.value = "";

    try {
      const data = await fetchJSON(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const reply = data.reply || "Hubo un problema al responder.";
      push("bot", reply);

      // animación al hablar
      const avatar = document.querySelector(".aurora-circle");
      avatar?.classList.add("active");
      setTimeout(() => avatar?.classList.remove("active"), 1500);

      // voz femenina suave (si hay voces disponibles)
      const utter = new SpeechSynthesisUtterance(reply);
      utter.lang = "es-ES";
      utter.pitch = 1.15;
      utter.rate = 1;
      const voices = speechSynthesis.getVoices();
      const pref = voices.find((v) => /Google español|Helena|Luciana|Paulina/i.test(v.name));
      if (pref) utter.voice = pref;
      speechSynthesis.speak(utter);
    } catch (err) {
      push("bot", "⚠️ No puedo conectar con el servidor en este momento. " + (err?.message || ""));
    }
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  // Para cargar voces en algunos navegadores
  window.speechSynthesis.onvoiceschanged = () => {};
})();
