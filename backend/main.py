from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from openai import OpenAI
import os

app = Flask(__name__)

# === 🔐 Configurar CORS seguro ===
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://myhealthycity.vercel.app",
            "http://localhost:3000"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# === 🔍 Diagnóstico inicial ===
if os.getenv("OPENAI_API_KEY"):
    print("🔑 OPENAI_API_KEY detectada correctamente ✅")
else:
    print("❌ ERROR: No se detectó la variable OPENAI_API_KEY al iniciar el backend")

# === 🧠 Cliente dinámico OpenAI ===
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("⚠️ No se encontró la variable OPENAI_API_KEY en Render.")
    return OpenAI(api_key=api_key)

# === 🧩 Middleware para agregar cabeceras CORS manuales ===
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "https://myhealthycity.vercel.app"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

# === 🏠 Ruta principal ===
@app.route("/")
def home():
    return jsonify({"message": "✅ Backend de MyHealthyCity activo y en línea"})

# === 🧭 Ruta simple de diagnóstico ===
@app.route("/api/ping")
def ping():
    return jsonify({"status": "ok", "message": "✅ Servidor Flask operativo en Render"})

# === 🌡️ Datos simulados ===
@app.route("/api/data")
def get_data():
    data = {
        "info": {
            "temperature": 23,
            "air_quality": "Buena",
            "traffic_level": "Fluido"
        }
    }
    return jsonify(data)

# === 💡 Aurora Tips ===
@app.route("/api/aurora_tips", methods=["GET"])
def aurora_tips():
    try:
        client = get_openai_client()
        prompt = (
            "Eres Aurora, una IA de bienestar urbano. "
            "Da 4 consejos cortos y positivos sobre sostenibilidad, salud ambiental o cuidado de la ciudad. "
            "Usa emojis naturales y tono humano, sin numerarlos."
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.8,
        )
        tips_text = response.choices[0].message.content.strip()
        tips = [t.strip("•- ") for t in tips_text.split("\n") if t.strip()]
        res = make_response(jsonify({"tips": tips}))
        res.headers["Access-Control-Allow-Origin"] = "*"
        return res
    except Exception as e:
        print("⚠️ Error en /api/aurora_tips:", str(e))
        return jsonify({"error": str(e)}), 500

# === 💬 Chat con Aurora ===
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"reply": "⚠️ No se recibió ningún mensaje."}), 400

        user_message = data["message"]
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Eres Aurora, una IA amable enfocada en ciudades sostenibles y saludables."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=150,
            temperature=0.8,
        )
        reply = response.choices[0].message.content.strip()
        res = make_response(jsonify({"reply": reply}))
        res.headers["Access-Control-Allow-Origin"] = "*"
        return res

    except Exception as e:
        print("⚠️ Error en /api/chat:", str(e))
        return jsonify({"reply": f"Error al conectar con Aurora: {str(e)}"}), 500

# === 🧪 Test de conexión con OpenAI ===
@app.route("/api/test_key")
def test_key():
    """Verifica si la API Key de OpenAI responde correctamente"""
    try:
        client = get_openai_client()
        test_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Responde con un saludo corto"}],
            max_tokens=20
        )
        return jsonify({
            "status": "ok",
            "sample": test_response.choices[0].message.content.strip()
        })
    except Exception as e:
        print("⚠️ Error en /api/test_key:", str(e))
        return jsonify({"status": "error", "details": str(e)}), 500

# === 🚀 Ejecutar servidor ===
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
