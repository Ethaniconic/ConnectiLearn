function About() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">About ConnectiLearn</h1>
      </div>
      <div className="card about-content">
        <p>
          ConnectiLearn is an AI-powered learning assistant that helps you learn from your documents.
          Upload PDFs, text files, or images and ask questions to get intelligent answers.
        </p>

        <h2>Features</h2>
        <ul>
          <li>Upload and process PDF documents</li>
          <li>Extract text from images using OCR</li>
          <li>AI-powered question answering</li>
          <li>Chat history for continuous learning</li>
          <li>Secure user authentication</li>
          <li>Dark/Light mode support</li>
        </ul>

        <h2>How to Use</h2>
        <ul>
          <li>Upload your study materials in the Uploads section</li>
          <li>Go to Chat and ask questions about your documents</li>
          <li>The AI will search through your documents and provide relevant answers</li>
        </ul>

        <h2>Technology Stack</h2>
        <ul>
          <li>Frontend: React with Vite</li>
          <li>Backend: Node.js with Express</li>
          <li>Database: MongoDB Atlas</li>
          <li>AI: Groq API with Llama 3.1</li>
        </ul>
      </div>
    </div>
  )
}

export default About
