(function(){
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

    try{
      const res = await fetch("/api/chat", { // ← endpoint del backend raíz
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      const reply = data.reply || "Hubo un problema al responder.";
      push("bot", reply);

      // animación al hablar
      const avatar = document.querySelector(".aurora-circle");
      avatar?.classList.add("active");
      setTimeout(()=>avatar?.classList.remove("active"), 1500);

      // voz femenina suave (si hay voces disponibles)
      const utter = new SpeechSynthesisUtterance(reply);
      utter.lang = "es-ES";
      utter.pitch = 1.15;
      utter.rate = 1;
      const voices = speechSynthesis.getVoices();
      const pref = voices.find(v => /Google español|Helena|Luciana|Paulina/i.test(v.name));
      if (pref) utter.voice = pref;
      speechSynthesis.speak(utter);

    }catch(err){
      push("bot", "⚠️ No puedo conectar con el servidor en este momento.");
    }
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", e => { if(e.key === "Enter") send(); });

  // para cargar voces en algunos navegadores
  window.speechSynthesis.onvoiceschanged = () => {};
})();
