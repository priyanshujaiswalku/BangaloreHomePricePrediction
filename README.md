# Bangalore Home Price Prediction

A full-stack machine-learning application that predicts real-estate prices in Bangalore from square footage, BHK, bathrooms, and location.

Repository: https://github.com/priyanshujaiswalku/BangaloreHomePricePrediction

## Project structure

- `model/` — data preparation, EDA, and model-training notebooks.
- `server/` — Flask prediction API and saved-model artifacts.
- `client/` — HTML, CSS, and JavaScript user interface.

## Run locally

Install the Python dependencies once:

```bash
pip install -r server/requirements.txt
```

Then start both the Flask API and frontend with one command:

```bash
npm run dev
```

Open http://127.0.0.1:5000 in your browser.
