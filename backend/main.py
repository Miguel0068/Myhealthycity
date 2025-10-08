# main.py — Backend raíz Aurora (Flask)
from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import os
import openai
import json
import time

# =========================
# Configuración base
# =========================
app = Flask(__name__)
# Si quieres restringir, cambia origins:
# CORS(app, resources={r"/api/*": {"origins": "https://tu-dominio"}})
CORS(app)

# API Key y modelo desde entorno
openai.api_key = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Prompt del sistema (tono femenino, predicciones y avisos urbanos)
SYSTEM_PROMPT = (
    "Eres AURORA, una asistente urbana con voz femenina, empática y práctica. "
    "Tu objetivo es ayudar a cuidar la ciudad con predicciones y avisos claros "
    "sobre calidad del aire, clima, movilidad, residuos, seguridad preventiva y bienestar. "
    "Responde en español, con calidez y precisión, en pocas líneas y con viñetas cuando sea útil."
)

# =========================
# Helpers
# =========================
def json_error(message, status=400, code="bad_request"):
    return jsonify({"ok": False, "error": {"code": code, "message": message}}), status

def require_openai():
    if not openai.api_key:
        return False, json_error("OPENAI_API_KEY no configurado en el entorno.", 500, "no_api_key")
    return True, None

# =========================
# Rutas básicas
# =========================
@app.get("/")
def root():
    return jsonify({"ok": True, "message": "✅ Backend running", "service": "aurora-backend"})

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "uptime": time.time()})

@app.get("/api/data")
def get_data():
    # Demo de payload (ajusta a tus datos reales)
    payload = {
        "status": "success",
        "info": {
            "temperature": 22,
            "air_quality": "Buena",
            "traffic_level": "Moderado"
        }
    }
    return jsonify(payload)

# =========================
# Chat normal (no streaming)
# =========================
@app.post("/api/chat")
def api_chat():
    ok, err = require_openai()
    if not ok:
        return err

    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    if not user_message:
        return json_error("Mensaje vacío.", 400, "empty_message")

    try:
        completion = openai.ChatCompletion.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=600,
        )
        reply = completion.choices[0].message["content"]
        return jsonify({"ok": True, "reply": reply})
    except Exception as e:
        return json_error(f"Error al consultar OpenAI: {str(e)}", 500, "openai_error")

# =========================
# Chat streaming (SSE) - opcional
# =========================
@app.post("/api/chat/stream")
def api_chat_stream():
    ok, err = require_openai()
    if not ok:
        return err

    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    if not user_message:
        return json_error("Mensaje vacío.", 400, "empty_message")

    def sse():
        try:
            stream = openai.ChatCompletion.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=700,
                stream=True,
            )
            for chunk in stream:
                if "choices" in chunk and chunk["choices"]:
                    delta = chunk["choices"][0].get("delta", {})
                    piece = delta.get("content", "")
                    if piece:
                        yield f"data: {json.dumps({'content': piece})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
    }
    return Response(stream_with_context(sse()), headers=headers)

# =========================
# Errores globales
# =========================
@app.errorhandler(404)
def not_found(_):
    return json_error("Ruta no encontrada.", 404, "not_found")

@app.errorhandler(405)
def method_not_allowed(_):
    return json_error("Método no permitido.", 405, "method_not_allowed")

@app.errorhandler(500)
def server_error(e):
    return json_error(f"Error interno del servidor: {str(e)}", 500, "server_error")

# =========================
# Local dev
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # debug=False evita duplicados en SSE con el reloader
    app.run(host="0.0.0.0", port=port, debug=False)
