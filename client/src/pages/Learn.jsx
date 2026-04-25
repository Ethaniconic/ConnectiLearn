import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import Loader from '../components/Loader'
import { Eye, Headphones, Hand, BookOpenText, Play, StopCircle, Mic, MicOff, Sparkles, Search, RefreshCcw, FastForward, Rewind, Volume2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

const styleToMode = {
  Visual: 'visual',
  Auditory: 'auditory',
  Kinesthetic: 'kinesthetic',
  ReadWrite: 'readwrite'
}

const modeIcons = {
  visual: <Eye size={18} />,
  auditory: <Headphones size={18} />,
  kinesthetic: <Hand size={18} />,
  readwrite: <BookOpenText size={18} />
}

function Learn() {
  const [mode, setMode] = useState('')
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
  const [recommendedStyle, setRecommendedStyle] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [mindmap, setMindmap] = useState(null)
  
  const [hypeMessage, setHypeMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const recognitionRef = useRef(null)
  const mindmapRef = useRef(null)
  
  // Podcast simulation states
  const [audioProgress, setAudioProgress] = useState(0)
  const [podcastTime, setPodcastTime] = useState('0:00')
  const progressInterval = useRef(null)

  useEffect(() => {
    if (speaking) {
      progressInterval.current = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval.current)
            return 100
          }
          return prev + 0.5
        })
      }, 500)
    } else {
      clearInterval(progressInterval.current)
    }
    return () => clearInterval(progressInterval.current)
  }, [speaking])

  useEffect(() => {
    const mins = Math.floor((audioProgress / 100) * 5)
    const secs = Math.floor(((audioProgress / 100) * 300) % 60)
    setPodcastTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`)
  }, [audioProgress])

  useEffect(() => {
    fetchDocuments()
    fetchHype()
  }, [])

  useEffect(() => {
    fetchRecommendations()
  }, [location.state])

  const fetchHype = async () => {
    try {
      const res = await api.get('/learn/hype')
      setHypeMessage(res.data?.message || '')
    } catch (err) {
      console.error('Failed to fetch Groq Hype Message', err)
    }
  }

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents')
      const docs = res.data.documents || []
      setDocuments(docs)
      
      // AUTO-SELECTION: If no doc is selected and we have docs, pick the newest one
      if (!selectedDoc && docs.length > 0) {
        setSelectedDoc(docs[0]._id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/recommendation/recommendations')
      const style = res.data?.learningStyle || ''
      
      // Use forcedMode if available in state, otherwise default to recommended style
      const forcedMode = location.state?.forcedMode
      const actionType = location.state?.actionType
      
      setRecommendedStyle(style)
      setRecommendations(res.data?.recommendations || [])
      
      if (forcedMode) {
        setMode(forcedMode)
        // SMART TRIGGER: If we have a selected doc and an action type, trigger the AI tool!
        if (selectedDoc && actionType) {
          triggerAction(actionType)
        }
      } else if (styleToMode[style]) {
        setMode(styleToMode[style])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const triggerAction = (type) => {
    if (type === 'flashcards') generateFlashcards()
    if (type === 'quiz') generateQuiz()
    if (type === 'summary') generateSummary()
    if (type === 'mindmap') generateMindmap()
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const query = searchQuery.toLowerCase().trim()
    const validModes = ['visual', 'auditory', 'kinesthetic', 'readwrite']
    
    // Normalize aliases
    let targetMode = query
    if (query.includes('read') || query.includes('write')) targetMode = 'readwrite'
    if (query === 'audio') targetMode = 'auditory'
    
    if (validModes.includes(targetMode)) {
      setMode(targetMode)
      setSearchError('')
      setSearchQuery('')
    } else {
      setSearchError('Mode not found. Try Visual, Auditory, ReadWrite, or Kinesthetic.')
    }
  }

  const resetToRecommended = () => {
    if (styleToMode[recommendedStyle]) {
      setMode(styleToMode[recommendedStyle])
      setSearchError('')
    }
  }

  const handleResetAnalysis = async () => {
    if (!confirm('This will clear your current learning style and take you back to the questionnaire. Continue?')) return
    try {
      const res = await api.post('/recommendation/reset')
      updateUser(res.data.user)
      navigate('/questionnaire')
    } catch (err) {
      console.error('Reset failed', err)
    }
  }

  const [error, setError] = useState('')
  
  const generateFlashcards = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    setFlashcards([])
    try {
      const res = await api.post('/learn/flashcards', { documentId: selectedDoc, mode })
      setFlashcards(res.data.flashcards || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate flashcards.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateQuiz = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    setQuiz([])
    try {
      const res = await api.post('/learn/quiz', { documentId: selectedDoc, mode })
      setQuiz(res.data.questions || [])
      setQuizIndex(0)
      setScore(0)
      setQuizComplete(false)
      setSelectedAnswer(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateSummary = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    setSummary('')
    try {
      const res = await api.post('/learn/summary', { documentId: selectedDoc, mode })
      setSummary(res.data.summary || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate summary.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateMindmap = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    setMindmap(null)
    try {
      const res = await api.post('/learn/mindmap', { documentId: selectedDoc, mode })
      setMindmap(res.data.mindmap || { central: "Central Concept", branches: [] })
      // Smooth scroll to results
      setTimeout(() => mindmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate mind map.')
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
      utterance.onstart = () => {
        setSpeaking(true)
        setAudioProgress(0)
      }
      utterance.onend = () => {
        setSpeaking(false)
        setAudioProgress(100)
      }
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
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Learn Hub</h1>
            {recommendedStyle && (
              <p className="page-subtitle" style={{ color: 'var(--primary)' }}>
                Locked natively to your recommended mode: <strong>{recommendedStyle}</strong>
              </p>
            )}
          </div>
          
          <form className="search-bar" onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input" 
                placeholder="Search other modes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', width: '250px' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary">Unlock</button>
            {mode !== styleToMode[recommendedStyle] && (
              <button type="button" className="btn" onClick={resetToRecommended} style={{ marginLeft: '5px' }}>
                Reset Mode
              </button>
            )}
            <button type="button" className="btn btn-danger" onClick={handleResetAnalysis} style={{ marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCcw size={16} /> Reset Analysis
            </button>
          </form>
        </div>
        
        {searchError && <p className="error-message" style={{ margin: 0, textAlign: 'right' }}>{searchError}</p>}

        {hypeMessage && (
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79, 134, 247, 0.1), rgba(37, 99, 235, 0.05))', border: '1px solid var(--primary)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-light)', marginBottom: '8px' }}>
              <Sparkles size={18} /> Global Leaderboard Status
            </h4>
            <p style={{ fontStyle: 'italic', color: 'var(--text-dark)' }}>"{hypeMessage}"</p>
          </div>
        )}
      </div>

      <div className="active-mode-indicator" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
        {modeIcons[mode]}
        <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9em' }}>Currently Active: {mode} Mode</h3>
      </div>

      {mode === styleToMode[recommendedStyle] && recommendations.length > 0 && (
        <div className="card recommendation-panel">
          <div className="recommendation-title">
            <Sparkles size={18} /> Exclusively Recommended For You
          </div>
          <div className="recommendation-list">
            {recommendations.slice(0, 2).map((item) => (
              <div 
                className="recommendation-item clickable-recommendation" 
                key={item.id}
                onClick={() => {
                  setMode(item.targetMode)
                  if (selectedDoc) triggerAction(item.actionType)
                }}
                style={{ 
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="recommendation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0 }}>{item.title}</h4>
                  <div className="recommendation-badge" style={{ 
                    fontSize: '0.65em', 
                    padding: '3px 8px', 
                    borderRadius: '50px', 
                    background: 'var(--bg-tertiary)', 
                    color: 'var(--primary)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    border: '1px solid rgba(79, 134, 247, 0.2)'
                  }}>{item.format}</div>
                </div>
                <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>{item.action}</p>
                <div className="recommendation-hover-overlay" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="learn-content">
        <div className="document-selector card">
          <h3>Select Document to Master</h3>
          <select 
            className="input"
            value={selectedDoc || ''}
            onChange={(e) => setSelectedDoc(e.target.value)}
            style={{ marginTop: '10px' }}
          >
            <option value="">Choose a document from your library...</option>
            {documents.map(doc => (
              <option key={doc._id} value={doc._id}>{doc.originalName}</option>
            ))}
          </select>
        </div>

        {loading && <Loader overlay message="Generating optimized content..." />}

        {error && (
          <div className="card error-alert" style={{ 
            background: 'rgba(239, 68, 68, 0.05)', 
            border: '1px solid var(--error)', 
            color: 'var(--error)',
            padding: '15px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9em',
            borderRadius: '12px'
          }}>
            <span style={{ fontSize: '1.2em' }}>⚠️</span>
            {error}
          </div>
        )}

        {mode === 'visual' && (
          <div className="visual-mode">
            <div className="mode-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button 
                className="btn btn-full" 
                onClick={generateFlashcards}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Processing...' : 'Visual Flashcards'}
              </button>
              <button 
                className="btn btn-full btn-secondary" 
                onClick={generateMindmap}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Mapping...' : 'Generate Mind Map'}
              </button>
            </div>

            <div ref={mindmapRef}>
              {mindmap && (
                <div className="card mindmap-display" style={{ 
                  marginTop: '25px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--primary)', 
                  borderRadius: '24px',
                  padding: '40px 20px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '0', 
                    left: '0', 
                    width: '100%', 
                    height: '4px', 
                    background: 'linear-gradient(90deg, var(--primary), var(--accent))' 
                  }} />
                  
                  <div className="mindmap-center" style={{ 
                    textAlign: 'center', 
                    marginBottom: '40px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <div style={{ 
                      display: 'inline-block', 
                      padding: '15px 30px', 
                      background: 'var(--primary)', 
                      borderRadius: '50px', 
                      color: 'white',
                      boxShadow: '0 10px 30px rgba(79, 134, 247, 0.4)',
                      fontWeight: 800,
                      fontSize: '1.2em',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      🧠 {mindmap.central || "Core Concept"}
                    </div>
                    <div style={{ 
                      height: '40px', 
                      width: '2px', 
                      background: 'var(--border)', 
                      margin: '0 auto' 
                    }} />
                  </div>

                  <div className="mindmap-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '24px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {mindmap.branches?.filter(b => b.name).map((branch, i) => (
                      <div key={i} className="mindmap-branch-node" style={{ 
                        background: 'var(--bg-tertiary)', 
                        padding: '24px', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border)',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          background: 'var(--primary)', 
                          position: 'absolute', 
                          top: '30px', 
                          left: '-24px',
                          display: 'none' // Hidden by default, can be shown in desktop
                        }} />
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          color: 'var(--primary-light)',
                          fontSize: '1.1em',
                          fontWeight: 700,
                          borderBottom: '1px solid var(--border)',
                          paddingBottom: '10px'
                        }}>
                          {branch.name}
                        </h4>
                        <ul style={{ 
                          paddingLeft: '18px', 
                          margin: 0, 
                          color: 'var(--text-muted)',
                          lineHeight: '1.6'
                        }}>
                          {branch.children?.map((child, j) => (
                            <li key={j} style={{ marginBottom: '8px' }}>{child}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {flashcards.length > 0 && (
              <div className="flashcard-container" style={{ marginTop: '20px' }}>
                <div className="flashcard-progress">
                  Card {currentCard + 1} of {flashcards.length}
                </div>
                <div 
                  className={`flashcard ${flipped ? 'flipped' : ''}`}
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <span className="flashcard-label">Front</span>
                      <p>{flashcards[currentCard]?.front}</p>
                      <span className="flashcard-hint">Tap to flip format</span>
                    </div>
                    <div className="flashcard-back">
                      <span className="flashcard-label">Back</span>
                      <p>{flashcards[currentCard]?.back}</p>
                      <span className="flashcard-hint">Tap to flip format</span>
                    </div>
                  </div>
                </div>
                <div className="flashcard-nav" style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
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
                className="btn btn-full" 
                onClick={generateSummary}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Synthesizing...' : 'Prepare Podcast Episode'}
              </button>
            </div>

            {summary && (
              <div className="podcast-player card" style={{ 
                marginTop: '20px', 
                background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
                padding: '30px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div className="podcast-vibe" style={{ 
                  position: 'absolute', 
                  top: '-50px', 
                  right: '-50px', 
                  width: '150px', 
                  height: '150px', 
                  background: 'var(--primary)', 
                  filter: 'blur(80px)', 
                  opacity: 0.2,
                  zIndex: 0
                }} />
                
                <div className="podcast-artwork" style={{ 
                  width: '160px', 
                  height: '160px', 
                  margin: '0 auto 25px', 
                  background: 'var(--primary)', 
                  borderRadius: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <Headphones size={80} color="white" />
                  {speaking && (
                    <div className="audio-waves" style={{ position: 'absolute', bottom: '15px', display: 'flex', gap: '4px', alignItems: 'flex-end', height: '20px' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="wave-bar" style={{ 
                          width: '4px', 
                          background: 'white', 
                          height: speaking ? '100%' : '20%',
                          animation: speaking ? `wave-${i} 1s infinite ease-in-out` : 'none',
                          borderRadius: '10px'
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="podcast-info" style={{ position: 'relative', zIndex: 1 }}>
                  <h2 style={{ fontSize: '1.5em', marginBottom: '5px' }}>Topic: {documents.find(d => d._id === selectedDoc)?.originalName}</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Personalized Learning Stream • 5 min lecture</p>
                </div>

                <div className="podcast-controls" style={{ marginBottom: '25px', position: 'relative', zIndex: 1 }}>
                  <div className="progress-container" style={{ marginBottom: '15px' }}>
                    <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--border)', borderRadius: '10px', position: 'relative' }}>
                      <div className="progress-fill" style={{ width: `${audioProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px', transition: 'width 0.3s linear' }} />
                    </div>
                    <div className="progress-time" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                      <span>{podcastTime}</span>
                      <span>5:00</span>
                    </div>
                  </div>

                  <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                    <button className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}><Rewind size={24} /></button>
                    {!speaking ? (
                      <button className="btn-play" onClick={() => speakText(summary)} style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: 'var(--primary)', 
                        border: 'none', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 10px 20px rgba(79, 134, 247, 0.3)'
                      }}>
                        <Play size={32} fill="white" />
                      </button>
                    ) : (
                      <button className="btn-play" onClick={stopSpeaking} style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: 'var(--error)', 
                        border: 'none', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)'
                      }}>
                        <StopCircle size={32} fill="white" />
                      </button>
                    )}
                    <button className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}><FastForward size={24} /></button>
                  </div>
                </div>

                <div className="podcast-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Volume2 size={16} /> 1x Speed</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Sparkles size={16} /> AI Enhanced Audio</div>
                </div>
              </div>
            )}

            <div className="voice-input card" style={{ marginTop: '20px' }}>
              <h4>🎙️ Verbal Queries</h4>
              <p>Practice speaking back concepts utilizing voice dictation</p>
              <div className="voice-controls" style={{ marginTop: '15px' }}>
                {!listening ? (
                  <button className="btn btn-secondary" onClick={startListening}>
                    <Mic size={18} /> Begin Dictation
                  </button>
                ) : (
                  <button className="btn btn-danger recording" onClick={stopListening}>
                    <MicOff size={18} /> Stop
                  </button>
                )}
              </div>
              {transcript && (
                <div className="transcript" style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                  <strong>Vocals Captured:</strong> {transcript}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'kinesthetic' && (
          <div className="kinesthetic-mode">
            <div className="mode-actions">
              <button 
                className="btn btn-full" 
                onClick={generateQuiz}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Constructing...' : 'Build Interactive Sandbox Quiz'}
              </button>
            </div>

            {quiz.length > 0 && !quizComplete && (
              <div className="quiz-container card" style={{ marginTop: '20px' }}>
                <div className="quiz-progress" style={{ marginBottom: '20px' }}>
                  <div className="quiz-progress-bar" style={{ height: '8px', background: 'var(--border)', borderRadius: '50px', overflow: 'hidden' }}>
                    <div 
                      className="quiz-progress-fill"
                      style={{ width: `${((quizIndex + 1) / quiz.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Challenge {quizIndex + 1} of {quiz.length}</span>
                </div>
                
                <div className="quiz-question" style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.2em' }}>{quiz[quizIndex]?.question}</h3>
                </div>
                
                <div className="quiz-options" style={{ display: 'grid', gap: '12px' }}>
                  {quiz[quizIndex]?.options.map((option, index) => (
                    <button
                      key={index}
                      className={`quiz-option btn-secondary ${
                        selectedAnswer !== null
                          ? index === quiz[quizIndex].correct
                            ? 'correct'
                            : index === selectedAnswer
                            ? 'incorrect'
                            : ''
                          : ''
                      }`}
                      style={{ 
                        padding: '16px', 
                        textAlign: 'left', 
                        justifyContent: 'flex-start',
                        background: selectedAnswer !== null && index === quiz[quizIndex].correct ? 'rgba(16, 185, 129, 0.1)' : '',
                        borderColor: selectedAnswer !== null && index === quiz[quizIndex].correct ? 'var(--success)' : ''
                      }}
                      onClick={() => handleAnswer(index)}
                      disabled={selectedAnswer !== null}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {selectedAnswer !== null && (
                  <div className="quiz-feedback" style={{ marginTop: '20px', padding: '15px', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
                    {selectedAnswer === quiz[quizIndex].correct ? (
                      <p className="correct-feedback" style={{ color: 'var(--success)', fontWeight: 'bold' }}>✅ Excellent execution!</p>
                    ) : (
                      <p className="incorrect-feedback" style={{ color: 'var(--error)' }}>
                        ❌ Incorrect block. The correct method was: {quiz[quizIndex].options[quiz[quizIndex].correct]}
                      </p>
                    )}
                    <button className="btn" onClick={nextQuestion} style={{ marginTop: '15px' }}>
                      {quizIndex < quiz.length - 1 ? 'Proceed to next chunk →' : 'See Calibration Results'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {quizComplete && (
              <div className="quiz-results card" style={{ marginTop: '20px', textAlign: 'center' }}>
                <h2>🎉 Sandbox Evaluated!</h2>
                <div className="score-display" style={{ margin: '20px 0' }}>
                  <div className="score-circle" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--primary)', fontSize: '2em', fontWeight: 'bold' }}>
                    <span className="score-number">{score}</span>
                    <span className="score-total" style={{ fontSize: '0.4em', marginLeft: '5px' }}>/ {quiz.length}</span>
                  </div>
                  <p className="score-percentage" style={{ marginTop: '10px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {Math.round((score / quiz.length) * 100)}% Accuracy
                  </p>
                </div>
                <button className="btn" onClick={restartQuiz}>Recalibrate & Retry</button>
              </div>
            )}
          </div>
        )}

        {mode === 'readwrite' && (
          <div className="readwrite-mode">
            <div className="mode-actions">
              <button
                className="btn btn-full"
                onClick={generateSummary}
                disabled={!selectedDoc || loading}
              >
                {loading ? 'Processing Text...' : 'Generate Structured Article Notes'}
              </button>
            </div>

            {summary && (
              <div className="card" style={{ marginTop: '20px' }}>
                <h3>Drafted Text Notes</h3>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Learn
