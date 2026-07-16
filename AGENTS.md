# ConnectiLearn Agent Guide

This document provides essential information for OpenCode agents working on the ConnectiLearn repository.

## 🚀 Getting Started

The project is a monorepo with distinct client and server applications.

### Client (React with Vite)

- **Location**: `client/`
- **Dependencies**: Managed by `client/package.json`.
- **Development Server**: Runs on `http://localhost:3000`.
- **Start Command**:
    ```bash
    cd client
    npm install
    npm run dev
    ```

### Server (FastAPI with Uvicorn)

- **Location**: `server/`
- **Dependencies**: Managed by `server/requirements.txt` (Python) and `server/package.json` (Node.js for development tools like nodemon).
- **Environment Variables**: Uses `.env` files. `server/.env` overrides the root `.env`. See `server/.env.example` for required variables.
- **API Base URL**: `http://localhost:5000/api`
- **Start Command**:
    ```bash
    cd server
    pip install -r requirements.txt
    npm install
    uvicorn main:app --host 0.0.0.0 --port 5000 --reload
    ```
    Or for development with `nodemon` (watches for `.js` changes, but server is Python):
    ```bash
    cd server
    npm run dev
    ```
    Note: The `npm run dev` script for the server currently uses `nodemon index.js` but the main server entry point is `main.py`. This might indicate an outdated script or a non-standard setup if there is no `index.js`. The `uvicorn` command is the more accurate way to run the Python server.

### ML Module

- **Location**: `ML/`
- **Purpose**: Contains Python scripts for training and prediction of VARK learning styles.
- **Model Path**: The `server/services/recommendation.py` loads models from `ML/models/vark_high_acc_model.pkl` and `ML/models/vark_authentic_model.pkl`.
- **Training**: Scripts like `ML/train_vark.py` are used for model training and artifact generation (e.g., confusion matrices).

## 🧪 Testing

There are no explicit test scripts defined in `client/package.json` or `server/package.json`, nor are there any Python test files (e.g., `test_*.py`). Manual verification is currently the primary method.

## ⚙️ Key Configuration Files

- **Environment Variables**: `.env` (root), `server/.env` (server-specific, overrides root)
- **Client Dependencies**: `client/package.json`
- **Server Python Dependencies**: `server/requirements.txt`
- **Server Node.js Dependencies/Scripts**: `server/package.json`
- **Client Build/Dev Config**: `client/vite.config.js`
- **Server Main Application**: `server/main.py`
- **Server Configuration**: `server/config.py` (handles environment variable loading)
- **Client API Utility**: `client/src/utils/api.js` (configures Axios with base URL and JWT)

