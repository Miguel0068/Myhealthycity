import os
import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from openai import OpenAI

# ======= CONFIGURACIÓN GLOBAL =======
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
FLASK_SECRET = os.getenv("FLASK_SECRET", "dev-secret")

app = Flask(__name__)
app.config["SECRET_KEY"] = FLASK_SECRET

# Habilitar CORS completo y websockets
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Cliente OpenAI persistente
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ======= RUTAS PRINCIPALES =======
@app.route("/")
def home():
    return jsonify({"message": "✅ Backend MyHealthyCity activo y estable"})

@app.route("/api/data")
def get_data():
    return jsonify({
        "info": {
            "temperature": 23,
            "air_quality": "Buena",
            "traffic_level": "Fluido"
        }
    })

@app.route("/api/aurora_tips", methods=["GET"])
def aurora_tips():
    if not client:
        return jsonify({"tips": [
            "🌱 Cuida las áreas verdes de tu ciudad.",
            "💧 Ahorra agua cada día.",
            "🚲 Usa bicicleta o transporte sostenible.",
            "🌞 Aprovecha la energía solar siempre que puedas."
        ]})

    prompt = (
        "Eres Aurora, una IA urbana. Da 4 consejos cortos, positivos y con emojis "
        "sobre sostenibilidad, salud ambiental o bienestar urbano."
    )
    try:
        rsp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.8
        )
        text = rsp.choices[0].message.content.strip()
        tips = [t.strip("-• ") for t in text.split("\n") if t.strip()]
        return jsonify({"tips": tips})
    except Exception as e:
        print("⚠️ Error en /api/aurora_tips:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"reply": "⚠️ No se recibió mensaje válido."}), 400

    if not client:
        replies = [
            "🌍 ¡Hola! Soy Aurora, tu guía hacia una ciudad más limpia 💚",
            "💬 Recuerda usar transporte sostenible y cuidar los espacios verdes 🌿",
            "🌞 Aprovecha la luz natural y apaga lo que no uses ⚡"
        ]
        from random import choice
        return jsonify({"reply": choice(replies)})

    try:
        rsp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "Eres Aurora, una IA amable enfocada en ciudades saludables y sostenibles."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=150,
            temperature=0.8
        )
        reply = rsp.choices[0].message.content.strip()
        print(f"🗨️ Aurora respondió: {reply[:60]}...")
        return jsonify({"reply": reply})
    except Exception as e:
        print("⚠️ Error en /api/chat:", e)
        return jsonify({"reply": f"Error: {str(e)}"}), 500

# ======= SOCKET.IO para estabilidad =======
@socketio.on("connect")
def on_connect():
    emit("server_status", {"msg": "connected", "ts": os.times()})

# ======= EJECUCIÓN =======
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
