"""
Documents management route handler
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import DocumentResponse
from app.services.rag_service import rag_service

router = APIRouter()


@router.get("/documents", response_model=List[str])
async def get_documents():
    """
    Get list of all uploaded documents
    
    Returns:
        List of document filenames
    """
    try:
        return rag_service.get_all_filenames()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")


@router.delete("/documents/{filename}", response_model=DocumentResponse)
async def delete_document(filename: str):
    """
    Delete a document from the knowledge base
    
    Args:
        filename: Name of the document to delete
        
    Returns:
        Deletion confirmation
    """
    try:
        # Check if document exists
        all_docs = rag_service.get_all_filenames()
        
        if filename not in all_docs:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete from vector database
        rag_service.delete_document(filename)
        
        return DocumentResponse(message=f"Document '{filename}' deleted successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")
