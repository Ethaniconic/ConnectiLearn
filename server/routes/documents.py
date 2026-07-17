from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Body, Path as FastAPIPath
from bson import ObjectId
from pypdf import PdfReader
from groq import Groq
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import settings
from ..db import documents_collection, users_collection
from ..routes.auth import get_current_user
import os
import shutil
import base64

router = APIRouter(prefix="/documents", tags=["documents"])
groq_client = Groq(api_key=settings.groq_api_key)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper to describe image via Groq Vision
def describe_image_via_groq(file_path: str) -> str:
    try:
        ext = os.path.splitext(file_path)[1].lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".bmp": "image/bmp",
            ".tiff": "image/tiff"
        }
        mime = mime_map.get(ext, "image/jpeg")
        
        with open(file_path, "rb") as image_file:
            encoded_image = base64.b64encode(image_file.read()).decode("utf-8")
            
        completion = groq_client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this educational diagram or image in detail. Extract any text, labels, charts, flowcharts, or structured information. Formulate the response as clear markdown text so that a learning assistant can index it for search."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime};base64,{encoded_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.2,
            max_tokens=2048
        )
        return completion.choices[0].message.content
    except Exception as e:
        print("Groq Vision API failed:", str(e))
        return f"[Visual Document: Description generation failed. Error: {str(e)}]"

# Helper to extract text from file
async def extract_text(filepath: str, ext: str) -> str:
    if ext == ".pdf":
        text_content = []
        try:
            reader = PdfReader(filepath)
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                image_texts = []
                
                # Extract and describe any images on the current page
                if getattr(page, "images", None):
                    for img_idx, img_obj in enumerate(page.images):
                        try:
                            temp_name = f"temp_pdf_{int(datetime.utcnow().timestamp())}_{page_idx}_{img_idx}.png"
                            temp_path = os.path.join(UPLOAD_DIR, temp_name)
                            with open(temp_path, "wb") as img_file:
                                img_file.write(img_obj.data)
                            
                            desc = describe_image_via_groq(temp_path)
                            if desc:
                                image_texts.append(f"\n[Page {page_idx+1} Image {img_idx+1} Description: {desc}]\n")
                                
                            if os.path.exists(temp_path):
                                os.remove(temp_path)
                        except Exception as img_err:
                            print(f"Failed to extract image {img_idx} on page {page_idx}: {img_err}")
                
                combined = page_text
                if image_texts:
                    combined += "\n" + "\n".join(image_texts)
                if combined.strip():
                    text_content.append(combined)
                    
            return "\n".join(text_content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")
    
    elif ext == ".txt":
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read text file: {str(e)}")
            
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]:
        # Cloud-based vision description
        return describe_image_via_groq(filepath)
        
    return ""

def get_text_chunks(text: str) -> list:
    if not text:
        return []
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len
    )
    docs = splitter.split_text(text)
    chunks = []
    for idx, doc_text in enumerate(docs):
        chunks.append({
            "text": doc_text,
            "index": idx,
            "wordCount": len(doc_text.split())
        })
    return chunks

# Helper to serialize doc response
def make_document_response(doc: dict) -> dict:
    return {
        "_id": str(doc["_id"]),
        "filename": doc["filename"],
        "originalName": doc["originalName"],
        "filepath": doc["filepath"],
        "fileType": doc["fileType"],
        "size": doc["size"],
        "wordCount": doc.get("wordCount", 0),
        "status": doc.get("status", "ready"),
        "isCompleted": doc.get("isCompleted", False),
        "createdAt": doc["createdAt"].isoformat() if isinstance(doc["createdAt"], datetime) else doc["createdAt"]
    }

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    allowed = [".pdf", ".txt", ".png", ".jpg", ".jpeg", ".bmp", ".tiff"]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type")
        
    # Save file to disk
    safe_filename = f"{int(datetime.utcnow().timestamp())}-{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Get file stats
    file_size = os.path.getsize(filepath)
    
    # Process text content
    content = await extract_text(filepath, ext)
    chunks = get_text_chunks(content)
    word_count = len(content.split()) if content else 0
    
    new_doc = {
        "filename": safe_filename,
        "originalName": file.filename,
        "filepath": filepath,
        "content": content,
        "chunks": chunks,
        "userId": current_user["_id"],
        "fileType": ext,
        "size": file_size,
        "wordCount": word_count,
        "status": "ready",
        "isCompleted": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    res = await documents_collection.insert_one(new_doc)
    new_doc["_id"] = res.inserted_id
    
    # Increment documentsCount for user
    await users_collection.update_one({"_id": current_user["_id"]}, {"$inc": {"documentsCount": 1}})
    
    return {
        "message": "Document uploaded successfully",
        "document": make_document_response(new_doc)
    }

@router.get("")
async def get_documents(current_user: dict = Depends(get_current_user)):
    cursor = documents_collection.find({"userId": current_user["_id"]}).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)
    return {
        "documents": [make_document_response(d) for d in docs]
    }

@router.delete("/{id}")
async def delete_document(id: str = FastAPIPath(...), current_user: dict = Depends(get_current_user)):
    doc = await documents_collection.find_one({"_id": ObjectId(id), "userId": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Unlink file
    if os.path.exists(doc["filepath"]):
        try:
            os.remove(doc["filepath"])
        except Exception as e:
            print(f"Failed to delete file from disk: {str(e)}")
            
    await documents_collection.delete_one({"_id": ObjectId(id)})
    
    # Decrement documentsCount for user
    await users_collection.update_one({"_id": current_user["_id"]}, {"$inc": {"documentsCount": -1}})
    
    return {"message": "Document deleted"}

@router.put("/{id}/complete")
async def toggle_complete(id: str = FastAPIPath(...), current_user: dict = Depends(get_current_user)):
    doc = await documents_collection.find_one({"_id": ObjectId(id), "userId": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    new_val = not doc.get("isCompleted", False)
    await documents_collection.update_one(
        {"_id": ObjectId(id)}, 
        {"$set": {"isCompleted": new_val, "updatedAt": datetime.utcnow()}}
    )
    doc["isCompleted"] = new_val
    return {
        "message": f"Document marked as {'completed' if new_val else 'incomplete'}",
        "document": make_document_response(doc)
    }
