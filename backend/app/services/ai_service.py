"""
AI Service for interacting with OpenAI API
"""

import os
from typing import List, Dict
from openai import OpenAI


class AIService:
    """Service for AI chat completions using OpenAI-compatible API"""
    
    def __init__(self):
        """Initialize OpenAI-compatible client (supports aimlapi.com and others)"""
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model_name = os.getenv("MODEL_NAME", "gpt-3.5-turbo")
        
        if not api_key or api_key == "your_openai_api_key_here":
            print("WARNING: OPENAI_API_KEY not set. Please add it to .env file")
            print("The chatbot will use mock responses until a valid API key is provided.")
            self.client = None
        else:
            # Initialize with custom base URL (for aimlapi.com or other providers)
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            print(f"✅ AI Service initialized with base URL: {base_url}")
        
        self.model = model_name
    
    def generate_response(self, user_message: str, context: List[Dict] = None) -> str:
        """
        Generate AI response with optional context from RAG
        
        Args:
            user_message: User's message/question
            context: Retrieved context from vector database
            
        Returns:
            AI-generated response
        """
        # Handle case when API key is not set
        if not self.client:
            return self._mock_response(user_message, context)
        
        # Build system prompt with context
        system_prompt = self._build_system_prompt(context)
        
        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    def _build_system_prompt(self, context: List[Dict] = None) -> str:
        """
        Build system prompt with context
        
        Args:
            context: Retrieved context from vector database
            
        Returns:
            System prompt string
        """
        base_prompt = """You are ConnectiLearn, an AI learning companion designed to help students learn more effectively. 
You are knowledgeable, patient, and encouraging. Always provide clear, accurate, and helpful responses."""
        
        if context and len(context) > 0:
            context_text = "\n\n".join([
                f"From {doc['filename']}:\n{doc['text']}"
                for doc in context
            ])
            
            return f"""{base_prompt}

You have access to the following information from the user's uploaded materials:

{context_text}

Use this context to provide accurate, relevant answers. If the question cannot be answered using the provided context, 
you can use your general knowledge but mention that the information is not from their uploaded materials."""
        
        return base_prompt
    
    def _mock_response(self, user_message: str, context: List[Dict] = None) -> str:
        """
        Generate mock response when API key is not available
        
        Args:
            user_message: User's message
            context: Retrieved context
            
        Returns:
            Mock response
        """
        response = f"I received your question: '{user_message}'\n\n"
        
        if context and len(context) > 0:
            response += "I found relevant information in your uploaded materials:\n\n"
            for doc in context[:2]:
                response += f"From {doc['filename']}: {doc['text'][:200]}...\n\n"
            
            response += "Note: This is a demo response. Please add your OPENAI_API_KEY to the .env file for actual AI responses."
        else:
            response += "I don't have any uploaded materials to reference yet. Please upload some study materials first!\n\n"
            response += "Note: This is a demo response. Please add your OPENAI_API_KEY to the .env file for actual AI responses."
        
        return response


# Global AI service instance
ai_service = AIService()
