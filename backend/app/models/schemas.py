"""
Data models for ConnectiLearn API
"""

from pydantic import BaseModel
from typing import List, Optional


class ChatMessage(BaseModel):
    """Model for chat messages"""
    message: str


class ChatResponse(BaseModel):
    """Model for chat responses"""
    response: str
    context_used: List[str] = []


class UploadResponse(BaseModel):
    """Model for file upload responses"""
    message: str
    filename: str


class DocumentResponse(BaseModel):
    """Model for document responses"""
    message: str
