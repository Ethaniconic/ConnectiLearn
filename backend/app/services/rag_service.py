"""
RAG (Retrieval-Augmented Generation) Service
Handles vector database operations and context retrieval
"""

import os
import json
from typing import List, Dict
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


class RAGService:
    """Service for managing RAG operations with FAISS vector database"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, storage_path: str = "storage"):
        if cls._instance is None:
            cls._instance = super(RAGService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, storage_path: str = "storage"):
        """
        Initialize RAG service
        
        Args:
            storage_path: Path to store vector database and documents
        """
        # Prevent re-initialization
        if self._initialized:
            return
            
        self.storage_path = storage_path
        self.vector_db_path = os.path.join(storage_path, "vector_db")
        self.documents_path = os.path.join(storage_path, "documents.json")
        
        # Create storage directories
        os.makedirs(self.vector_db_path, exist_ok=True)
        
        # Initialize sentence transformer for embeddings (lazy loading)
        self.model = None
        self.dimension = 384  # Dimension of all-MiniLM-L6-v2 embeddings
        
        # Initialize or load FAISS index
        self.index = self._load_or_create_index()
        
        # Load documents metadata
        self.documents = self._load_documents()
        
        self._initialized = True
    
    def _ensure_model_loaded(self):
        """Lazy load the sentence transformer model"""
        if self.model is None:
            print("Loading sentence transformer model...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Model loaded successfully!")
    
    def _load_or_create_index(self) -> faiss.Index:
        """Load existing FAISS index or create a new one"""
        index_file = os.path.join(self.vector_db_path, "index.faiss")
        
        if os.path.exists(index_file):
            return faiss.read_index(index_file)
        else:
            # Create new index using L2 distance
            return faiss.IndexFlatL2(self.dimension)
    
    def _save_index(self):
        """Save FAISS index to disk"""
        index_file = os.path.join(self.vector_db_path, "index.faiss")
        faiss.write_index(self.index, index_file)
    
    def _load_documents(self) -> List[Dict]:
        """Load documents metadata from JSON file"""
        if os.path.exists(self.documents_path):
            with open(self.documents_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def _save_documents(self):
        """Save documents metadata to JSON file"""
        with open(self.documents_path, 'w', encoding='utf-8') as f:
            json.dump(self.documents, f, indent=2, ensure_ascii=False)
    
    def add_document(self, filename: str, text: str):
        """
        Add a document to the vector database
        
        Args:
            filename: Name of the document file
            text: Content of the document
        """
        # Ensure model is loaded
        self._ensure_model_loaded()
        
        # Split text into chunks (simple chunking by paragraphs)
        chunks = self._chunk_text(text)
        
        # Generate embeddings for each chunk
        embeddings = self.model.encode(chunks)
        
        # Add to FAISS index
        start_idx = self.index.ntotal
        self.index.add(np.array(embeddings).astype('float32'))
        
        # Store document metadata
        for i, chunk in enumerate(chunks):
            self.documents.append({
                "filename": filename,
                "chunk_id": start_idx + i,
                "text": chunk
            })
        
        # Save index and documents
        self._save_index()
        self._save_documents()
    
    def _chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """
        Split text into chunks
        
        Args:
            text: Text to split
            chunk_size: Approximate size of each chunk in characters
            
        Returns:
            List of text chunks
        """
        # Split by paragraphs first
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) < chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks if chunks else [text]
    
    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        Search for relevant document chunks
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of relevant document chunks with metadata
        """
        if self.index.ntotal == 0:
            return []
        
        # Ensure model is loaded
        self._ensure_model_loaded()
        
        # Generate query embedding
        query_embedding = self.model.encode([query])
        
        # Search in FAISS index
        distances, indices = self.index.search(
            np.array(query_embedding).astype('float32'),
            min(top_k, self.index.ntotal)
        )
        
        # Retrieve document chunks
        results = []
        for idx in indices[0]:
            if idx < len(self.documents):
                results.append(self.documents[idx])
        
        return results
    
    def get_all_filenames(self) -> List[str]:
        """Get list of all uploaded filenames"""
        filenames = set()
        for doc in self.documents:
            filenames.add(doc["filename"])
        return sorted(list(filenames))
    
    def delete_document(self, filename: str):
        """
        Delete a document from the vector database
        
        Args:
            filename: Name of the document to delete
        """
        # Filter out documents with the given filename
        self.documents = [doc for doc in self.documents if doc["filename"] != filename]
        
        # Rebuild index from scratch
        if self.documents:
            # Ensure model is loaded
            self._ensure_model_loaded()
            
            texts = [doc["text"] for doc in self.documents]
            embeddings = self.model.encode(texts)
            
            # Create new index
            self.index = faiss.IndexFlatL2(self.dimension)
            self.index.add(np.array(embeddings).astype('float32'))
            
            # Update chunk IDs
            for i, doc in enumerate(self.documents):
                doc["chunk_id"] = i
        else:
            # Create empty index
            self.index = faiss.IndexFlatL2(self.dimension)
        
        # Save updated index and documents
        self._save_index()
        self._save_documents()


# Global RAG service instance
rag_service = RAGService()
