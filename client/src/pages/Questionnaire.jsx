import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const QUESTIONS = [
  {
    id: 1,
    question: "You are learning a new computer program or game. You would:",
    options: [
      { key: "V", text: "Follow the diagrams, flowcharts, or screenshots in the manual/guide." },
      { key: "A", text: "Listen to a friend explain how it works or watch a video explanation." },
      { key: "R", text: "Read the written text instructions or help files." },
      { key: "K", text: "Start using it immediately and learn by trial and error." }
    ]
  },
  {
    id: 2,
    question: "You are planning a vacation for a group. You want some feedback about the plan. You would:",
    options: [
      { key: "V", text: "Share an infographic map or visual itinerary flow." },
      { key: "A", text: "Discuss the plans verbally in a group call or meeting." },
      { key: "R", text: "Write a detailed description of the travel plan and email it to them." },
      { key: "K", text: "Describe a few activities you will actually do there (like hiking or snorkeling)." }
    ]
  },
  {
    id: 3,
    question: "You want to find out about a new digital camera or smartphone before buying. You would:",
    options: [
      { key: "V", text: "Look at pictures showing its design, screens, and features." },
      { key: "A", text: "Talk to the salesperson or ask friends about their verbal reviews." },
      { key: "R", text: "Read detailed text specs and technical reviews online." },
      { key: "K", text: "Go to the store and try using the device yourself." }
    ]
  },
  {
    id: 4,
    question: "You are teaching someone how to perform a specific physical task (e.g. a swing or dance step). You would:",
    options: [
      { key: "V", text: "Draw a diagram or show a series of pictures of the steps." },
      { key: "A", text: "Explain the timing and steps verbally." },
      { key: "R", text: "Write out a list of detailed step-by-step instructions." },
      { key: "K", text: "Demonstrate the movement yourself and have them try it." }
    ]
  },
  {
    id: 5,
    question: "You are assembly-coding or putting together a flat-pack piece of furniture. You would:",
    options: [
      { key: "V", text: "Look at the visual diagrams and blow-up sketches." },
      { key: "A", text: "Watch a video of someone assembling it or call a friend for advice." },
      { key: "R", text: "Read the printed assembly notes and text details carefully." },
      { key: "K", text: "Start assembling the pieces directly, trying to figure out where they go." }
    ]
  },
  {
    id: 6,
    question: "You want to learn how to cook a new recipe. You would:",
    options: [
      { key: "V", text: "Look at photos showing each stage of the preparation." },
      { key: "A", text: "Listen to a cooking podcast or talk to someone who has made it." },
      { key: "R", text: "Read the printed recipe card and ingredient list." },
      { key: "K", text: "Cook the recipe directly, adjusting taste and technique as you go." }
    ]
  },
  {
    id: 7,
    question: "You are choosing a book or article to read for pleasure. You look for:",
    options: [
      { key: "V", text: "A book with illustrations, diagrams, or a visually striking cover." },
      { key: "A", text: "An audiobook or a text that sounds conversational." },
      { key: "R", text: "A text with clear, well-written descriptive paragraphs and glossary." },
      { key: "K", text: "A book with an immersive, action-oriented story that feels real." }
    ]
  },
  {
    id: 8,
    question: "If you are not sure how to spell a complex word, you would:",
    options: [
      { key: "V", text: "Visualize the word in your mind and choose how it looks." },
      { key: "A", text: "Sound the word out in your mind or speak it aloud." },
      { key: "R", text: "Look it up in a dictionary or spell-checker." },
      { key: "K", text: "Write it down on paper to see if the hand movement feels correct." }
    ]
  },
  {
    id: 9,
    question: "You are attending an educational seminar or lecture. You prefer:",
    options: [
      { key: "V", text: "Slides filled with flowcharts, diagrams, and visual maps of concepts." },
      { key: "A", text: "A speaker who explains ideas using stories and verbal discussions." },
      { key: "R", text: "Detailed handouts, textbooks, or notes to read during/after the talk." },
      { key: "K", text: "Interactive workshops, exercises, and physical mock-ups to build." }
    ]
  },
  {
    id: 10,
    question: "A website has a map of a city you are visiting. You would use it to:",
    options: [
      { key: "V", text: "Locate points of interest and view visual layout." },
      { key: "A", text: "Listen to the audio tour guide built into the map." },
      { key: "R", text: "Read the text list of instructions and reviews on the sidebar." },
      { key: "K", text: "Walk around using the GPS coordinate tracker to physically find the places." }
    ]
  },
  {
    id: 11,
    question: "You are studying for an exam or presentation. You would:",
    options: [
      { key: "V", text: "Draw mindmaps, charts, and color-coded diagrams of key relationships." },
      { key: "A", text: "Explain the concepts aloud to yourself or a study partner." },
      { key: "R", text: "Write summaries, lists of keywords, and read textbook definitions." },
      { key: "K", text: "Practice mock tests, solve sample quizzes, and walk around while rehearsing." }
    ]
  },
  {
    id: 12,
    question: "You are learning about a complex scientific process (e.g. photosynthesis). You would prefer:",
    options: [
      { key: "V", text: "A flowchart depicting the step-by-step cycle and molecules visually." },
      { key: "A", text: "A group discussion or audio podcast discussing the discovery." },
      { key: "R", text: "An article or text document detailing the chemical equations and descriptions." },
      { key: "K", text: "A lab experiment or virtual simulation where you control the light and water." }
    ]
  },
  {
    id: 13,
    question: "You want to buy a new board game. You would decide by:",
    options: [
      { key: "V", text: "Looking at the box art, board layout, and visual components." },
      { key: "A", text: "Asking a friend who plays it to explain how fun it is." },
      { key: "R", text: "Reading the official rulebook and text reviews online." },
      { key: "K", text: "Playing a demo round of the game at a local store." }
    ]
  },
  {
    id: 14,
    question: "You are checking into a hotel and want to know about local restaurants. You would:",
    options: [
      { key: "V", text: "Look at a tourist map showing restaurant locations and pictures." },
      { key: "A", text: "Ask the concierge or receptionist for verbal recommendations." },
      { key: "R", text: "Read local dining guidebooks or text lists of menus." },
      { key: "K", text: "Walk down the street and choose a place that looks busy and has a good vibe." }
    ]
  },
  {
    id: 15,
    question: "You are receiving feedback on a project or essay. You prefer:",
    options: [
      { key: "V", text: "Visual markups, color-highlighted charts, and performance diagrams." },
      { key: "A", text: "A face-to-face or voice conversation discussing the details." },
      { key: "R", text: "A written summary email with bullet points of changes needed." },
      { key: "K", text: "A workshop session where you work together to fix the issues." }
    ]
  },
  {
    id: 16,
    question: "You are explaining a complex business concept or plan to others. You would:",
    options: [
      { key: "V", text: "Sketch a flowchart or diagram on a whiteboard." },
      { key: "A", text: "Give a verbal presentation with a Q&A session." },
      { key: "R", text: "Distribute a written proposal, document report, or text memo." },
      { key: "K", text: "Walk them through a simulation, roleplay, or a prototype." }
    ]
  }
]

