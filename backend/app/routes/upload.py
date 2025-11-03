"""
File upload route handler
"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from PyPDF2 import PdfReader
from io import BytesIO
from app.models.schemas import UploadResponse
from app.services.rag_service import rag_service

router = APIRouter()

# Directory to store uploaded files
UPLOAD_DIR = "storage/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and process a file (PDF or text)
    
    Args:
        file: Uploaded file
        
    Returns:
        Upload confirmation with filename
    """
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in ['.pdf', '.txt']:
            raise HTTPException(
                status_code=400,
                detail="Only PDF and text files are supported"
            )
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        if file_ext == '.pdf':
            text = extract_text_from_pdf(content)
        else:  # .txt
            text = content.decode('utf-8')
        
        # Add to vector database
        rag_service.add_document(file.filename, text)
        
        # Save original file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, 'wb') as f:
            f.write(content)
        
        return UploadResponse(
            message="File uploaded successfully",
            filename=file.filename
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


def extract_text_from_pdf(pdf_content: bytes) -> str:
    """
    Extract text from PDF content
    
    Args:
        pdf_content: PDF file content as bytes
        
    Returns:
        Extracted text
    """
    try:
        pdf_file = BytesIO(pdf_content)
        pdf_reader = PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n\n"
        
        return text.strip()
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")
