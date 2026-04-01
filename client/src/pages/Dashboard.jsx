import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Loader from '../components/Loader'
import { LayoutDashboard, CheckCircle, Clock, FileText, TrendingUp, BarChart3, Sparkles, Eye, Headphones, Hand, BookOpenText, ArrowRight } from 'lucide-react'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard/stats')
      setStats(res.data.stats)
      setDocuments(res.data.documents)
      setRecommendations(res.data.recommendations || [])
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const toggleComplete = async (docId) => {
    try {
      await api.put(`/documents/${docId}/complete`)
      fetchDashboardData()
    } catch (err) {
      console.error('Failed to toggle completion status', err)
    }
  }

  const handleActivityClick = (targetMode, actionType) => {
    navigate('/learn', { state: { forcedMode: targetMode, actionType: actionType } })
  }

  const getActivityIcon = (mode) => {
    switch(mode) {
      case 'visual': return <Eye size={24} />
      case 'auditory': return <Headphones size={24} />
      case 'kinesthetic': return <Hand size={24} />
      case 'readwrite': return <BookOpenText size={24} />
      default: return <Sparkles size={24} />
    }
  }

  if (loading) return <Loader overlay message="Gathering your progress..." />

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Learning Dashboard</h1>
        <p className="page-subtitle">Track your mastery and academic growth</p>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '5px' }}>Total Notes</p>
              <h2 style={{ fontSize: '1.8em', fontWeight: '700' }}>{stats?.totalDocs || 0}</h2>
            </div>
            <FileText size={28} style={{ color: 'var(--primary)', opacity: 0.8 }} />
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '5px' }}>Completed</p>
              <h2 style={{ fontSize: '1.8em', fontWeight: '700' }}>{stats?.completedDocs || 0}</h2>
            </div>
            <CheckCircle size={28} style={{ color: 'var(--success)', opacity: 0.8 }} />
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '5px' }}>Mastery Rate</p>
              <h2 style={{ fontSize: '1.8em', fontWeight: '700' }}>{stats?.completionRate || 0}%</h2>
            </div>
            <TrendingUp size={28} style={{ color: 'var(--accent)', opacity: 0.8 }} />
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '5px' }}>Active Style</p>
              <h2 style={{ fontSize: '1.4em', fontWeight: '700' }}>{stats?.learningStyle}</h2>
            </div>
            <BarChart3 size={28} style={{ color: 'var(--primary-light)', opacity: 0.8 }} />
          </div>
        </div>
      </div>

      {/* Learning Modes Hub - One-Click Access to All 4 Modes */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutDashboard size={20} color="var(--primary)" /> Learning Modes Hub
        </h3>
        <div className="modes-hub-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '20px' 
        }}>
          <div className="card mode-hub-card visual" onClick={() => handleActivityClick('visual')}>
            <Eye size={32} />
            <h4>Visual</h4>
            <p>Diagrams & Flashcards</p>
            <div className="mode-hover-hint">Launch Mode <ArrowRight size={14} /></div>
          </div>
          
          <div className="card mode-hub-card auditory" onClick={() => handleActivityClick('auditory')}>
            <Headphones size={32} />
            <h4>Auditory</h4>
            <p>Podcasts & Voice</p>
            <div className="mode-hover-hint">Launch Mode <ArrowRight size={14} /></div>
          </div>
          
          <div className="card mode-hub-card readwrite" onClick={() => handleActivityClick('readwrite')}>
            <BookOpenText size={32} />
            <h4>Read/Write</h4>
            <p>Notes & Summaries</p>
            <div className="mode-hover-hint">Launch Mode <ArrowRight size={14} /></div>
          </div>
          
          <div className="card mode-hub-card kinesthetic" onClick={() => handleActivityClick('kinesthetic')}>
            <Hand size={32} />
            <h4>Kinesthetic</h4>
            <p>Interactive Quizzes</p>
            <div className="mode-hover-hint">Launch Mode <ArrowRight size={14} /></div>
          </div>
        </div>
      </div>

      {/* Recommended Activities Grid */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color="var(--primary)" /> Recommended Mastery Activities
        </h3>
        <div className="recommendations-container" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {recommendations.length > 0 ? (
            recommendations.slice(0, 2).map((item) => (
              <div 
                key={item.id} 
                className="card activity-card clickable-card"
                onClick={() => handleActivityClick(item.targetMode, item.actionType)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div className="activity-card-glow" />
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '12px', 
                    background: 'var(--bg-tertiary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    flexShrink: 0
                  }}>
                    {getActivityIcon(item.targetMode)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {item.title}
                      <ArrowRight size={16} className="arrow-icon" />
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', margin: '0 0 10px 0' }}>{item.format}</p>
                    <p style={{ fontSize: '0.9em', lineHeight: '1.5', margin: 0 }}>{item.action}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Complete the style assessment to unlock personalized activities.</p>
              <button className="btn" style={{ marginTop: '10px' }} onClick={() => navigate('/questionnaire')}>Take Assessment</button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={20} /> Content Mastery Tracker
        </h3>
        {documents.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No documents uploaded yet. Start learning to see progress!</p>
        ) : (
          <div className="docs-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.map(doc => (
              <div key={doc._id} className="doc-mastery-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '15px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '12px',
                border: doc.isCompleted ? '1px solid var(--success-light)' : '1px solid transparent',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '8px', 
                    background: doc.isCompleted ? 'var(--success)' : 'var(--border)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05em' }}>{doc.originalName}</h4>
                    <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                      Added {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => toggleComplete(doc._id)}
                  className={`btn ${doc.isCompleted ? 'btn-success' : 'btn-secondary'}`}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.9em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {doc.isCompleted ? (
                    <><CheckCircle size={16} /> Completed</>
                  ) : (
                    'Mark as Done'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
