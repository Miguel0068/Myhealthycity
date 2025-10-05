from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# === Diagnóstico inicial ===
if os.getenv("OPENAI_API_KEY"):
    print("🔑 OPENAI_API_KEY detectada correctamente ✅")
else:
    print("❌ ERROR: No se detectó la variable OPENAI_API_KEY al iniciar el backend")

# === Función para obtener cliente OpenAI de forma segura ===
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("⚠️ No se encontró la variable OPENAI_API_KEY en Render.")
    return OpenAI(api_key=api_key)

# === Ruta principal ===
@app.route("/")
def home():
    return jsonify({"message": "✅ Backend de MyHealthyCity activo y en línea"})

# === Datos simulados ===
@app.route("/api/data")
def get_data():
    return jsonify({
        "info": {
            "temperature": 23,
            "air_quality": "Buena",
            "traffic_level": "Fluido"
        }
    })

# === 💡 Aurora - Consejos sostenibles ===
@app.route("/api/aurora_tips", methods=["GET"])
def aurora_tips():
    prompt = (
        "Eres Aurora, una IA de bienestar urbano. "
        "Da 4 consejos cortos y positivos sobre sostenibilidad, salud ambiental o cuidado de la ciudad. "
        "Usa emojis naturales y tono humano, sin numerarlos."
    )

    try:
        client = get_openai_client()  # Releer API key en cada request
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.8,
        )
        tips_text = response.choices[0].message.content.strip()
        tips = [t.strip("•- ") for t in tips_text.split("\n") if t.strip()]
        return jsonify({"tips": tips})
    except Exception as e:
        print("⚠️ Error en /api/aurora_tips:", str(e))
        return jsonify({"error": str(e)}), 500

# === 🤖 Aurora Chat ===
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"reply": "⚠️ No se recibió ningún mensaje."}), 400

        user_message = data["message"]
        client = get_openai_client()  # Releer API key en cada request

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
        return jsonify({"reply": reply})

    except Exception as e:
        print("⚠️ Error en /api/chat:", str(e))
        return jsonify({"reply": f"Error al conectar con Aurora: {str(e)}"}), 500

# === Ejecutar servidor ===
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
