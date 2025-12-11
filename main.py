from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import uuid
from typing import List, Optional

from document_processor import DocumentProcessor
from ai_assistant import AIAssistant

app = FastAPI(title="Smart Learning AI", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services (lazy loading)
doc_processor = None
ai_assistant = None

# Mount static files
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Helper to get or initialize services
def get_doc_processor():
    global doc_processor
    if doc_processor is None:
        doc_processor = DocumentProcessor()
    return doc_processor

def get_ai_assistant():
    global ai_assistant
    if ai_assistant is None:
        ai_assistant = AIAssistant()
    return ai_assistant

# Pydantic models
class QueryRequest(BaseModel):
    query: str
    n_results: Optional[int] = 5
    use_history: Optional[bool] = True

class QueryResponse(BaseModel):
    answer: str
    contexts: List[dict]
    query: str

@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main page"""
    html_file = Path("static/index.html")
    if html_file.exists():
        return html_file.read_text(encoding='utf-8')
    return "<h1>Smart Learning AI</h1><p>Please create static/index.html</p>"

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document"""
    try:
        processor = get_doc_processor()
        # Validate file type
        allowed_extensions = {'.pdf', '.txt', '.png', '.jpg', '.jpeg', '.bmp', '.tiff'}
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_path = processor.upload_dir / f"{file_id}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process document
        result = await processor.process_document(file_path, file.filename)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return JSONResponse(content={
            "message": "Document uploaded and processed successfully",
            "data": result
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Query documents and get AI-generated answer"""
    try:
        processor = get_doc_processor()
        assistant = get_ai_assistant()
        
        # Search for relevant contexts
        contexts = processor.search_documents(
            request.query,
            n_results=request.n_results
        )
        
        if not contexts:
            return QueryResponse(
                answer="No documents found. Please upload some documents first.",
                contexts=[],
                query=request.query
            )
        
        # Generate answer using AI
        answer = assistant.generate_answer(
            request.query,
            contexts,
            use_history=request.use_history
        )
        
        return QueryResponse(
            answer=answer,
            contexts=contexts,
            query=request.query
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents():
    """List all processed documents"""
    try:
        processor = get_doc_processor()
        documents = processor.list_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    try:
        processor = get_doc_processor()
        success = processor.delete_document(doc_id)
        if success:
            return {"message": "Document deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear-history")
async def clear_chat_history():
    """Clear chat history"""
    try:
        assistant = get_ai_assistant()
        assistant.clear_history()
        return {"message": "Chat history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
async def get_chat_history():
    """Get chat history"""
    try:
        assistant = get_ai_assistant()
        history = assistant.get_history()
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Smart Learning AI is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
