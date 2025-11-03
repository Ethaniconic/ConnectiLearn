# ConnectiLearn Quick Start Guide

## First Time Setup

### 1. Install Backend Dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```powershell
cd backend
copy .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

## Running the Application

### Terminal 1 - Backend

```powershell
cd backend
.\venv\Scripts\activate
python app/main.py
```

Backend runs at: http://localhost:8000

### Terminal 2 - Frontend

```powershell
cd frontend
npm run dev
```

Frontend runs at: http://localhost:3000

## First Steps

1. Open http://localhost:3000 in your browser
2. Navigate to "Notes" and upload a PDF or text file
3. Go to "Chat" and ask questions about your uploaded materials
4. Enjoy your AI learning companion!

## Common Commands

### Backend
- Start: `python app/main.py`
- Install package: `pip install package-name`
- View API docs: http://localhost:8000/docs

### Frontend
- Development: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Need Help?

Check the main README.md for detailed documentation and troubleshooting.
