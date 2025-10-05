from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
import os

app = Flask(__name__)
CORS(app)

# Configurar tu API Key de OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route("/")
def home():
    return jsonify({"message": "✅ Backend de MyHealthyCity activo"})

@app.route("/api/data")
def get_data():
    return jsonify({
        "info": {
            "temperature": 23,
            "air_quality": "Buena",
            "traffic_level": "Fluido"
        }
    })

# 🧠 Aurora: Consejos sostenibles generados por IA
@app.route("/api/aurora_tips", methods=["GET"])
def aurora_tips():
    prompt = (
        "Eres Aurora, una IA de recolección de datos de ayuda para una ciudad saludable y optimizada. "
        "Da 4 consejos cortos y amables sobre cómo cuidar la ciudad o reportar , "
        "la salud ambiental o el bienestar urbano. Incluye emojis naturales y tono humano."
    )
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.8,
        )
        tips = response.choices[0].message.content.strip().split("\n")
        tips = [tip for tip in tips if tip.strip()]
        return jsonify({"tips": tips})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🤖 Chat Aurora
@app.route("/api/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Eres Aurora, una IA amable enfocada en ciudades saludables y sostenibles."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=100,
            temperature=0.8
        )
        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"reply": "Aurora está pensando... 🌌"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
