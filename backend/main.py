from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
import os

app = Flask(__name__)

# === Configurar CORS para permitir Vercel ===
CORS(app, resources={r"/*": {"origins": ["https://myhealthycity.vercel.app", "*"]}})

# === Variables de entorno ===
api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if api_key:
    print("🔑 OPENAI_API_KEY detectada correctamente ✅")
else:
    print("❌ ERROR: No se detectó OPENAI_API_KEY en Render")

client = OpenAI(api_key=api_key)

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

@app.route("/api/aurora_tips", methods=["GET"])
def aurora_tips():
    prompt = (
        "Eres Aurora, una IA de bienestar urbano. "
        "Da 4 consejos cortos sobre sostenibilidad, salud ambiental o bienestar urbano. "
        "Usa emojis naturales y tono humano."
    )
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.8,
        )
        text = response.choices[0].message.content.strip()
        tips = [t.strip("-• ") for t in text.split("\n") if t.strip()]
        print("✅ Aurora generó tips correctamente")
        return jsonify({"tips": tips})
    except Exception as e:
        print("⚠️ Error en /api/aurora_tips:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"reply": "⚠️ No se recibió mensaje válido."}), 400
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Eres Aurora, una IA amable enfocada en ciudades saludables y sostenibles."},
                {"role": "user", "content": user_message}
            ],
            max_tokens=150,
            temperature=0.8,
        )
        reply = response.choices[0].message.content.strip()
        print(f"🗨️ Aurora respondió: {reply[:80]}...")
        return jsonify({"reply": reply})
    except Exception as e:
        print("⚠️ Error en /api/chat:", str(e))
        return jsonify({"reply": f"Error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
