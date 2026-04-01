import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const QUESTIONS = [
  "I learn better by reading what the teacher writes on the chalkboard.",
  "When I read instructions, I remember them better.",
  "I understand better when I read instructions.",
  "I learn better by reading than by listening to someone.",
  "I learn more by reading textbooks than by listening to lectures.",
  "When the teacher tells me the instructions I understand better.",
  "When someone tells me how to do something in class, I learn it better.",
  "I remember things I have heard in class better than things I have read.",
  "I learn better in class when the teacher gives a lecture.",
  "I learn better in class when I listen to someone.",
  "I prefer to learn by doing something in class.",
  "When I do things in class, I learn better.",
  "I enjoy learning in class by doing experiments.",
  "I understand things better in class when I participate in role-playing.",
  "I understand things better in class when I participate in role-playing (Scenario B).",
  "I understand complex ideas better when they are presented in maps or charts.",
  "I prefer to draw diagrams or flowcharts to solve a problem.",
  "I remember faces and visual layouts better than names or spoken words.",
  "I find it helpful to see a live demonstration before I start learning a new skill.",
  "I prefer to use a whiteboard or digital canvas to brainstorm ideas visually."
]

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" }
]

function Questionnaire() {
  const [answers, setAnswers] = useState(Array(20).fill(null))
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
        if (res.data?.questionnaire && Array.isArray(res.data.questionnaire) && res.data.questionnaire.length === 20) {
          setAnswers(res.data.questionnaire.map(Number))
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadExisting()
  }, [user, navigate])

  const isComplete = useMemo(() => answers.every(a => a !== null), [answers])

  const handleSelect = (qIndex, val) => {
    const nextAnswers = [...answers]
    nextAnswers[qIndex] = val
    setAnswers(nextAnswers)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!isComplete) {
      setError('Please answer all 20 questions.')
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
      setTimeout(() => navigate('/learn'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit questionnaire.')
    }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">VARK Learning Style Assessment</h1>
        <p className="page-subtitle">
          Answer these 20 questions to determine your specific learning profile.
        </p>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <div className="questionnaire-list" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {QUESTIONS.map((qText, qIndex) => (
            <div key={qIndex} className="question-item">
              <p style={{ fontWeight: '500', marginBottom: '1rem' }}>
                {qIndex + 1}. {qText}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {LIKERT_OPTIONS.map((opt) => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`q${qIndex}`}
                      checked={answers[qIndex] === opt.value}
                      onChange={() => handleSelect(qIndex, opt.value)}
                      required
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}

        <div className="questionnaire-actions" style={{ marginTop: '2rem' }}>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Analyzing...' : 'Submit Answers'}
          </button>
        </div>
      </form>

      {result && (
        <div className="card questionnaire-result" style={{ marginTop: '2rem' }}>
          <h3>Detected Style: <span style={{ color: 'var(--primary-color)' }}>{result.learningStyle}</span></h3>
          <p>Redirecting to your new personalized recommendations...</p>
        </div>
      )}
    </div>
  )
}

export default Questionnaire
