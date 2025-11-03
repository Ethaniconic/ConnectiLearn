# ConnectiLearn - AI Learning Companion

An intelligent learning platform powered by AI with Retrieval-Augmented Generation (RAG) capabilities. ConnectiLearn helps students learn more effectively by providing context-aware answers based on their uploaded study materials.

![ConnectiLearn](https://img.shields.io/badge/AI-Learning%20Companion-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178c6)

## ✨ Features

- 🤖 **AI Chat Assistant**: Intelligent conversational AI powered by OpenAI GPT
- 📚 **RAG Technology**: Retrieval-Augmented Generation for accurate, context-aware responses
- 📄 **File Upload**: Support for PDF and text file uploads
- 🔍 **Vector Search**: FAISS-powered semantic search through uploaded materials
- 🎨 **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- 🌓 **Dark/Light Mode**: Customizable theme with Shadcn UI components
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Routing**: React Router v6
- **Build Tool**: Vite

### Backend
- **Framework**: FastAPI (Python)
- **AI Provider**: OpenAI API
- **Vector Database**: FAISS
- **Embeddings**: Sentence Transformers
- **PDF Processing**: PyPDF2

## 📁 Project Structure

```
ConnectiLearn/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # Shadcn UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Notes.tsx
│   │   │   └── Settings.tsx
│   │   ├── lib/            # Utilities
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── routes/         # API route handlers
│   │   │   ├── chat.py
│   │   │   ├── upload.py
│   │   │   └── documents.py
│   │   ├── services/       # Business logic
│   │   │   ├── rag_service.py
│   │   │   └── ai_service.py
│   │   ├── models/         # Data models
│   │   │   └── schemas.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **OpenAI API Key** (or compatible LLM provider)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd ConnectiLearn
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
copy .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=your_actual_api_key_here
```

#### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Running the Application

#### Start Backend Server

```bash
# In the backend directory with virtual environment activated
cd backend
python app/main.py
```

The backend will start at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

#### Start Frontend Development Server

```bash
# In a new terminal, navigate to frontend directory
cd frontend
npm run dev
```

The frontend will start at `http://localhost:3000`

### Building for Production

#### Frontend

```bash
cd frontend
npm run build
```

The optimized build will be in the `frontend/dist` directory.

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=your_openai_api_key_here

# Server configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS settings
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Customization

- **Change AI Model**: Edit `app/services/ai_service.py` and modify the `self.model` variable
- **Adjust Chunk Size**: Modify `chunk_size` in `app/services/rag_service.py`
- **Theme Colors**: Edit `frontend/tailwind.config.js` and `frontend/src/index.css`

## 📖 API Endpoints

### Chat
- `POST /api/chat` - Send a message to the AI assistant
  - Request: `{ "message": "Your question" }`
  - Response: `{ "response": "AI answer", "context_used": ["file1.pdf"] }`

### Upload
- `POST /api/upload` - Upload a document (PDF or TXT)
  - Request: Multipart form data with file
  - Response: `{ "message": "Success", "filename": "document.pdf" }`

### Documents
- `GET /api/documents` - Get list of uploaded documents
  - Response: `["doc1.pdf", "doc2.txt"]`
- `DELETE /api/documents/{filename}` - Delete a document
  - Response: `{ "message": "Deleted successfully" }`

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:8000/health

# Upload a file
curl -X POST -F "file=@test.txt" http://localhost:8000/api/upload

# Send a chat message
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"What is machine learning?"}' \
  http://localhost:8000/api/chat
```

### Test Frontend

```bash
cd frontend
npm run lint
npm run build
```

## 🎯 Usage Guide

1. **Upload Study Materials**
   - Navigate to the "Notes" page
   - Click "Choose File" and select a PDF or text file
   - The file will be processed and added to your knowledge base

2. **Chat with AI**
   - Go to the "Chat" page
   - Type your question in the input field
   - The AI will search your uploaded materials and provide context-aware answers

3. **Manage Documents**
   - View all uploaded documents in the "Notes" page
   - Delete documents you no longer need

4. **Customize Appearance**
   - Visit the "Settings" page
   - Choose between Light, Dark, or System theme

## 🔐 Security Notes

- Never commit your `.env` file with actual API keys
- Use environment variables for sensitive configuration
- Implement rate limiting for production deployments
- Add authentication/authorization for multi-user scenarios

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Import errors
```bash
# Solution: Make sure virtual environment is activated and dependencies are installed
pip install -r requirements.txt
```

**Problem**: FAISS installation fails
```bash
# Solution: Try installing CPU version explicitly
pip install faiss-cpu
```

### Frontend Issues

**Problem**: Module not found errors
```bash
# Solution: Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Build fails
```bash
# Solution: Check TypeScript errors
npm run build -- --mode development
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for the GPT API
- FAISS by Facebook Research
- Shadcn UI for beautiful components
- React and FastAPI communities

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation at `/docs` endpoint
- Review the troubleshooting section

---

Built with ❤️ using React, TypeScript, FastAPI, and OpenAI
