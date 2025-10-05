from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ✅ Inicializar cliente OpenAI con variable de entorno
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# 🧩 Diagnóstico: verificar si la API key está cargada
if api_key:
    print("🔑 OPENAI_API_KEY detectada correctamente ✅")
else:
    print("❌ ERROR: No se detectó la variable OPENAI_API_KEY en Render")

@app.route("/")
def home():
    return jsonify({"message": "✅ Backend de MyHealthyCity activo"})

# 🌡️ Datos simulados de ciudad
@app.route("/api/data")
def get_data():
    return jsonify({
        "info": {
            "temperature": 23,
            "air_quality": "Buena",
            "traffic_level": "Fluido"
        }
    })

# 💡 Aurora - Consejos sostenibles
@app.route("/api/aurora_tips", methods=["GET"])
def aurora_tips():
    prompt = (
        "Eres Aurora, una IA de bienestar urbano. "
        "Da 4 consejos cortos y positivos sobre sostenibilidad, salud ambiental o cuidado de la ciudad. "
        "Usa emojis naturales y tono humano, sin numerarlos."
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.8,
        )
        tips_text = response.choices[0].message.content.strip()
        tips = [tip.strip() for tip in tips_text.split("\n") if tip.strip()]
        return jsonify({"tips": tips})
    except Exception as e:
        print("⚠️ Error en /api/aurora_tips:", str(e))
        return jsonify({"error": str(e)}), 500

# 🤖 Chat Aurora
@app.route("/api/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Eres Aurora, una IA amable enfocada en ciudades sostenibles y saludables."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=100,
            temperature=0.8
        )
        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})
    except Exception as e:
        print("⚠️ Error en /api/chat:", str(e))
        return jsonify({"reply": f"Error al conectar con Aurora: {e}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
