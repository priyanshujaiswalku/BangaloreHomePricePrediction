from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import util

# Serve static files from the client directory
CLIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client')

app = Flask(__name__, static_folder=CLIENT_DIR)
CORS(app)


# ---------- Serve the frontend ----------
@app.route('/')
def index():
    return send_from_directory(CLIENT_DIR, 'app.html')


@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(CLIENT_DIR, filename)


# ---------- Health check (keeps Render from sleeping) ----------
@app.route('/healthz')
def healthz():
    return 'ok', 200


# ---------- API endpoints ----------
@app.route('/get_location_names')
def get_location_names():
    response = jsonify({
        'locations': util.get_location_names()
    })
    return response


@app.route('/predict_home_price', methods=['POST'])
def predict_home_price():
    total_sqft = float(request.form['total_sqft'])
    location = request.form['location']
    bhk = int(request.form['bhk'])
    bath = int(request.form['bath'])

    estimated_price = util.get_estimated_price(location, total_sqft, bhk, bath)

    response = jsonify({
        'estimated_price': estimated_price
    })
    return response


# Load model artifacts on import (works for both gunicorn and direct run)
print("Starting Python Flask Server For Home Price Prediction...")
util.load_saved_artifacts()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Server running at http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port)
