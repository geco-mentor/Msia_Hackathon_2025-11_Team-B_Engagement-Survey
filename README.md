# AI Hackathon Project

This repository contains the source code for the AI Hackathon application, organized into two main components:

  * **Backend:** A FastAPI Python application.
  * **Frontend:** The user interface (React).

## 📂 Project Structure

AI-HACKATHON/
├── backend/            # FastAPI server & database logic
├── frontend/           # Client-side application
└── README.md           # You are here

## 🛠️ Prerequisites

Before running the project, ensure you have the following installed:

  * **Python 3.9+** (for the backend)
  * **Node.js & npm** (for the frontend)
  * **Git**

-----

## 🚀 Getting Started

Follow these steps to run both the backend and frontend locally.

### 1\. Setting up the Backend

Open a terminal and navigate to the backend folder:

```bash
cd backend
```

**Install Dependencies:**
It is recommended to use a virtual environment, but for a quick start, run:

```bash
pip install -r requirements.txt
```

**Run the Server:**
You can run the server in development mode (auto-reloads on code changes):

```bash
fastapi dev main.py
```

  * The API will be available at: `http://localhost:8000`
  * Interactive Docs (Swagger UI): `http://localhost:8000/docs`

-----

### 2\. Setting up the Frontend

Open a **new** terminal window (keep the backend running) and navigate to the frontend folder:

```bash
cd frontend
```

**Install Dependencies:**

```bash
npm install
```

**Run the Application:**

```bash
npm run dev

```
Here is a clean, copy-pasteable **Environment Setup README** for your project. You can save this as `SETUP_ENV.md` or append it to your main `README.md`.

-----

# 🔐 Environment Configuration Guide

To run the application locally, you must configure the environment variables for both the **Frontend** and **Backend**. These variables handle API connections and secure credentials for AWS and Hugging Face.

## 1\. Backend Setup (`backend/`)

Navigate to the `backend/` directory and create a file named `.env`:

```bash
cd backend
# Create the file (Mac/Linux)
touch .env
# OR manually create a new text file named ".env" in Windows
```

Open the `.env` file and paste the following credentials.

> **⚠️ Important:** These are temporary session tokens. If you get an "UnrecognizedClientException" or "ExpiredToken" error, you will need to generate new AWS credentials and update this file.

```ini
# --- AWS DynamoDB & Service Credentials ---
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_REGION=
# --- AI Model Tokens ---
HF_TOKEN=
```

**After saving the file:**
Restart your backend server for changes to take effect:

```bash
# If running locally:
fastapi dev main.py
```

-----

## 2\. Frontend Setup (`frontend/`)

Navigate to the `frontend/` directory and create a file named `.env` (or `.env.local` depending on your React setup):

```bash
cd frontend
touch .env
```

Paste the following to link the frontend to your local backend server:

```ini
# Point to the local FastAPI server
BACKEND_API=http://127.0.0.1:8000/api/v1
# Note: If using Vite, you might need to prefix with VITE_ like: VITE_BACKEND_API
```

**After saving the file:**
Restart your frontend server:

```bash
npm run dev
```

-----

## 🛑 Security Warning

**NEVER commit these `.env` files to GitHub.**
Ensure your `.gitignore` file includes the following lines to prevent accidental leaks of your keys:

```gitignore
.env
.env.local
.DS_Store
__pycache__/
```

1.  Ensure you have an `.env` file in the `backend/` directory.
2.  Verify your AWS credentials (Access Key & Secret Key) are valid and not expired.
3.  Restart the backend server after changing `.env` files.
 
