import uuid
from typing import List
from pathlib import Path
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import PyPDF2
from PIL import Image
import pytesseract

class DocumentProcessor:
    def __init__(self, upload_dir: str = "uploads", db_dir: str = "chroma_db"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)
        
        self.db_dir = Path(db_dir)
        self.db_dir.mkdir(exist_ok=True)
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(
            path=str(self.db_dir),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Get or create collection
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
    
    def extract_text_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
        return text
    
    def extract_text_from_image(self, file_path: Path) -> str:
        """Extract text from image using OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            return text
        except Exception as e:
            print(f"Error extracting image text: {e}")
            return ""
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
        
        return chunks
    
    async def process_document(self, file_path: Path, filename: str) -> dict:
        """Process uploaded document and store in vector database"""
        # Extract text based on file type
        file_ext = file_path.suffix.lower()
        
        if file_ext == '.pdf':
            text = self.extract_text_from_pdf(file_path)
        elif file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
            text = self.extract_text_from_image(file_path)
        elif file_ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        else:
            return {"error": f"Unsupported file type: {file_ext}"}
        
        if not text.strip():
            return {"error": "No text could be extracted from the document"}
        
        # Chunk the text
        chunks = self.chunk_text(text)
        
        # Generate embeddings and store in ChromaDB
        doc_id = str(uuid.uuid4())
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{i}"
            embedding = self.embedding_model.encode(chunk).tolist()
            
            self.collection.add(
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{
                    "filename": filename,
                    "doc_id": doc_id,
                    "chunk_index": i
                }],
                ids=[chunk_id]
            )
        
        return {
            "doc_id": doc_id,
            "filename": filename,
            "chunks_created": len(chunks),
            "text_length": len(text)
        }
    
    def search_documents(self, query: str, n_results: int = 5) -> List[dict]:
        """Search for relevant document chunks"""
        query_embedding = self.embedding_model.encode(query).tolist()
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        contexts = []
        for i, doc in enumerate(results['documents'][0]):
            contexts.append({
                "text": doc,
                "metadata": results['metadatas'][0][i],
                "distance": results['distances'][0][i] if 'distances' in results else None
            })
        
        return contexts
    
    def list_documents(self) -> List[dict]:
        """List all processed documents"""
        results = self.collection.get()
        
        # Group by document
        docs = {}
        for metadata in results['metadatas']:
            doc_id = metadata.get('doc_id')
            if doc_id and doc_id not in docs:
                docs[doc_id] = {
                    "doc_id": doc_id,
                    "filename": metadata.get('filename'),
                    "chunks": 0
                }
            if doc_id:
                docs[doc_id]['chunks'] += 1
        
        return list(docs.values())
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and its chunks"""
        try:
            # Get all chunks for this document
            results = self.collection.get(where={"doc_id": doc_id})
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                return True
            return False
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