function Questionnaire() {
  const [answers, setAnswers] = useState(Array(16).fill([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.questionnaireCompleted) {
      navigate('/learn')
      return
    }

    const loadExisting = async () => {
      try {
        const res = await api.get('/recommendation/questionnaire')
        if (res.data?.questionnaire && Array.isArray(res.data.questionnaire) && res.data.questionnaire.length === 16) {
          setAnswers(res.data.questionnaire)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadExisting()
  }, [user, navigate])

  const isComplete = useMemo(() => answers.every(a => Array.isArray(a) && a.length > 0), [answers])

  const handleSelect = (qIndex, optKey) => {
    const nextAnswers = [...answers]
    const current = nextAnswers[qIndex] || []
    if (current.includes(optKey)) {
      nextAnswers[qIndex] = current.filter(k => k !== optKey)
    } else {
      nextAnswers[qIndex] = [...current, optKey]
    }
    setAnswers(nextAnswers)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!isComplete) {
      setError('Please select at least one option for each of the 16 questions.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const res = await api.post('/recommendation/questionnaire', { answers })
      setResult({
        learningStyle: res.data.learningStyle,
        recommendations: res.data.recommendations || []
      })
      updateUser(res.data.user)
      setTimeout(() => navigate('/learn'), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit questionnaire.')
    }
    setLoading(false)
  }

  return (
    <div className="page" style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="page-title" style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary-color, #6366f1), var(--secondary-color, #a855f7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          VARK Learning Modality Diagnostic
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--text-muted, #64748b)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
          Complete these 16 situational questions. Select <strong>all options that apply to you</strong> for each situation to map your multimodal learning profile.
        </p>
      </div>

      <form className="card" onSubmit={onSubmit} style={{ padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', backgroundColor: 'var(--card-bg, #ffffff)' }}>
        <div className="questionnaire-list" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {QUESTIONS.map((q, qIndex) => {
            const currentSelected = answers[qIndex] || []
            return (
              <div key={q.id} className="question-item" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '2rem' }}>
                <p style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-main, #1e293b)', marginBottom: '1.25rem' }}>
                  {qIndex + 1}. {q.question}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
                  {q.options.map((opt) => {
                    const isChecked = currentSelected.includes(opt.key)
                    return (
                      <label 
                        key={opt.key} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '1rem', 
                          cursor: 'pointer',
                          padding: '0.85rem 1.25rem',
                          borderRadius: '8px',
                          border: isChecked ? '2px solid var(--primary-color, #6366f1)' : '2px solid var(--border-color, #e2e8f0)',
                          backgroundColor: isChecked ? 'var(--primary-light, #f5f3ff)' : 'transparent',
                          transition: 'all 0.2s ease-in-out',
                          hover: { backgroundColor: 'var(--hover-bg, #f8fafc)' }
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{ marginTop: '0.2rem', cursor: 'pointer', accentColor: 'var(--primary-color, #6366f1)' }}
                          checked={isChecked}
                          onChange={() => handleSelect(qIndex, opt.key)}
                        />
                        <span style={{ fontSize: '0.975rem', color: isChecked ? 'var(--primary-dark, #4c1d95)' : 'var(--text-muted, #475569)', fontWeight: isChecked ? '550' : '400' }}>
                          {opt.text}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="error-message" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠ {error}
          </div>
        )}

        <div className="questionnaire-actions" style={{ marginTop: '3rem', textAlign: 'center' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ 
              padding: '0.85rem 3rem', 
              fontSize: '1.1rem', 
              fontWeight: '600', 
              borderRadius: '8px', 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--primary-color, #6366f1), var(--secondary-color, #a855f7))',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
              transition: 'transform 0.2s, opacity 0.2s'
            }}
          >
            {loading ? 'Analyzing Sensory Modalities...' : 'Generate My VARK Profile'}
          </button>
        </div>
      </form>

      {result && (
        <div className="card questionnaire-result" style={{ marginTop: '2.5rem', padding: '2rem', textAlign: 'center', border: '2px solid var(--success-color, #22c55e)', borderRadius: '12px', backgroundColor: '#f0fdf4' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#14532d', fontWeight: '700', marginBottom: '0.5rem' }}>
            Profile Detected: <span style={{ color: 'var(--primary-color, #6366f1)', textDecoration: 'underline' }}>{result.learningStyle}</span>
          </h3>
          <p style={{ color: '#166534', fontSize: '1rem' }}>
            Success! Your multimodal learning profile has been compiled. Redirecting to your adaptive portal...
          </p>
        </div>
      )}
    </div>
  )
}

export default Questionnaire
