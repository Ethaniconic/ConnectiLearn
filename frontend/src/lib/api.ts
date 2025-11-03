/**
 * API service for communicating with the backend
 */

const API_BASE_URL = '/api';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  context_used: string[];
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

/**
 * Upload a file to the backend for RAG processing
 */
export async function uploadFile(file: File): Promise<{ message: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

/**
 * Get all uploaded documents
 */
export async function getDocuments(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/documents`);

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  return response.json();
}

/**
 * Delete a document
 */
export async function deleteDocument(filename: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/documents/${filename}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete document');
  }

  return response.json();
}
