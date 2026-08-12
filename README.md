# Bangalore Home Price Prediction 🏡

A full-stack machine learning application that predicts real estate prices in Bangalore, India, based on various property features like square footage, number of bedrooms (BHK), bathrooms, and location.

## 📁 Project Structure

This repository is divided into three main components:

* **`model/`**: Contains the Jupyter Notebooks used for data cleaning, exploratory data analysis (EDA), and training the Machine Learning model. The final trained model is exported from here.
* **`server/`**: The backend API that loads the trained machine learning model and handles prediction requests from the frontend.
* **`client/`**: The frontend user interface built with HTML, CSS, and JavaScript where users can input property details and view the predicted price.

## 🛠️ Tech Stack

* **Machine Learning:** Python, Pandas, NumPy, Scikit-learn, Jupyter Notebook
* **Backend:** Python Flask 
* **Frontend:** HTML, CSS, Vanilla JavaScript

## Run locally

Start both the Flask API and frontend with one command:

```bash
npm run dev
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.



