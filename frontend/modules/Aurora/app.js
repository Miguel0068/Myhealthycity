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

  // Smoke test: NO llama backend; simula respuesta
  async function send(){
    const text = (input.value || "").trim();
    if(!text) return;
    push("user", text);
    input.value = "";

    // animación avatar
    const avatar = document.querySelector(".aurora-circle");
    avatar?.classList.add("active");
    setTimeout(()=>avatar?.classList.remove("active"), 1000);

    // “respuesta” fake para probar UI
    setTimeout(()=>{
      push("bot", "Recibido. Si ves esto, la UI de Aurora se está renderizando bien en Vercel.");
    }, 500);
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", e => { if(e.key === "Enter") send(); });
})();
