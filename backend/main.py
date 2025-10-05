from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
import os

app = Flask(__name__)
CORS(app)

openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/')
def home():
    return jsonify({"message": "✅ Backend running correctly!"})

@app.route('/api/data')
def get_data():
    data = {
        "status": "success",
        "info": {
            "temperature": 22,
            "air_quality": "Buena",
            "traffic_level": "Moderado"
        }
    }
    return jsonify(data)

@app.route('/api/chat', methods=['POST'])
def chat_micity():
    try:
        user_input = request.json.get("message")
        if not user_input:
            return jsonify({"error": "Mensaje vacío"}), 400

        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": (
                    "Eres Micity, un asistente experto en sostenibilidad, movilidad urbana, medio ambiente y salud pública. "
                    "Tu tono es amable, educativo y claro. Ofreces consejos prácticos para mejorar la calidad de vida en las ciudades."
                )},
                {"role": "user", "content": user_input}
            ]
        )

        reply = completion.choices[0].message["content"]
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
