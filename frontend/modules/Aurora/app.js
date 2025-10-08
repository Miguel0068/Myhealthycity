(function(){
  // 👉 Si ya tienes backend, reemplaza este string:
  // window.AURORA_API_BASE = "https://TU-BACKEND.onrender.com";
  // Por ahora el demo funciona sin conexión, solo estética.

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

  async function send(){
    const text = (input.value || "").trim();
    if(!text) return;
    push("user", text);
    input.value = "";

    // animación del avatar
    const avatar = document.querySelector(".aurora-circle");
    avatar?.classList.add("active");
    setTimeout(()=>avatar?.classList.remove("active"), 1200);

    // Respuesta simulada (no usa backend)
    setTimeout(()=>{
      const replies = [
        "Qué gusto verte 🌞",
        "Cuidar el aire también es cuidarte a ti 💨",
        "Puedes preguntarme sobre clima o movilidad urbana 🚲",
        "Estoy lista para ayudarte 🌿"
      ];
      const reply = replies[Math.floor(Math.random()*replies.length)];
      push("bot", reply);
    }, 800);
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", e => { if(e.key === "Enter") send(); });
})();
