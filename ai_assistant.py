import os
from typing import List
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class AIAssistant:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.1-8b-instant"  # Free, fast model
        self.chat_history = []
    
    def generate_answer(self, query: str, contexts: List[dict], use_history: bool = True) -> str:
        """Generate answer using RAG approach"""
        
        # Build context from retrieved documents
        context_text = "\n\n".join([
            f"Document: {ctx['metadata']['filename']}\n{ctx['text']}"
            for ctx in contexts
        ])
        
        # Build system prompt
        system_prompt = """You are a helpful AI learning assistant. Answer questions based on the provided context from the user's documents.
If the answer is not in the context, say so politely and provide general guidance if possible.
Be concise but thorough. Use bullet points for clarity when appropriate."""
        
        # Build user message
        user_message = f"""Context from documents:
{context_text}

Question: {query}

Please answer the question based on the context provided above."""
        
        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add chat history if enabled
        if use_history and self.chat_history:
            messages.extend(self.chat_history[-6:])  # Last 3 exchanges
        
        messages.append({"role": "user", "content": user_message})
        
        # Generate response
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024
            )
            
            answer = response.choices[0].message.content
            
            # Update chat history
            if use_history:
                self.chat_history.append({"role": "user", "content": query})
                self.chat_history.append({"role": "assistant", "content": answer})
            
            return answer
        
        except Exception as e:
            return f"Error generating response: {str(e)}"
    
    def clear_history(self):
        """Clear chat history"""
        self.chat_history = []
    
    def get_history(self) -> List[dict]:
        """Get chat history"""
        return self.chat_history
