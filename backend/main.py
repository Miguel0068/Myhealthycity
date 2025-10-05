from flask import Flask, jsonify, request
from flask_cors import CORS
import os

# === Configuración base ===
app = Flask(__name__)
CORS(app)

# === Diagnóstico básico ===
if os.getenv("OPENAI_API_KEY"):
    print("🔑 OPENAI_API_KEY detectada correctamente ✅")
else:
    print("⚠️ Variable OPENAI_API_KEY no encontrada (modo sin IA)")

# === Ruta raíz ===
@app.route("/")
def home():
    return jsonify({"message": "✅ Backend de MyHealthyCity activo"})

# === Datos simulados de ciudad ===
@app.route("/api/data")
def get_data():
    return jsonify({
        "info": {
            "temperature": 23,
            "air_quality": "Buena",
            "traffic_level": "Fluido"
        }
    })

# === Consejos fijos de Aurora (modo sin conexión IA) ===
@app.route("/api/aurora_tips")
def aurora_tips():
    consejos = [
        "🌳 Planta un árbol y regálale sombra al futuro.",
        "🚶 Camina más, tu ciudad y tu cuerpo lo agradecerán.",
        "💧 Usa el agua con conciencia, cada gota cuenta.",
        "🚲 Muévete en bici, respira mejor y ayuda al planeta."
    ]
    return jsonify({"tips": consejos})

# === Chat Aurora (modo básico, sin OpenAI) ===
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").lower()

    if "hola" in user_message:
        reply = "¡Hola! Soy Aurora 🌤️, tu guía urbana sostenible. ¿Cómo puedo ayudarte hoy?"
    elif "clima" in user_message:
        reply = "Parece un buen día para salir 🌞. Temperatura actual: 23°C, aire de buena calidad."
    elif "movilidad" in user_message:
        reply = "La movilidad fluida ayuda a todos 🚗💨. ¡Evita las horas punta cuando puedas!"
    else:
        reply = "Aurora aún está aprendiendo, pero te escucha con atención 🌱."
    
    return jsonify({"reply": reply})

# === Ejecución local / Render ===
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
