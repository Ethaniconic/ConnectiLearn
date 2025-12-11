# 🎓 Smart Learning AI

A minimal yet powerful AI-powered learning assistant that uses RAG (Retrieval Augmented Generation) to help you learn from your documents. Upload PDFs, images, handwritten notes, and get instant AI-powered answers!

## ✨ Features

- 📄 **Multi-format Support**: Upload PDFs, images (PNG, JPG, JPEG, BMP, TIFF), and text files
- ✍️ **Handwritten Notes**: OCR technology extracts text from handwritten notes
- 🤖 **AI-Powered Q&A**: Ask questions and get intelligent answers from your documents
- 💾 **Vector Search**: Fast semantic search using ChromaDB
- 💬 **Chat History**: Maintains conversation context for better answers
- 🎨 **Beautiful UI**: Clean, modern interface with drag-and-drop upload
- 🆓 **100% Free**: Uses Groq's free API (no paid services)

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Tesseract OCR (for handwritten notes)

### Installation

1. **Clone or download this project**

2. **Install Tesseract OCR** (required for image text extraction):

   **Windows:**
   - Download from: https://github.com/UB-Mannheim/tesseract/wiki
   - Install and add to PATH
   - Or use: `choco install tesseract` (if you have Chocolatey)

   **macOS:**
   ```bash
   brew install tesseract
   ```

   **Linux:**
   ```bash
   sudo apt-get install tesseract-ocr
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Get your free Groq API key**:
   - Visit: https://console.groq.com
   - Sign up (free)
   - Create an API key
   - Copy `.env.example` to `.env`
   - Add your API key to `.env`:
     ```
     GROQ_API_KEY=your_api_key_here
     ```

5. **Run the application**:
   ```bash
   python main.py
   ```

6. **Open your browser**:
   - Navigate to: http://localhost:8000
   - Start uploading documents and asking questions!

## 📖 Usage

1. **Upload Documents**:
   - Click the upload area or drag & drop files
   - Supports: PDF, TXT, PNG, JPG, JPEG, BMP, TIFF
   - Wait for processing to complete

2. **Ask Questions**:
   - Type your question in the chat input
   - Press Enter or click Send
   - Get AI-powered answers based on your documents

3. **Manage Documents**:
   - View all uploaded documents in the left panel
   - Delete documents you no longer need
   - Clear chat history to start fresh

## 🏗️ Project Structure

```
Connectilearn/
├── main.py                 # FastAPI application & API endpoints
├── document_processor.py   # Document processing & vector storage
├── ai_assistant.py        # AI integration (Groq)
├── requirements.txt       # Python dependencies
├── .env                   # API keys (create from .env.example)
├── .env.example          # Template for environment variables
├── .gitignore            # Git ignore rules
├── static/
│   └── index.html        # Frontend UI
├── uploads/              # Uploaded files (auto-created)
└── chroma_db/            # Vector database (auto-created)
```

## 🔧 API Endpoints

- `GET /` - Main web interface
- `POST /upload` - Upload and process documents
- `POST /query` - Ask questions about documents
- `GET /documents` - List all documents
- `DELETE /documents/{doc_id}` - Delete a document
- `POST /clear-history` - Clear chat history
- `GET /history` - Get chat history
- `GET /health` - Health check

## 🎯 Tech Stack

- **Backend**: FastAPI (Python)
- **AI Model**: Groq (Llama 3.1 8B) - Free & Fast
- **Vector DB**: ChromaDB
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **OCR**: Tesseract
- **PDF Processing**: PyPDF2
- **Frontend**: Vanilla HTML/CSS/JavaScript

## 🌟 Cherry-on-Top Features

- ✅ Drag & drop file upload
- ✅ Chat history with context awareness
- ✅ Document management (view/delete)
- ✅ Real-time status updates
- ✅ Responsive design
- ✅ Beautiful gradient UI
- ✅ Loading animations
- ✅ Error handling

## 🤝 Contributing

Feel free to fork, improve, and submit pull requests!

## 📝 License

MIT License - Feel free to use this project however you'd like!

## 🆘 Troubleshooting

**"Tesseract not found" error:**
- Make sure Tesseract is installed and in your PATH
- On Windows, you might need to add Tesseract to system PATH manually

**"GROQ_API_KEY not found" error:**
- Create a `.env` file from `.env.example`
- Add your Groq API key to the `.env` file

**Port 8000 already in use:**
- Change the port in `main.py`: `uvicorn.run(app, host="0.0.0.0", port=8001)`

## 💡 Tips

- For best results with handwritten notes, ensure good lighting and contrast
- PDFs work best when they contain selectable text
- Ask specific questions for more accurate answers
- Upload related documents together for better context

---

Made with ❤️ for learners everywhere!
