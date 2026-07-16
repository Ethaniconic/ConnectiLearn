import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import Loader from '../components/Loader'
import { Eye, Headphones, Hand, BookOpenText, Play, StopCircle, Mic, MicOff, Sparkles, Search, RefreshCcw, FastForward, Rewind, Volume2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import NotebookLMMindmap from '../components/NotebookLMMindmap'

const styleToMode = {
  Visual: 'visual',
  Auditory: 'auditory',
  Kinesthetic: 'kinesthetic',
  ReadWrite: 'readwrite',
  V: 'visual',
  A: 'auditory',
  R: 'readwrite',
  K: 'kinesthetic'
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
  const [activeTool, setActiveTool] = useState(null)
  const [conceptCardUrl, setConceptCardUrl] = useState('')
  const [conceptCardLoading, setConceptCardLoading] = useState(false)
  const [conceptInput, setConceptInput] = useState('')
  const [activeHost, setActiveHost] = useState('Alex')
  const [agentPayload, setAgentPayload] = useState(null)

  // Audio Quiz states (Auditory Mode)
  const [audioQuiz, setAudioQuiz] = useState(null)
  const [audioQuizIndex, setAudioQuizIndex] = useState(0)
  const [audioQuizScore, setAudioQuizScore] = useState(0)
  const [audioQuizSelected, setAudioQuizSelected] = useState(null)
  const [audioQuizComplete, setAudioQuizComplete] = useState(false)
  const [audioQuizFeedback, setAudioQuizFeedback] = useState('')

  // Fill-in-the-blank interactive states (Kinesthetic Mode)
  const [fillAnswers, setFillAnswers] = useState({})
  const [fillAttempts, setFillAttempts] = useState({})
  const [fillStatus, setFillStatus] = useState({}) // 'correct' | 'incorrect' | ''
  const [fillScore, setFillScore] = useState(0)
  const [fillHintLevel, setFillHintLevel] = useState({}) // 0=no hint, 1=first letter, 2=partial, 3=full

  // Read/Write Active Recall & Auditory Voice Agent states
  const [activeRecallBlurred, setActiveRecallBlurred] = useState(true)
  const [revealedNotes, setRevealedNotes] = useState({})
  const [qaStatus, setQaStatus] = useState({})
  const [tutorFollowUp, setTutorFollowUp] = useState('')
  const [voiceTutorHistory, setVoiceTutorHistory] = useState([
    { role: 'assistant', content: "Hello! I am Aura, your interactive AI Auditory Learning Tutor. Speak to me or type below, and we can discuss your study material in real-time." }
  ])
  const [tutorProcessing, setTutorProcessing] = useState(false)
  const [tutorInputText, setTutorInputText] = useState('')
  
  const [hypeMessage, setHypeMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const forced = location.state?.forcedMode
    if (forced && ['visual', 'auditory', 'readwrite', 'kinesthetic'].includes(forced)) {
      setMode(forced)
    }
  }, [location.state?.forcedMode, location.state?.ts])
  const recognitionRef = useRef(null)
  const mindmapRef = useRef(null)
  const audioRef = useRef(null)
  const audioObjectUrlRef = useRef(null)
  const progressInterval = useRef(null)

  const [audioProgress, setAudioProgress] = useState(0)
  const [podcastTime, setPodcastTime] = useState('0:00')
  const [podcastDuration, setPodcastDuration] = useState('0:00')
  const [audioEngine, setAudioEngine] = useState('Neural studio voice')
  const [mnemonicSong, setMnemonicSong] = useState(null)

  const formatPlaybackTime = (seconds) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const m = Math.floor(safeSeconds / 60)
    const s = safeSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const renderHighlightedText = (text, highlights = []) => {
    if (!text) return text
    if (!highlights || highlights.length === 0) return text
    
    let result = text
    // Sort highlights by length descending to prevent partial word matches of shorter terms
    const sortedTerms = [...highlights].sort((a, b) => (b.term?.length || 0) - (a.term?.length || 0))
    
    sortedTerms.forEach(h => {
      if (!h.term) return
      // Simple regex boundary match, safely escape term
      const escapedTerm = h.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi')
      result = result.replace(regex, `<span class="highlight-concept ${h.type || 'key_concept'}" title="${h.definition || ''}">$1</span>`)
    })
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  const renderAsciiDiagram = (diagram) => {
    return <pre className="font-mono bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm text-cyan-400">{diagram}</pre>
  }

  const clearProgressTimer = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
  }

  const clearAudioPlayer = () => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.onplay = null
      audioRef.current.ontimeupdate = null
      audioRef.current.onloadedmetadata = null
      
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current)
      audioObjectUrlRef.current = null
    }
  }

  const cleanupPodcastResources = () => {
    clearProgressTimer()
    clearAudioPlayer()

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const stopSpeaking = () => {
    cleanupPodcastResources()
    setSpeaking(false)
  }

  useEffect(() => {
    fetchDocuments()
    fetchHype()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopSpeaking()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanupPodcastResources()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'visual' || flashcards.length === 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped(f => !f);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, flashcards.length, flipped, currentCard]);

  useEffect(() => {
    fetchRecommendations()
  }, [location.state])

  useEffect(() => {
    if (user?.varkScores && Object.keys(user.varkScores).length > 0 && !mode) {
      const bestMode = selectModeWithHighestPoints(user.varkScores)
      if (bestMode) {
        setMode(bestMode)
      }
    }
  }, [user, mode])

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

  const selectModeWithHighestPoints = (scores) => {
    if (!scores || typeof scores !== 'object' || Object.keys(scores).length === 0) return null
    let maxCategory = 'ReadWrite'
    let maxVal = -1
    const categories = ['Visual', 'Auditory', 'ReadWrite', 'Kinesthetic']
    categories.forEach(cat => {
      const val = scores[cat] || 0
      if (val > maxVal) {
        maxVal = val
        maxCategory = cat
      }
    })
    const mapping = {
      Visual: 'visual',
      Auditory: 'auditory',
      ReadWrite: 'readwrite',
      Kinesthetic: 'kinesthetic'
    }
    return mapping[maxCategory]
  }

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/recommendation/recommendations')
      const style = res.data?.learningStyle || ''
      const scores = res.data?.varkScores || {}
      
      setRecommendedStyle(style)
      setRecommendations(res.data?.recommendations || [])
      
      // Auto-set mode from highest points if no mode is currently active
      if (!mode) {
        const bestMode = selectModeWithHighestPoints(scores)
        if (bestMode) {
          setMode(bestMode)
        } else if (styleToMode[style]) {
          setMode(styleToMode[style])
        }
      }
    } catch (err) {
      console.error(err)
    }
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
      const generatedFlashcards = Array.isArray(res.data.flashcards) ? res.data.flashcards : []
      if (generatedFlashcards.length === 0) {
        setError('No valid flashcards were generated. Please try a different document.')
      }
      setFlashcards(generatedFlashcards)
      setCurrentCard(0)
      setFlipped(false)
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
      const generatedQuestions = Array.isArray(res.data.quiz) ? res.data.quiz : (Array.isArray(res.data.questions) ? res.data.questions : [])
      if (generatedQuestions.length === 0) {
        setError('No valid quiz questions were generated. Please try a different document.')
      }
      setQuiz(generatedQuestions)
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
      if (res.data?.agentPayload) {
        setAgentPayload(res.data.agentPayload)
      }
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
      const generatedMindmap = res.data?.mindmap
      const normalizedMindmap = generatedMindmap && typeof generatedMindmap === 'object'
        ? {
            central: generatedMindmap.central || 'Central Concept',
            branches: Array.isArray(generatedMindmap.branches) ? generatedMindmap.branches : []
          }
        : null

      if (!normalizedMindmap || normalizedMindmap.branches.length === 0) {
        setError('No valid mind map structure was generated. Please try a different document.')
      }

      setMindmap(normalizedMindmap || { central: 'Central Concept', branches: [] })
      if (normalizedMindmap) {
        // Smooth scroll to results
        setTimeout(() => mindmapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate mind map.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateCornellNotes = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/learn/cornell-notes', { documentId: selectedDoc })
      if (res.data?.agentPayload) setAgentPayload(res.data.agentPayload)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate Cornell notes.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateQAGuide = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/learn/qa-guide', { documentId: selectedDoc })
      if (res.data?.agentPayload) setAgentPayload(res.data.agentPayload)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate Socratic Q&A guide.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateFillBlank = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/learn/fill-blank', { documentId: selectedDoc })
      if (res.data?.agentPayload) setAgentPayload(res.data.agentPayload)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate fill-in-the-blank exercises.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateAudioRecap = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/learn/audio-recap', { documentId: selectedDoc })
      if (res.data?.agentPayload) {
        setAgentPayload(res.data.agentPayload)
        const script = res.data.agentPayload.data?.rawScript || ''
        if (script) setSummary(script)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate audio recap.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateRoleplay = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/learn/roleplay', { documentId: selectedDoc })
      if (res.data?.agentPayload) setAgentPayload(res.data.agentPayload)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate scenario roleplay.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateAudioQuiz = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    setAudioQuiz(null)
    setAudioQuizIndex(0)
    setAudioQuizScore(0)
    setAudioQuizSelected(null)
    setAudioQuizComplete(false)
    setAudioQuizFeedback('')
    try {
      const res = await api.post('/learn/audio-quiz', { documentId: selectedDoc })
      const questions = res.data?.questions || []
      if (questions.length === 0) {
        setError('No audio quiz questions were generated. Please try a different document.')
      }
      setAudioQuiz({ questions, title: res.data?.agentPayload?.data?.quizTitle || 'Audio Quiz' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate audio quiz.')
      console.error(err)
    }
    setLoading(false)
  }

  const generateMnemonicSong = async () => {
    if (!selectedDoc) return
    setLoading(true)
    setError('')
    setMnemonicSong(null)
    try {
      const res = await api.post('/learn/mnemonic-song', { documentId: selectedDoc })
      const data = res.data?.agentPayload?.data
      if (data && data.title) {
        setMnemonicSong(data)
      } else {
        setError('Failed to generate memory song.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate memory song.')
      console.error(err)
    }
    setLoading(false)
  }

  const handleAudioQuizAnswer = (optionIdx) => {
    if (audioQuizSelected !== null || !audioQuiz) return
    const q = audioQuiz.questions[audioQuizIndex]
    setAudioQuizSelected(optionIdx)
    const isCorrect = optionIdx === q.correct
    if (isCorrect) {
      setAudioQuizScore(s => s + 1)
      const feedback = q.correctFeedbackAudio || 'Correct! Great job.'
      setAudioQuizFeedback(feedback)
      speakText(feedback, 'aria')
    } else {
      const feedback = q.incorrectFeedbackAudio || `Not quite. The correct answer was: ${q.options?.[q.correct]}`
      setAudioQuizFeedback(feedback)
      speakText(feedback, 'aria')
    }
  }

  const nextAudioQuizQuestion = () => {
    if (!audioQuiz) return
    if (audioQuizIndex < audioQuiz.questions.length - 1) {
      setAudioQuizIndex(i => i + 1)
      setAudioQuizSelected(null)
      setAudioQuizFeedback('')
    } else {
      setAudioQuizComplete(true)
    }
  }

  const restartAudioQuiz = () => {
    setAudioQuizIndex(0)
    setAudioQuizScore(0)
    setAudioQuizSelected(null)
    setAudioQuizComplete(false)
    setAudioQuizFeedback('')
  }

  const handleFillAnswer = (idx, value) => {
    setFillAnswers(prev => ({ ...prev, [idx]: value }))
  }

  const checkFillAnswer = (idx, exercise) => {
    const userAnswer = (fillAnswers[idx] || '').trim().toLowerCase()
    const correct = (exercise.missingWord || '').toLowerCase()
    const attempts = (fillAttempts[idx] || 0) + 1
    setFillAttempts(prev => ({ ...prev, [idx]: attempts }))
    if (userAnswer === correct) {
      setFillStatus(prev => ({ ...prev, [idx]: 'correct' }))
      setFillScore(s => s + Math.max(1, 3 - attempts + 1)) // more points for fewer attempts
    } else {
      setFillStatus(prev => ({ ...prev, [idx]: 'incorrect' }))
      // Auto-advance hint level on wrong answer
      setFillHintLevel(prev => ({ ...prev, [idx]: Math.min((prev[idx] || 0) + 1, 2) }))
    }
  }

  const getFillHintText = (exercise, idx) => {
    const hintLevel = fillHintLevel[idx] || 0
    if (hintLevel === 0) return null
    const hints = exercise.hintLetters || []
    if (hints.length > 0) return hints[Math.min(hintLevel - 1, hints.length - 1)]
    const word = exercise.missingWord || ''
    if (hintLevel === 1) return word[0] + '...'
    if (hintLevel === 2) return word.substring(0, Math.ceil(word.length / 2)) + '...'
    return word
  }

  const triggerAction = (type) => {
    if (type === 'flashcards') generateFlashcards()
    if (type === 'quiz') generateQuiz()
    if (type === 'summary') generateSummary()
    if (type === 'mindmap') generateMindmap()
    if (type === 'visualcard') generateConceptCard()
    if (type === 'podcast') generateSummary()
    if (type === 'audio_recap') generateAudioRecap()
    if (type === 'audio_quiz') generateAudioQuiz()
    if (type === 'mnemonic_song') generateMnemonicSong()
    if (type === 'cornell_notes') generateCornellNotes()
    if (type === 'qa_guide') generateQAGuide()
    if (type === 'fill_blank') generateFillBlank()
    if (type === 'roleplay') generateRoleplay()
  }

  const generateConceptCard = async () => {
    if (!selectedDoc) return
    const activeDoc = documents.find(d => d._id === selectedDoc)
    const fallbackText = activeDoc ? activeDoc.originalName.replace(/\.[^/.]+$/, "") : "Concept"
    const textToUse = conceptInput && conceptInput.trim() ? conceptInput.trim() : fallbackText
    
    setConceptCardLoading(true)
    setError('')
    setConceptCardUrl('')
    try {
      const res = await api.post('/learn/visual-card', { concept: textToUse })
      setConceptCardUrl(res.data.imageUrl)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate visual card.')
    } finally {
      setConceptCardLoading(false)
    }
  }

  const pickBestSpeechVoice = () => {
    if (!('speechSynthesis' in window)) {
      return null
    }

    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) {
      return null
    }

    const rankedVoices = voices
      .map((voice) => {
        const name = (voice.name || '').toLowerCase()
        const lang = (voice.lang || '').toLowerCase()
        let score = 0

        if (name.includes('neural')) score += 100
        if (name.includes('google')) score += 60
        if (name.includes('aria') || name.includes('jenny') || name.includes('guy') || name.includes('sara')) score += 40
        if (lang.startsWith('en')) score += 20
        if (voice.default) score += 10

        return { voice, score }
      })
      .sort((a, b) => b.score - a.score)

    return rankedVoices[0]?.voice || voices[0]
  }

  const playBrowserSpeech = (text) => {
    if (!('speechSynthesis' in window)) {
      setError('Voice playback is not supported in this browser.')
      return
    }

    const cleanText = String(text || '').trim()
    if (!cleanText) return

    window.speechSynthesis.cancel()
    clearProgressTimer()

    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean)
    const dialogueTurns = []

    lines.forEach(line => {
      if (line.startsWith('Alex:')) {
        dialogueTurns.push({ speaker: 'Alex', text: line.replace(/^Alex:\s*/, '') })
      } else if (line.startsWith('Dr. Taylor:')) {
        dialogueTurns.push({ speaker: 'Dr. Taylor', text: line.replace(/^Dr. Taylor:\s*/, '') })
      } else {
        dialogueTurns.push({ speaker: 'Alex', text: line })
      }
    })

    const voices = window.speechSynthesis.getVoices()
    const primaryVoice = pickBestSpeechVoice()
    const secondaryVoice = voices.find(v => v !== primaryVoice && (v.name.includes('Google') || v.name.includes('Aria') || v.name.includes('Guy') || v.lang.startsWith('en'))) || primaryVoice

    const totalWords = cleanText.split(/\s+/).filter(Boolean).length
    const estDuration = Math.max(15, Math.round(totalWords / 2.6))

    setAudioEngine('Dual-Host AI Radio Stream')
    setPodcastTime('0:00')
    setPodcastDuration(formatPlaybackTime(estDuration))
    setSpeaking(true)

    let currentTurn = 0
    let elapsedMs = 0
    const startMs = Date.now()

    progressInterval.current = setInterval(() => {
      const seconds = (Date.now() - startMs) / 1000
      const pct = Math.min((seconds / estDuration) * 100, 99)
      setAudioProgress(pct)
      setPodcastTime(formatPlaybackTime(seconds))
    }, 250)

    const speakNextTurn = () => {
      if (currentTurn >= dialogueTurns.length) {
        clearProgressTimer()
        setSpeaking(false)
        setAudioProgress(100)
        setPodcastTime(formatPlaybackTime(estDuration))
        return
      }

      const turn = dialogueTurns[currentTurn]
      setActiveHost(turn.speaker)

      const utterance = new SpeechSynthesisUtterance(turn.text)
      if (turn.speaker === 'Alex') {
        utterance.voice = primaryVoice
        utterance.rate = 1.05
        utterance.pitch = 1.1
      } else {
        utterance.voice = secondaryVoice
        utterance.rate = 0.94
        utterance.pitch = 0.9
      }

      utterance.onend = () => {
        currentTurn++
        speakNextTurn()
      }

      utterance.onerror = () => {
        currentTurn++
        speakNextTurn()
      }

      window.speechSynthesis.speak(utterance)
    }

    speakNextTurn()
  }

  const speakText = async (text, speakerVoice = 'alex') => {
    const cleanText = String(text || '').trim()
    if (!cleanText) {
      return
    }

    setError('')
    stopSpeaking()

    try {
      const response = await api.post(
        '/learn/podcast-audio',
        { text: cleanText, voice: speakerVoice },
        {
          responseType: 'arraybuffer',
          headers: {
            Accept: 'audio/mpeg'
          }
        }
      )

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
      if (!audioBlob.size) {
        throw new Error('Neural audio response was empty')
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      audioObjectUrlRef.current = audioUrl

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      setAudioEngine('Neural studio voice')
      setPodcastTime('0:00')
      setPodcastDuration('0:00')
      setAudioProgress(0)

      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0
        setPodcastDuration(formatPlaybackTime(duration))
      }

      audio.ontimeupdate = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const progress = (audio.currentTime / audio.duration) * 100
          setAudioProgress(progress)
          setPodcastTime(formatPlaybackTime(audio.currentTime))
          setPodcastDuration(formatPlaybackTime(audio.duration))
        }
      }

      audio.onplay = () => {
        setSpeaking(true)
      }

      audio.onended = () => {
        setSpeaking(false)
        setAudioProgress(100)
        setPodcastTime(formatPlaybackTime(audio.duration))
        clearAudioPlayer()
      }

      audio.onerror = () => {
        setSpeaking(false)
        clearAudioPlayer()
        playBrowserSpeech(cleanText)
      }

      await audio.play()
    } catch (err) {
      console.warn('Neural TTS unavailable, using browser voice fallback.', err)
      playBrowserSpeech(cleanText)
    }
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

  const sendVoiceTutorMessage = async (userText) => {
    const clean = (userText || '').trim()
    if (!clean || tutorProcessing) return

    setTutorInputText('')
    setTutorFollowUp('')
    setVoiceTutorHistory(prev => [...prev, { role: 'user', content: clean }])
    setTutorProcessing(true)

    try {
      const res = await api.post('/learn/voice-tutor-dialogue', {
        userMessage: clean,
        documentId: selectedDoc,
        history: voiceTutorHistory,
        learningStyle: recommendedStyle
      })
      const reply = res.data.replyText || "That's a key point! How do you think this relates to the overall concept?"
      const followUp = res.data.followUpQuestion || ''
      setVoiceTutorHistory(prev => [...prev, { role: 'assistant', content: reply }])
      if (followUp) setTutorFollowUp(followUp)
      speakText(reply, 'aria')
    } catch (err) {
      console.error('Voice tutor dialogue error:', err)
      setVoiceTutorHistory(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't process your spoken question. Let me hear that again!" }])
    } finally {
      setTutorProcessing(false)
    }
  }

  const startVoiceTutorListening = () => {
    stopSpeaking()
    setTranscript('')
    setError('')

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event) => {
        const captured = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        if (captured) {
          sendVoiceTutorMessage(captured)
        }
      }

      recognitionRef.current.onerror = (e) => {
        console.warn('Speech recognition error:', e.error)
        if (e.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access.')
        } else if (e.error === 'no-speech') {
          console.log('No speech detected')
        }
        setListening(false)
      }

      recognitionRef.current.onend = () => setListening(false)
      
      try {
        recognitionRef.current.start()
        setListening(true)
      } catch (err) {
        console.error('Failed to start speech recognition:', err)
        setListening(false)
      }
    } else {
      setError('Browser speech recognition is not supported in this browser. You can type your message in the Voice Studio.')
    }
  }

  const toggleNoteReveal = (idx) => {
    setRevealedNotes(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const exportStudySheet = () => {
    if (!agentPayload) return
    let md = `# Study Sheet: ${agentPayload.title || 'Read/Write Study Notes'}\n\n`
    
    if (agentPayload.architectureType === 'cornell_notes') {
      md += `## Cornell Notes System\n\n### Cues & Keywords\n`
      agentPayload.data?.cues?.forEach(c => { md += `- ${c}\n` })
      md += `\n### Detailed Notes\n`
      agentPayload.data?.notes?.forEach(n => { md += `${n}\n\n` })
      md += `### Summary Synthesis\n${agentPayload.data?.summary || ''}\n\n`
      if (agentPayload.data?.keyTakeaways) {
        md += `### Key Takeaways\n`
        agentPayload.data.keyTakeaways.forEach(k => { md += `- ${k}\n` })
      }
    } else if (agentPayload.architectureType === 'qa_study_guide') {
      md += `## Socratic Text Q&A Study Guide\n\n`
      agentPayload.data?.qaPairs?.forEach((pair, idx) => {
        md += `### Q${idx + 1}: ${pair.question}\n**Category Tag**: ${pair.conceptTag || 'Concept'}\n\n**Model Answer**:\n${pair.answer}\n\n`
      })
    } else {
      md += `## Executive Notebook & Glossary\n\n### Overview\n${agentPayload.data?.executiveSummary || summary}\n\n### Glossary\n`
      agentPayload.data?.glossary?.forEach(g => {
        md += `- **${g.term}**: ${g.definition} ${g.example ? `*(Example: ${g.example})*` : ''}\n`
      })
      if (agentPayload.data?.keyOutlines) {
        md += `\n### Study Outlines\n`
        agentPayload.data.keyOutlines.forEach(o => { md += `- ${o}\n` })
      }
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `study_sheet_${Date.now()}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    const currentQuestion = quiz[quizIndex]
    if (!currentQuestion || !Array.isArray(currentQuestion.options)) return
    setSelectedAnswer(index)
    if (index === currentQuestion.correct) {
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

  useEffect(() => {
    setActiveTool(null)
    setFlashcards([])
    setQuiz([])
    setSummary('')
    setMindmap(null)
    setConceptCardUrl('')
    setAudioQuiz(null)
    setAgentPayload(null)
    setMnemonicSong(null)
    setError('')
  }, [mode])

  const renderSentenceWithBlank = (sentence, missingWord) => {
    if (!sentence) return ''
    if (!missingWord) return sentence
    
    const hasUnderline = sentence.includes('____') || sentence.includes('_____') || sentence.includes('___')
    if (hasUnderline) {
      return sentence
    }
    
    const regex = new RegExp(`\\b${missingWord}\\b`, 'gi')
    if (regex.test(sentence)) {
      return sentence.replace(regex, '_______')
    }
    return sentence.replace(new RegExp(missingWord, 'gi'), '_______')
  }

  const renderAccordionMenu = () => {
    if (!selectedDoc) {
      return (
        <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
          Select a document above to unlock learning tools.
        </p>
      )
    }

    const toolGroups = {
      visual: [
        { id: 'mindmap', name: '🎨 Dynamic Concept Mindmap', desc: 'Horizontal visual relationships diagram', action: generateMindmap },
        { id: 'flashcards', name: '🃏 Color-Coded Flashcards', desc: 'Visual active recall cards', action: generateFlashcards },
        { id: 'conceptcard', name: '🌌 AI Cloud Concept Card', desc: 'Generate visual study illustrations', action: () => setActiveTool('conceptcard') }
      ],
      auditory: [
        { id: 'podcast', name: '🎙️ Dual-Host Radio Podcast', desc: 'Podcast conversational study', action: generateSummary },
        { id: 'voice_tutor', name: '🗣️ Aura AI Voice Tutor', desc: 'Speak to our interactive AI tutor', action: () => setActiveTool('voice_tutor') },
        { id: 'audio_recap', name: '🔊 60-Sec Verbal Summary', desc: 'Audio verbal synthesis recap', action: generateAudioRecap },
        { id: 'audio_quiz', name: '🎧 Spoken Audio Quiz', desc: 'Spoken interactive quiz', action: generateAudioQuiz },
        { id: 'mnemonic_song', name: '🎵 Memory Mnemonic Song', desc: 'Lyrics & catchy music verses', action: generateMnemonicSong }
      ],
      readwrite: [
        { id: 'cornell_notes', name: '📝 Classic Cornell Notes', desc: 'Cues and active recall notes', action: generateCornellNotes },
        { id: 'qa_guide', name: '💡 Socratic Text Q&A Guide', desc: 'Deep text probing questions', action: generateQAGuide },
        { id: 'summary', name: '📖 Executive Notebook Summary', desc: 'Definitions, outlines & terms glossary', action: generateSummary }
      ],
      kinesthetic: [
        { id: 'roleplay', name: '🎭 Scenario Roleplay Challenge', desc: 'Real-world decision simulations', action: generateRoleplay },
        { id: 'fill_blank', name: '✏️ Fill-in-the-Blank Cloze', desc: 'Text completions & active recall', action: generateFillBlank },
        { id: 'quiz', name: '🧩 Sandbox Practice Quiz', desc: 'Multiple choice evaluation', action: generateQuiz }
      ]
    }

    const currentTools = toolGroups[mode] || []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {currentTools.map((tool) => {
          const isSelected = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id)
                setError('')
                
                const isLoaded = 
                  (tool.id === 'flashcards' && flashcards.length > 0) ||
                  (tool.id === 'mindmap' && mindmap) ||
                  (tool.id === 'conceptcard' && conceptCardUrl) ||
                  (tool.id === 'podcast' && summary && agentPayload?.architectureType === 'radio_broadcast') ||
                  (tool.id === 'audio_recap' && agentPayload?.architectureType === 'audio_recap') ||
                  (tool.id === 'audio_quiz' && audioQuiz) ||
                  (tool.id === 'mnemonic_song' && mnemonicSong) ||
                  (tool.id === 'cornell_notes' && agentPayload?.architectureType === 'cornell_notes') ||
                  (tool.id === 'qa_guide' && agentPayload?.architectureType === 'qa_study_guide') ||
                  (tool.id === 'summary' && agentPayload?.architectureType === 'glossary_notebook') ||
                  (tool.id === 'roleplay' && agentPayload?.architectureType === 'scenario_roleplay') ||
                  (tool.id === 'fill_blank' && agentPayload?.architectureType === 'fill_blank') ||
                  (tool.id === 'quiz' && quiz.length > 0) ||
                  (tool.id === 'voice_tutor');
                
                if (!isLoaded) {
                  tool.action()
                }
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(79, 134, 247, 0.08)' : 'var(--bg-secondary)',
                border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-main, #334155)' }}>
                {tool.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                {tool.desc}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const renderActiveToolContent = () => {
    if (!selectedDoc) {
      return (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '16px' }}>
          <h3>📖 No Document Selected</h3>
          <p style={{ marginTop: '10px' }}>Please select a study document from the sidebar to begin active learning.</p>
        </div>
      )
    }

    if (!activeTool) {
      return (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '16px' }}>
          <h3>⚡ Choose a Learning Tool</h3>
          <p style={{ marginTop: '10px' }}>Select any active tool from the left menu to dynamically generate custom study resources.</p>
        </div>
      )
    }

    if (mode === 'visual') {
      if (activeTool === 'mindmap') {
        return mindmap ? (
          <div ref={mindmapRef}>
            <NotebookLMMindmap data={mindmap} />
          </div>
        ) : null
      }

      if (activeTool === 'flashcards') {
        return flashcards.length > 0 ? (
          <div className="flashcard-container card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div className="flashcard-progress" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Card {currentCard + 1} of {flashcards.length}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', margin: '10px 0 20px', overflow: 'hidden' }}>
              <div style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
            </div>
            
            <div 
              className={`flashcard ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped(!flipped)}
              style={{ 
                border: flashcards[currentCard]?.importance === 'high' ? '2px solid var(--error)' : 
                        flashcards[currentCard]?.importance === 'medium' ? '2px solid var(--warning)' : 
                        '2px solid var(--primary)',
                boxShadow: flashcards[currentCard]?.importance === 'high' ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
                cursor: 'pointer'
              }}
            >
              <div className="flashcard-inner">
                <div className="flashcard-front">
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '15px' }}>
                    <span className="flashcard-label">Front</span>
                    {flashcards[currentCard]?.tag && (
                      <span style={{ fontSize: '0.75em', padding: '4px 10px', background: 'rgba(79, 134, 247, 0.1)', color: 'var(--primary)', borderRadius: '12px', fontWeight: 600 }}>
                        {flashcards[currentCard].tag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '1.1em', fontWeight: 600 }}>{flashcards[currentCard]?.question || flashcards[currentCard]?.front}</p>
                  <span className="flashcard-hint" style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Tap or press Space to flip</span>
                </div>
                <div className="flashcard-back">
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '15px' }}>
                    <span className="flashcard-label">Back</span>
                    <button 
                      className="btn btn-secondary" 
                      onClick={(e) => { e.stopPropagation(); speakText(flashcards[currentCard]?.answer || flashcards[currentCard]?.back); }}
                      style={{ padding: '4px 8px', fontSize: '0.8em', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      🔊 Speak
                    </button>
                  </div>
                  <p>{flashcards[currentCard]?.answer || flashcards[currentCard]?.back}</p>
                  <span className="flashcard-hint" style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Tap or press Space to flip back</span>
                </div>
              </div>
            </div>
            <div className="flashcard-nav" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={prevCard}>← Previous</button>
              <button className="btn btn-secondary" onClick={nextCard}>Next →</button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '10px' }}>
              Keyboard shortcuts: Left/Right arrows to navigate, Space to flip
            </p>
          </div>
        ) : null
      }

      if (activeTool === 'conceptcard') {
        return (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '1.1em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎨 Cloud-Based Visual Concept Card
            </h3>
            <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '15px' }}>
              Enter any educational concept from the document to generate an illustrative study aid using cloud GPUs.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="text"
                className="input"
                placeholder="e.g. Photosynthesis, Mitosis, Binary Search..."
                value={conceptInput}
                onChange={(e) => setConceptInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="btn"
                onClick={generateConceptCard}
                disabled={conceptCardLoading}
              >
                {conceptCardLoading ? 'Generating...' : 'Generate Card'}
              </button>
            </div>

            {conceptCardLoading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Requesting concept illustration from cloud...</p>
              </div>
            )}

            {conceptCardUrl && !conceptCardLoading && (
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <img
                  src={conceptCardUrl}
                  alt="Generated Visual Concept Card"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '350px',
                    borderRadius: '16px',
                    border: '1.5px solid var(--border)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                />
                <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Visual memory anchor for your study notes.
                </p>
              </div>
            )}
          </div>
        )
      }
    }

    if (mode === 'auditory') {
      if (activeTool === 'podcast') {
        return summary && agentPayload?.architectureType === 'radio_broadcast' ? (
          <div className="podcast-player card" style={{ 
            background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
            padding: '30px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px'
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
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Dual-Host Educational Radio Broadcast • {audioEngine}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                padding: '14px 16px', 
                borderRadius: '16px', 
                background: activeHost === 'Alex' && speaking ? 'rgba(79, 134, 247, 0.18)' : 'var(--bg-secondary)', 
                border: activeHost === 'Alex' && speaking ? '2px solid var(--primary)' : '1px solid var(--border)',
                boxShadow: activeHost === 'Alex' && speaking ? '0 0 20px rgba(79, 134, 247, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '1.8em', marginBottom: '4px' }}>🎙️</div>
                <strong style={{ fontSize: '0.95em', color: 'var(--text)' }}>Alex (Lead Host)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>Curious Host & Analogies</p>
              </div>

              <div style={{ 
                padding: '14px 16px', 
                borderRadius: '16px', 
                background: activeHost === 'Dr. Taylor' && speaking ? 'rgba(52, 211, 153, 0.18)' : 'var(--bg-secondary)', 
                border: activeHost === 'Dr. Taylor' && speaking ? '2px solid var(--success)' : '1px solid var(--border)',
                boxShadow: activeHost === 'Dr. Taylor' && speaking ? '0 0 20px rgba(52, 211, 153, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '1.8em', marginBottom: '4px' }}>🧑‍🏫</div>
                <strong style={{ fontSize: '0.95em', color: 'var(--text)' }}>Dr. Taylor (Specialist)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>Teaching Breakdown Expert</p>
              </div>
            </div>

            <div className="podcast-controls" style={{ marginBottom: '25px', position: 'relative', zIndex: 1 }}>
              <div className="progress-container" style={{ marginBottom: '15px' }}>
                <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--border)', borderRadius: '10px', position: 'relative' }}>
                  <div className="progress-fill" style={{ width: `${audioProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px', transition: 'width 0.3s linear' }} />
                </div>
                <div className="progress-time" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                  <span>{podcastTime}</span>
                  <span>{podcastDuration}</span>
                </div>
              </div>

              <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                <button className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}><Rewind size={24} /></button>
                {!speaking ? (
                  <button className="btn-play" onClick={() => speakText(summary, activeHost.toLowerCase())} style={{ 
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Sparkles size={16} /> Edge Neural Voice Cloud</div>
            </div>
          </div>
        ) : null
      }

      if (activeTool === 'audio_recap') {
        return agentPayload?.architectureType === 'audio_recap' ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🔊 {agentPayload.title || 'Verbal Summary Recap'}
              </h2>
              <button 
                className="btn btn-secondary" 
                onClick={() => speakText(summary)}
                style={{ padding: '6px 12px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🔊 Stream Recap Audio
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Audio Narration Script</h4>
                <p style={{ margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{summary}</p>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '14px', borderLeft: '4px solid var(--accent)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95em', color: 'var(--accent)' }}>Core Takeaways</h4>
                <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: '1.8', fontSize: '0.9em' }}>
                  {agentPayload.data?.keyBullets?.map((b, i) => <li key={i} style={{ marginBottom: '8px' }}>{b}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ) : null
      }

      if (activeTool === 'audio_quiz') {
        return audioQuiz && !audioQuizComplete ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🎧 {audioQuiz.title || 'Audio Quiz'}
              </h2>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                Question {audioQuizIndex + 1} of {audioQuiz.questions.length} • Score: {audioQuizScore}
              </div>
            </div>

            <div style={{ height: '6px', background: 'var(--border)', borderRadius: '10px', marginBottom: '25px', overflow: 'hidden' }}>
              <div style={{ width: `${((audioQuizIndex + 1) / audioQuiz.questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '10px', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Spoken Question</p>
              <p style={{ fontSize: '1.15em', lineHeight: '1.6', margin: 0, fontWeight: 600 }}>
                {audioQuiz.questions[audioQuizIndex]?.spokenQuestion}
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => speakText(audioQuiz.questions[audioQuizIndex]?.spokenQuestion, 'aria')}
                style={{ marginTop: '14px', fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
              >
                🔊 Play Question Aloud
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
              {audioQuiz.questions[audioQuizIndex]?.options?.map((opt, oi) => {
                const isSelected = audioQuizSelected === oi
                const isCorrect = oi === audioQuiz.questions[audioQuizIndex]?.correct
                let bg = 'var(--bg-secondary)'
                let border = 'var(--border)'
                if (audioQuizSelected !== null) {
                  if (isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = 'var(--success)' }
                  else if (isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.10)'; border = 'var(--error)' }
                }
                return (
                  <button
                    key={oi}
                    onClick={() => handleAudioQuizAnswer(oi)}
                    disabled={audioQuizSelected !== null}
                    style={{
                      background: bg,
                      border: `1.5px solid ${border}`,
                      borderRadius: '12px',
                      padding: '14px 18px',
                      textAlign: 'left',
                      cursor: audioQuizSelected !== null ? 'default' : 'pointer',
                      color: 'var(--text)',
                      fontSize: '0.95em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease',
                      fontWeight: isCorrect && audioQuizSelected !== null ? 700 : 400
                    }}
                  >
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85em', flexShrink: 0 }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                    {audioQuizSelected !== null && isCorrect && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 700 }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {audioQuizFeedback && (
              <div style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: audioQuizSelected === audioQuiz.questions[audioQuizIndex]?.correct ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${audioQuizSelected === audioQuiz.questions[audioQuizIndex]?.correct ? 'var(--success)' : 'var(--error)'}`,
                marginBottom: '16px',
                fontSize: '0.92em',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <span style={{ fontSize: '1.2em' }}>{audioQuizSelected === audioQuiz.questions[audioQuizIndex]?.correct ? '✅' : '❌'}</span>
                <span>{audioQuizFeedback}</span>
                <button className="btn btn-secondary" onClick={() => speakText(audioQuizFeedback, 'aria')} style={{ marginLeft: 'auto', fontSize: '0.78em', padding: '5px 10px', flexShrink: 0 }}>🔊</button>
              </div>
            )}

            {audioQuizSelected !== null && (
              <button className="btn" onClick={nextAudioQuizQuestion} style={{ width: '100%' }}>
                {audioQuizIndex < audioQuiz.questions.length - 1 ? 'Next Question →' : 'See Results 🏆'}
              </button>
            )}
          </div>
        ) : audioQuiz && audioQuizComplete ? (
          <div className="card" style={{ padding: '30px', textAlign: 'center', borderRadius: '16px' }}>
            <h2 style={{ marginBottom: '10px' }}>🎉 Audio Quiz Complete!</h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '110px', height: '110px', borderRadius: '50%', border: '5px solid var(--primary)', fontSize: '2.2em', fontWeight: 900, margin: '20px 0' }}>
              {audioQuizScore}/{audioQuiz.questions.length}
            </div>
            <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '20px', fontSize: '1.1em' }}>
              {Math.round((audioQuizScore / audioQuiz.questions.length) * 100)}% Score
            </p>
            <button className="btn" onClick={restartAudioQuiz}>Retry Quiz 🔄</button>
          </div>
        ) : null
      }

      if (activeTool === 'mnemonic_song') {
        return mnemonicSong ? (
          <div className="card" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.05))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🎵 {mnemonicSong.title || 'Mnemonic Memory Song'}
              </h2>
              <button className="btn btn-secondary" onClick={() => speakText(`Here is the memory song: ${mnemonicSong.title}. Chorus: ${mnemonicSong.chorus}. ${mnemonicSong.verses?.map(v => v.lyrics).join(' ')}`, 'aria')} style={{ padding: '6px 12px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔊 Recite Lyrics
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '16px', borderLeft: '4px solid var(--primary)', fontStyle: 'italic', fontWeight: 600, fontSize: '1.1em', lineHeight: '1.6', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Chorus</strong>
              {mnemonicSong.chorus?.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '25px' }}>
              {mnemonicSong.verses?.map((verse, i) => (
                <div key={i} style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>{verse.label || `Verse ${i+1}`}</h4>
                  <div style={{ lineHeight: '1.6', fontSize: '0.95em' }}>
                    {verse.lyrics?.split('\n').map((line, j) => <div key={j}>{line}</div>)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Encoded Key Facts:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: 'var(--text)', lineHeight: '1.6' }}>
                {mnemonicSong.keyFacts?.map((fact, i) => <li key={i}>{fact}</li>)}
              </ul>
            </div>
          </div>
        ) : null
      }

      if (activeTool === 'voice_tutor') {
        return (
          <div className="voice-input card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} style={{ color: 'var(--primary)' }} /> Aura AI Conversational Spoken Tutor
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                  Have a real-time, two-way verbal study conversation. Tap the microphone to talk or type below.
                </p>
              </div>
              <div style={{ 
                padding: '6px 12px', 
                borderRadius: '20px', 
                background: listening ? 'rgba(239, 68, 68, 0.15)' : speaking ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                color: listening ? 'var(--error)' : speaking ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: listening ? 'var(--error)' : speaking ? 'var(--success)' : 'var(--text-muted)',
                  display: 'inline-block' 
                }} />
                {listening ? 'Listening...' : speaking ? 'Speaking...' : 'Ready'}
              </div>
            </div>

            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              background: 'var(--bg-secondary)', 
              borderRadius: '16px', 
              padding: '16px', 
              marginBottom: '15px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              border: '1px solid var(--border)'
            }}>
              {voiceTutorHistory.map((item, idx) => (
                <div key={idx} style={{ 
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: item.role === 'user' ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: item.role === 'user' ? 'white' : 'var(--text)',
                  padding: '12px 16px',
                  borderRadius: item.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '0.92em',
                  lineHeight: '1.6',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <strong style={{ display: 'block', fontSize: '0.75em', opacity: 0.8, marginBottom: '2px' }}>
                    {item.role === 'user' ? 'You 🗣️' : 'Aura Tutor 🎙️'}
                  </strong>
                  {item.content}
                </div>
              ))}
              {tutorProcessing && (
                <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85em', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader message="" size={18} /> Aura is formulating spoken answer...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {!listening ? (
                <button 
                  className="btn" 
                  onClick={startVoiceTutorListening}
                  disabled={tutorProcessing}
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: '50px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Mic size={18} /> Push to Speak
                </button>
              ) : (
                <button 
                  className="btn btn-danger recording" 
                  onClick={stopListening}
                  style={{ borderRadius: '50px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <MicOff size={18} /> Stop Listening
                </button>
              )}

              <input 
                type="text"
                className="input"
                placeholder="Or type your spoken question to Aura..."
                value={tutorInputText}
                onChange={(e) => setTutorInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendVoiceTutorMessage(tutorInputText)}
                disabled={tutorProcessing}
                style={{ flex: 1, borderRadius: '50px', paddingLeft: '18px' }}
              />
              
              <button 
                className="btn btn-secondary" 
                onClick={() => sendVoiceTutorMessage(tutorInputText)}
                disabled={!tutorInputText.trim() || tutorProcessing}
                style={{ borderRadius: '50px' }}
              >
                Send
              </button>
            </div>

            {tutorFollowUp && (
              <div style={{
                marginTop: '14px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(79, 134, 247, 0.08)',
                border: '1px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9em'
              }}>
                <span style={{ fontSize: '1.1em' }}>🎙️</span>
                <span style={{ color: 'var(--text)', flex: 1 }}><strong>Aura suggests:</strong> {tutorFollowUp}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => sendVoiceTutorMessage(tutorFollowUp)}
                  style={{ fontSize: '0.8em', padding: '5px 10px', flexShrink: 0 }}
                >
                  Ask This
                </button>
              </div>
            )}
          </div>
        )
      }
    }

    if (mode === 'readwrite') {
      if (activeTool === 'summary') {
        return agentPayload?.architectureType === 'glossary_notebook' ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <h2 style={{ marginBottom: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpenText size={24} /> {agentPayload.title || 'Executive Notebook'}
            </h2>
            
            {agentPayload.data?.executiveSummary && (
              <div style={{ marginBottom: '20px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', lineHeight: '1.7' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: 'var(--text-muted)' }}>EXECUTIVE OVERVIEW</h4>
                <p style={{ margin: 0 }}>{renderHighlightedText(agentPayload.data.executiveSummary, agentPayload.data.highlights)}</p>
              </div>
            )}

            {agentPayload.data?.glossary && agentPayload.data.glossary.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '1em' }}>Key Terminology Glossary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {agentPayload.data.glossary.map((g, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px', fontSize: '1.05em' }}>{g.term}</strong>
                      <span style={{ fontSize: '0.88em', color: 'var(--text)', display: 'block', marginBottom: '6px' }}>{g.definition}</span>
                      {g.example && (
                        <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block' }}>
                          💡 Example: {g.example}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentPayload.data?.keyOutlines && agentPayload.data.keyOutlines.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', fontSize: '1em' }}>Core Study Outlines</h4>
                <ul style={{ paddingLeft: '20px', lineHeight: '1.7', color: 'var(--text)' }}>
                  {agentPayload.data.keyOutlines.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{renderHighlightedText(item, agentPayload.data.highlights)}</li>
                  ))}
                </ul>
              </div>
            )}

            {agentPayload.data?.selfTestPrompts && agentPayload.data.selfTestPrompts.length > 0 && (
              <div style={{ background: 'rgba(79, 134, 247, 0.06)', padding: '16px', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>🧠 Reflection & Self-Test Prompts</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {agentPayload.data.selfTestPrompts.map((prompt, idx) => (
                    <div key={idx} style={{ fontSize: '0.9em', color: 'var(--text)' }}>
                      • <strong>Prompt {idx + 1}:</strong> {prompt}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentPayload.data?.asciiDiagram && (
              <div style={{ marginTop: '20px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                {agentPayload.data.diagramTitle && <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>{agentPayload.data.diagramTitle}</h4>}
                <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85em', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {agentPayload.data.asciiDiagram}
                </pre>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={exportStudySheet} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 Export Study Sheet
              </button>
            </div>
          </div>
        ) : null
      }

      if (activeTool === 'cornell_notes') {
        return agentPayload?.architectureType === 'cornell_notes' ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📝 Cornell Active Recall Studio
              </h2>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveRecallBlurred(!activeRecallBlurred)}
                style={{ fontSize: '0.85em', padding: '6px 12px' }}
              >
                {activeRecallBlurred ? '👁️ Disable Active Recall Blur' : '🔒 Enable Active Recall Blur'}
              </button>
            </div>

            <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '15px' }}>
              {activeRecallBlurred ? 'Hover or click individual note boxes to unblur and test your memory recall.' : 'Showing full notes column.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: 'var(--text-muted)' }}>CUES & KEYWORDS</h4>
                <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: '1.9' }}>
                  {agentPayload.data?.cues?.map((cue, idx) => (
                    <li key={idx} style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', cursor: 'pointer' }} onClick={() => toggleNoteReveal(idx)}>
                      {cue}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: 'var(--text-muted)' }}>RECORDED NOTES</h4>
                {agentPayload.data?.notes?.map((note, idx) => {
                  const isBlurred = activeRecallBlurred && !revealedNotes[idx]
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleNoteReveal(idx)}
                      style={{
                        padding: '12px',
                        background: isBlurred ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        filter: isBlurred ? 'blur(5px)' : 'none',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        userSelect: isBlurred ? 'none' : 'text'
                      }}
                      title={isBlurred ? "Click to reveal note" : ""}
                    >
                      <p style={{ margin: 0, lineHeight: '1.7' }}>{renderHighlightedText(note, agentPayload.data.highlights)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {agentPayload.data?.summary && (
              <div style={{ background: 'rgba(79, 134, 247, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid var(--primary)', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9em', color: 'var(--primary)' }}>SUMMARY SYNTHESIS</h4>
                <p style={{ margin: 0, lineHeight: '1.7' }}>{renderHighlightedText(agentPayload.data.summary, agentPayload.data.highlights)}</p>
              </div>
            )}

            {agentPayload.data?.asciiDiagram && (
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                {agentPayload.data.diagramTitle && <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>{agentPayload.data.diagramTitle}</h4>}
                <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85em', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {agentPayload.data.asciiDiagram}
                </pre>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={exportStudySheet} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 Export Study Sheet
              </button>
            </div>
          </div>
        ) : null
      }

      if (activeTool === 'qa_guide') {
        return agentPayload?.architectureType === 'qa_study_guide' ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <h2 style={{ marginBottom: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              💡 Socratic Text Q&A Active Assessment
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {agentPayload.data?.qaPairs?.map((pair, idx) => {
                const status = qaStatus[idx]
                return (
                  <div key={idx} style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '18px 22px', 
                    borderRadius: '14px', 
                    border: status === 'mastered' ? '1.5px solid var(--success)' : status === 'review' ? '1.5px solid var(--warning)' : '1px solid var(--border)' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75em', padding: '3px 8px', borderRadius: '50px', background: 'var(--bg-tertiary)', color: 'var(--primary)', fontWeight: 700 }}>
                        {pair.conceptTag || 'Concept'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => setQaStatus(prev => ({ ...prev, [idx]: 'mastered' }))}
                          style={{ fontSize: '0.75em', padding: '4px 8px', background: status === 'mastered' ? 'var(--success)' : '', color: status === 'mastered' ? 'white' : '' }}
                        >
                          Mastered ✅
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => setQaStatus(prev => ({ ...prev, [idx]: 'review' }))}
                          style={{ fontSize: '0.75em', padding: '4px 8px', background: status === 'review' ? 'var(--warning)' : '', color: status === 'review' ? 'white' : '' }}
                        >
                          Review 📌
                        </button>
                      </div>
                    </div>

                    <strong style={{ color: 'var(--text)', fontSize: '1.05em', display: 'block', marginBottom: '12px' }}>
                      Q{idx + 1}: {pair.question}
                    </strong>

                    {pair.hint && (
                      <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                        💡 Hint: {pair.hint}
                      </p>
                    )}

                    <details style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>
                      <summary style={{ padding: '6px 0' }}>Reveal Model Response</summary>
                      <div style={{ marginTop: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '10px', color: 'var(--text)', fontWeight: 400, lineHeight: '1.7' }}>
                        {pair.answer}
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={exportStudySheet} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 Export Study Sheet
              </button>
            </div>
          </div>
        ) : null
      }
    }

    if (mode === 'kinesthetic') {
      if (activeTool === 'roleplay') {
        return agentPayload?.architectureType === 'scenario_roleplay' ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎭 {agentPayload.data?.scenarioTitle || 'Scenario Roleplay Challenge'}
              </h2>
              <button 
                className="btn btn-secondary" 
                onClick={generateRoleplay}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8em', padding: '6px 12px' }}
              >
                <RefreshCcw size={14} /> Regenerate Scenario
              </button>
            </div>
            
            <p style={{ background: 'var(--bg-tertiary)', padding: '15px', borderRadius: '12px', lineHeight: '1.7', marginBottom: '20px' }}>
              {agentPayload.data?.scenarioDescription}
            </p>
            {agentPayload.data?.questions?.map((q, idx) => (
              <div key={idx} style={{ marginBottom: '15px' }}>
                <h4 style={{ marginBottom: '10px' }}>{q.question}</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {q.options?.map((opt, oIdx) => (
                    <button key={oIdx} className="btn btn-secondary" style={{ textAlign: 'left' }} onClick={() => alert(oIdx === q.correct ? `Correct! ${q.explanation}` : `Incorrect choice.`)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null
      }

      if (activeTool === 'fill_blank') {
        return agentPayload?.architectureType === 'fill_blank' ? (
          <div className="card" style={{ padding: '25px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ✏️ Fill-in-the-Blank Active Recall
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Score:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.15em' }}>{fillScore}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {['easy', 'medium', 'hard'].map(d => (
                <span key={d} style={{ fontSize: '0.75em', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, textTransform: 'uppercase',
                  background: d === 'easy' ? 'rgba(16,185,129,0.15)' : d === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: d === 'easy' ? 'var(--success)' : d === 'medium' ? 'var(--warning)' : 'var(--error)'
                }}>{d}</span>
              ))}
              <span style={{ fontSize: '0.75em', color: 'var(--text-muted)', alignSelf: 'center' }}>— difficulty levels mixed in</span>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {agentPayload.data?.exercises?.map((item, idx) => {
                const status = fillStatus[idx]
                const attempts = fillAttempts[idx] || 0
                const hintText = getFillHintText(item, idx)
                const diffColor = item.difficulty === 'easy' ? 'var(--success)' : item.difficulty === 'hard' ? 'var(--error)' : 'var(--warning)'
                return (
                  <div key={idx} style={{
                    background: 'var(--bg-secondary)',
                    padding: '18px 20px',
                    borderRadius: '14px',
                    border: status === 'correct' ? '1.5px solid var(--success)' : status === 'incorrect' ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.05em', fontWeight: 700 }}>
                        {idx + 1}. {renderSentenceWithBlank(item.sentence, item.missingWord)}
                      </span>
                      {item.difficulty && (
                        <span style={{ fontSize: '0.72em', padding: '2px 8px', borderRadius: '10px', background: `${diffColor}20`, color: diffColor, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0, marginLeft: '10px' }}>
                          {item.difficulty}
                        </span>
                      )}
                    </div>

                    {item.hint && <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>💡 {item.hint}</p>}

                    {hintText && status !== 'correct' && (
                      <p style={{ fontSize: '0.82em', color: 'var(--primary)', margin: '0 0 8px 0', fontWeight: 600 }}>🔡 Hint: starts with "{hintText}"</p>
                    )}

                    {status !== 'correct' ? (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Type the missing word..."
                          value={fillAnswers[idx] || ''}
                          onChange={(e) => {
                            handleFillAnswer(idx, e.target.value)
                            if (status === 'incorrect') {
                              setFillStatus(prev => ({ ...prev, [idx]: null }))
                            }
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && checkFillAnswer(idx, item)}
                          style={{ flex: 1, borderColor: status === 'incorrect' ? 'var(--error)' : 'var(--border)' }}
                        />
                        <button className="btn" onClick={() => checkFillAnswer(idx, item)} style={{ flexShrink: 0 }}>Check</button>
                        {attempts > 0 && (
                          <button className="btn btn-secondary" onClick={() => setFillHintLevel(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }))} style={{ flexShrink: 0, fontSize: '0.85em' }}>Hint</button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.10)' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Correct!</span>
                        <span style={{ color: 'var(--text)', fontSize: '0.92em' }}>Answer: <strong>{item.missingWord}</strong></span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.78em', color: 'var(--text-muted)' }}>+{Math.max(1, 3 - attempts + 1)} pts</span>
                      </div>
                    )}

                    {status === 'incorrect' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                        <p style={{ color: 'var(--error)', fontSize: '0.82em', margin: 0 }}>❌ Try again — {attempts} attempt{attempts !== 1 ? 's' : ''} so far</p>
                        <button className="btn btn-secondary" onClick={() => { setFillStatus(prev => ({ ...prev, [idx]: null })); setFillAnswers(prev => ({ ...prev, [idx]: '' })) }} style={{ fontSize: '0.75em', padding: '4px 8px' }}>🔄 Clear & Try Again</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null
      }

      if (activeTool === 'quiz') {
        return quiz.length > 0 ? (
          <div>
            {!quizComplete ? (
              <div className="quiz-container card" style={{ padding: '25px', borderRadius: '16px' }}>
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
                  <h3 style={{ fontSize: '1.25em' }}>{quiz[quizIndex]?.question}</h3>
                </div>
                
                <div className="quiz-options" style={{ display: 'grid', gap: '12px' }}>
                  {quiz[quizIndex]?.options?.map((option, index) => (
                    <button
                      key={index}
                      className={`quiz-option btn-secondary ${
                        selectedAnswer !== null
                          ? index === quiz[quizIndex]?.correct
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
                        background: selectedAnswer !== null && index === quiz[quizIndex]?.correct ? 'rgba(16, 185, 129, 0.1)' : '',
                        borderColor: selectedAnswer !== null && index === quiz[quizIndex]?.correct ? 'var(--success)' : ''
                      }}
                      onClick={() => handleAnswer(index)}
                      disabled={selectedAnswer !== null}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {selectedAnswer !== null && (
                  <div className="quiz-feedback" style={{ marginTop: '20px', padding: '15px', borderRadius: '12px', background: selectedAnswer === quiz[quizIndex]?.correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                    {selectedAnswer === quiz[quizIndex]?.correct ? (
                      <p className="correct-feedback" style={{ color: 'var(--success)', fontWeight: 'bold' }}>✅ Correct! {quiz[quizIndex]?.explanation}</p>
                    ) : (
                      <p className="incorrect-feedback" style={{ color: 'var(--error)' }}>
                        ❌ Incorrect. The correct option was: {quiz[quizIndex]?.options?.[quiz[quizIndex]?.correct]}.<br/>
                        <span style={{ display: 'block', marginTop: '8px', color: 'var(--text)' }}><strong>Explanation:</strong> {quiz[quizIndex]?.explanation}</span>
                      </p>
                    )}
                    <button className="btn" onClick={nextQuestion} style={{ marginTop: '15px' }}>
                      {quizIndex < quiz.length - 1 ? 'Proceed to next question →' : 'See Calibration Results'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="quiz-results card" style={{ padding: '30px', textAlign: 'center', borderRadius: '16px' }}>
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
        ) : null
      }
    }

    return null
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

        {user?.varkScores && Object.keys(user.varkScores).length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main, #1e293b)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Your Multimodal VARK Sensory Breakdown
            </h3>
            <VarkVisualizer scores={user.varkScores} />
          </div>
        )}
      </div>

      <div className="active-mode-indicator" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
        {modeIcons[mode]}
        <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9em' }}>Currently Active: {mode} Mode</h3>
      </div>

      <div className="learn-content" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', alignItems: 'start', marginTop: '20px' }}>
        <div className="learn-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #1e293b)', margin: '0 0 12px 0' }}>Study Document</h3>
            <select 
              className="input"
              value={selectedDoc || ''}
              onChange={(e) => setSelectedDoc(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Select a document...</option>
              {documents.map(doc => (
                <option key={doc._id} value={doc._id}>{doc.originalName}</option>
              ))}
            </select>
          </div>

          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main, #1e293b)', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛠️ Study Tools
            </h3>
            {renderAccordionMenu()}
          </div>
        </div>

        <div className="learn-main-panel" style={{ minWidth: 0 }}>
          {loading && <Loader overlay message="Formulating optimized active learning tools..." />}
          
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

          {renderActiveToolContent()}
        </div>
      </div>
    </div>
  )
}

function VarkVisualizer({ scores }) {
  if (!scores || typeof scores !== 'object') return null;
  
  const v = scores.Visual || 0;
  const a = scores.Auditory || 0;
  const r = scores.ReadWrite || 0;
  const k = scores.Kinesthetic || 0;
  
  const maxVal = Math.max(v, a, r, k, 1);
  const scaleMax = Math.max(maxVal, 16);
  
  const center = 100;
  const maxRadius = 70;
  
  const getRadius = (val) => (val / scaleMax) * maxRadius;
  
  const rV = getRadius(v);
  const rA = getRadius(a);
  const rR = getRadius(r);
  const rK = getRadius(k);
  
  const ptV = { x: center, y: center - rV };
  const ptA = { x: center + rA, y: center };
  const ptR = { x: center, y: center + rR };
  const ptK = { x: center - rK, y: center };
  
  const polygonPoints = `${ptV.x},${ptV.y} ${ptA.x},${ptA.y} ${ptR.x},${ptR.y} ${ptK.x},${ptK.y}`;
  const gridRadii = [17.5, 35, 52.5, 70];
  
  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '30px', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px', 
      background: 'var(--card-bg, #ffffff)', 
      borderRadius: '16px', 
      border: '1px solid var(--border-color, #e2e8f0)', 
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      marginTop: '15px'
    }}>
      {/* Radar SVG */}
      <div style={{ width: '220px', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="220" height="220" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
          {/* Background rings */}
          {gridRadii.map((radius, idx) => {
            const p = `${center},${center - radius} ${center + radius},${center} ${center},${center + radius} ${center - radius},${center}`;
            return (
              <polygon
                key={idx}
                points={p}
                fill="none"
                stroke="var(--border-color, #cbd5e1)"
                strokeWidth="1"
                strokeDasharray={idx === 3 ? "none" : "3,3"}
              />
            );
          })}
          
          {/* Axes */}
          <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} stroke="var(--border-color, #e2e8f0)" strokeWidth="1.5" />
          <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} stroke="var(--border-color, #e2e8f0)" strokeWidth="1.5" />
          
          {/* Polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(99, 102, 241, 0.2)"
            stroke="var(--primary, #6366f1)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            style={{ transition: 'all 0.5s ease-in-out' }}
          />
          
          {/* Vertices */}
          <circle cx={ptV.x} cy={ptV.y} r="4.5" fill="var(--primary, #6366f1)" stroke="#fff" strokeWidth="1.5" />
          <circle cx={ptA.x} cy={ptA.y} r="4.5" fill="var(--primary, #6366f1)" stroke="#fff" strokeWidth="1.5" />
          <circle cx={ptR.x} cy={ptR.y} r="4.5" fill="var(--primary, #6366f1)" stroke="#fff" strokeWidth="1.5" />
          <circle cx={ptK.x} cy={ptK.y} r="4.5" fill="var(--primary, #6366f1)" stroke="#fff" strokeWidth="1.5" />
          
          {/* Labels */}
          <text x={center} y={center - maxRadius - 12} textAnchor="middle" style={{ fontSize: '11px', fontWeight: '700', fill: 'var(--text-main, #334155)' }}>Visual (V)</text>
          <text x={center + maxRadius + 14} y={center + 4} textAnchor="start" style={{ fontSize: '11px', fontWeight: '700', fill: 'var(--text-main, #334155)' }}>Auditory (A)</text>
          <text x={center} y={center + maxRadius + 18} textAnchor="middle" style={{ fontSize: '11px', fontWeight: '700', fill: 'var(--text-main, #334155)' }}>Read/Write (R)</text>
          <text x={center - maxRadius - 14} y={center + 4} textAnchor="end" style={{ fontSize: '11px', fontWeight: '700', fill: 'var(--text-main, #334155)' }}>Kinesthetic (K)</text>
        </svg>
      </div>
      
      {/* Horizontal Bar Chart */}
      <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[
          { label: 'Visual (V)', score: v, color: '#3b82f6', desc: 'Charts, mindmaps, diagrams' },
          { label: 'Auditory (A)', score: a, color: '#10b981', desc: 'Podcasts, dialogues, explanations' },
          { label: 'Read/Write (R)', score: r, color: '#f59e0b', desc: 'Cornell notes, textbooks, outlines' },
          { label: 'Kinesthetic (K)', score: k, color: '#ec4899', desc: 'Practice quizzes, scenarios, sandbox' }
        ].map((item, idx) => {
          const pct = Math.max(5, (item.score / scaleMax) * 100);
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600' }}>
                <span style={{ color: 'var(--text-main, #1e293b)' }}>{item.label}</span>
                <span style={{ color: item.color }}>{item.score} points</span>
              </div>
              <div style={{ height: '8px', width: '100%', background: 'var(--border-color, #f1f5f9)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '4px', transition: 'width 0.8s ease-in-out' }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>{item.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Learn
