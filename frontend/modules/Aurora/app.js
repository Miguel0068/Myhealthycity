(function () {
  // ===== CONFIGURAR AQUÍ si usas backend en otro dominio (Render) =====
  // Sustituye la URL por la de tu servicio en Render (HTTPS)
  window.AURORA_API_BASE = "https://myhealthycity.onrender.com";
  // ====================================================================

  function resolveApiBase() {
    if (typeof window.AURORA_API_BASE === "string" && window.AURORA_API_BASE.trim()) {
      return window.AURORA_API_BASE.replace(/\/+$/, "");
    }
    const meta = document.querySelector('meta[name="aurora-api-base"]');
    if (meta && meta.content) return meta.content.replace(/\/+$/, "");
    return ""; // misma origin (no uses esto si tu backend está en Render distinto)
  }
  const API_BASE = resolveApiBase();

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
    } finally { clearTimeout(id); }
  }

  const chat = document.getElementById("chat");
  const input = document.getElementById("userInput");
  const btn = document.getElementById("sendBtn");

  function push(role, text){
    const p = document.createElement("p");
    p.className = role === "user" ? "user" : "bot";
    p.innerHTML = `<b>${role === "user" ? "Tú" : "Aurora"}:</b> ${text}`;
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
  }

  // Ping de salud (opcional)
  (async function(){
    try { await fetchJSON(`${API_BASE}/api/health`, { method: "GET" }, 6000); }
    catch { push("bot", "⚠️ No encuentro el servidor. Intentaré al enviar tu mensaje."); }
  })();

  async function send(){
    const text = (input.value || "").trim();
    if(!text) return;
    push("user", text);
    input.value = "";

    try{
      const data = await fetchJSON(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const reply = data.reply || "Hubo un problema al responder.";
      push("bot", reply);

      const avatar = document.querySelector(".aurora-circle");
      avatar?.classList.add("active");
      setTimeout(()=>avatar?.classList.remove("active"), 1500);

      const utter = new SpeechSynthesisUtterance(reply);
      utter.lang = "es-ES"; utter.pitch = 1.15; utter.rate = 1;
      const voices = speechSynthesis.getVoices();
      const pref = voices.find(v => /Google español|Helena|Luciana|Paulina/i.test(v.name));
      if (pref) utter.voice = pref;
      speechSynthesis.speak(utter);
    }catch(err){
      push("bot", "⚠️ No puedo conectar con el servidor: " + (err?.message || ""));
    }
  }

  document.getElementById("sendBtn").addEventListener("click", send);
  document.getElementById("userInput").addEventListener("keydown", e => { if(e.key === "Enter") send(); });
  window.speechSynthesis.onvoiceschanged = () => {};
})();
