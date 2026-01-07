import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'

function Learn() {
  const [mode, setMode] = useState('visual')
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [currentCard, setCurrentCard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [quiz, setQuiz] = useState([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [quizComplete, setQuizComplete] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [summary, setSummary] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data.documents || [])
    } catch (err) {
      console.error(err)
    }
  }

  const generateFlashcards = async () => {
    if (!selectedDoc) return
    setLoading(true)
    try {
      const res = await api.post('/learn/flashcards', { documentId: selectedDoc })
      setFlashcards(res.data.flashcards || [])
      setCurrentCard(0)
      setFlipped(false)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const generateQuiz = async () => {
    if (!selectedDoc) return
    setLoading(true)
    try {
      const res = await api.post('/learn/quiz', { documentId: selectedDoc })
      setQuiz(res.data.questions || [])
      setQuizIndex(0)
      setScore(0)
      setQuizComplete(false)
      setSelectedAnswer(null)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const generateSummary = async () => {
    if (!selectedDoc) return
    setLoading(true)
    try {
      const res = await api.post('/learn/summary', { documentId: selectedDoc })
      setSummary(res.data.summary || '')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        setTranscript(transcript)
      }
      
      recognitionRef.current.onend = () => setListening(false)
      recognitionRef.current.start()
      setListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
  }

  const nextCard = () => {
    setFlipped(false)
    setCurrentCard(prev => (prev + 1) % flashcards.length)
  }

  const prevCard = () => {
    setFlipped(false)
    setCurrentCard(prev => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(index)
    if (index === quiz[quizIndex].correct) {
      setScore(prev => prev + 1)
    }
  }

  const nextQuestion = () => {
    if (quizIndex < quiz.length - 1) {
      setQuizIndex(prev => prev + 1)
      setSelectedAnswer(null)
    } else {
      setQuizComplete(true)
    }
  }

  const restartQuiz = () => {
    setQuizIndex(0)
    setScore(0)
    setQuizComplete(false)
    setSelectedAnswer(null)
  }

  return (
    <div className="learn-page">
      <div className="page-header">
        <h1 className="page-title">Learn</h1>
      </div>

      <div className="learn-modes">
        <button 
          className={`learn-mode-btn ${mode === 'visual' ? 'active' : ''}`}
          onClick={() => setMode('visual')}
        >
          👁️ Visual
        </button>
        <button 
          className={`learn-mode-btn ${mode === 'auditory' ? 'active' : ''}`}
          onClick={() => setMode('auditory')}
        >
          🎧 Auditory
        </button>
        <button 
          className={`learn-mode-btn ${mode === 'kinesthetic' ? 'active' : ''}`}
          onClick={() => setMode('kinesthetic')}
        >
          ✋ Kinesthetic
        </button>
      </div>

      <div className="learn-content">
        <div className="document-selector card">
          <h3>Select Document</h3>
          <select 
            className="input"
            value={selectedDoc || ''}
            onChange={(e) => setSelectedDoc(e.target.value)}
          >
            <option value="">Choose a document...</option>
            {documents.map(doc => (
              <option key={doc._id} value={doc._id}>{doc.originalName}</option>
            ))}
          </select>
        </div>

        {mode === 'visual' && (
          <div className="visual-mode">
            <div className="mode-actions">
              <button 
                className="btn" 
                onClick={generateFlashcards}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Generating...' : '🎴 Generate Flashcards'}
              </button>
            </div>

            {flashcards.length > 0 && (
              <div className="flashcard-container">
                <div className="flashcard-progress">
                  Card {currentCard + 1} of {flashcards.length}
                </div>
                <div 
                  className={`flashcard ${flipped ? 'flipped' : ''}`}
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <span className="flashcard-label">Question</span>
                      <p>{flashcards[currentCard]?.front}</p>
                      <span className="flashcard-hint">Click to flip</span>
                    </div>
                    <div className="flashcard-back">
                      <span className="flashcard-label">Answer</span>
                      <p>{flashcards[currentCard]?.back}</p>
                      <span className="flashcard-hint">Click to flip</span>
                    </div>
                  </div>
                </div>
                <div className="flashcard-nav">
                  <button className="btn btn-secondary" onClick={prevCard}>← Previous</button>
                  <button className="btn btn-secondary" onClick={nextCard}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'auditory' && (
          <div className="auditory-mode">
            <div className="mode-actions">
              <button 
                className="btn" 
                onClick={generateSummary}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Generating...' : '📝 Generate Audio Summary'}
              </button>
            </div>

            {summary && (
              <div className="audio-summary card">
                <div className="audio-controls">
                  {!speaking ? (
                    <button className="btn" onClick={() => speakText(summary)}>
                      🔊 Play Summary
                    </button>
                  ) : (
                    <button className="btn btn-secondary" onClick={stopSpeaking}>
                      ⏹️ Stop
                    </button>
                  )}
                </div>
                <div className="summary-text">
                  <h4>Summary</h4>
                  <p>{summary}</p>
                </div>
              </div>
            )}

            <div className="voice-input card">
              <h4>🎙️ Voice Input</h4>
              <p>Ask questions using your voice</p>
              <div className="voice-controls">
                {!listening ? (
                  <button className="btn" onClick={startListening}>
                    🎤 Start Recording
                  </button>
                ) : (
                  <button className="btn btn-secondary recording" onClick={stopListening}>
                    ⏹️ Stop Recording
                  </button>
                )}
              </div>
              {transcript && (
                <div className="transcript">
                  <strong>You said:</strong> {transcript}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'kinesthetic' && (
          <div className="kinesthetic-mode">
            <div className="mode-actions">
              <button 
                className="btn" 
                onClick={generateQuiz}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Generating...' : '📝 Generate Quiz'}
              </button>
            </div>

            {quiz.length > 0 && !quizComplete && (
              <div className="quiz-container card">
                <div className="quiz-progress">
                  <div className="quiz-progress-bar">
                    <div 
                      className="quiz-progress-fill"
                      style={{ width: `${((quizIndex + 1) / quiz.length) * 100}%` }}
                    />
                  </div>
                  <span>Question {quizIndex + 1} of {quiz.length}</span>
                </div>
                
                <div className="quiz-question">
                  <h3>{quiz[quizIndex]?.question}</h3>
                </div>
                
                <div className="quiz-options">
                  {quiz[quizIndex]?.options.map((option, index) => (
                    <button
                      key={index}
                      className={`quiz-option ${
                        selectedAnswer !== null
                          ? index === quiz[quizIndex].correct
                            ? 'correct'
                            : index === selectedAnswer
                            ? 'incorrect'
                            : ''
                          : ''
                      }`}
                      onClick={() => handleAnswer(index)}
                      disabled={selectedAnswer !== null}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {selectedAnswer !== null && (
                  <div className="quiz-feedback">
                    {selectedAnswer === quiz[quizIndex].correct ? (
                      <p className="correct-feedback">✅ Correct!</p>
                    ) : (
                      <p className="incorrect-feedback">
                        ❌ Incorrect. The answer was: {quiz[quizIndex].options[quiz[quizIndex].correct]}
                      </p>
                    )}
                    <button className="btn" onClick={nextQuestion}>
                      {quizIndex < quiz.length - 1 ? 'Next Question →' : 'See Results'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {quizComplete && (
              <div className="quiz-results card">
                <h2>🎉 Quiz Complete!</h2>
                <div className="score-display">
                  <div className="score-circle">
                    <span className="score-number">{score}</span>
                    <span className="score-total">/ {quiz.length}</span>
                  </div>
                  <p className="score-percentage">
                    {Math.round((score / quiz.length) * 100)}% Correct
                  </p>
                </div>
                <div className="score-message">
                  {score === quiz.length && <p>🌟 Perfect Score! Amazing!</p>}
                  {score >= quiz.length * 0.7 && score < quiz.length && <p>👏 Great job! Keep it up!</p>}
                  {score >= quiz.length * 0.5 && score < quiz.length * 0.7 && <p>📚 Good effort! Review and try again.</p>}
                  {score < quiz.length * 0.5 && <p>💪 Keep practicing! You'll get better.</p>}
                </div>
                <button className="btn" onClick={restartQuiz}>Try Again</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Learn
