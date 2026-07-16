import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Loader from '../components/Loader'
import { LayoutDashboard, CheckCircle, Clock, FileText, TrendingUp, BarChart3, Sparkles, Eye, Headphones, Hand, BookOpenText, ArrowRight, Timer, Shuffle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [documents, setDocuments] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [analyticsPages, setAnalyticsPages] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  const fetchDashboardData = async () => {
    try {
      const [dashboardResult, analyticsResult] = await Promise.allSettled([
        api.get('/dashboard/stats'),
        api.get('/analytics/summary')
      ])

      if (dashboardResult.status === 'fulfilled') {
        setStats(dashboardResult.value.data.stats)
        setDocuments(dashboardResult.value.data.documents)
        setRecommendations(dashboardResult.value.data.recommendations || [])
      } else {
        console.error('Failed to fetch dashboard data', dashboardResult.reason)
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalyticsSummary(analyticsResult.value.data.summary || null)
        setAnalyticsPages(analyticsResult.value.data.pageBreakdown || [])
      } else {
        console.error('Failed to fetch analytics data', analyticsResult.reason)
      }
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

  const formatPathLabel = (path) => {
    if (!path) return 'N/A'
    if (path === '/') return 'Home'

    const route = path.split('?')[0]
    return route
      .replace(/^\//, '')
      .split('/')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' / ')
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

      {user?.varkScores && Object.keys(user.varkScores).length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={20} color="var(--primary)" /> Your Cognitive VARK Sensory Profile
          </h3>
          <VarkVisualizer scores={user.varkScores} />
        </div>
      )}

      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Timer size={20} /> Behavioural Analysis
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)' }}>Active Time</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.3em', fontWeight: 700 }}>
              {analyticsSummary?.totalActiveMinutes || 0} min
            </p>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)' }}>Tab Switches</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.3em', fontWeight: 700 }}>
              {analyticsSummary?.totalTabSwitches || 0}
            </p>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)' }}>Focus Score</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.3em', fontWeight: 700 }}>
              {analyticsSummary?.focusScore ?? 100}%
            </p>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)' }}>Switches / Hour</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.3em', fontWeight: 700 }}>
              {analyticsSummary?.tabSwitchesPerHour ?? 0}
            </p>
          </div>
        </div>

        {analyticsPages.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {analyticsPages.map((page) => (
              <div
                key={page.pagePath}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-tertiary)'
                }}
              >
                <div style={{ fontWeight: 600 }}>{formatPathLabel(page.pagePath)}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>{page.totalActiveMinutes} min</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shuffle size={14} /> {page.tabSwitchCount}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Visits: {page.visitCount}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Behavioural analytics will appear after some activity in your study pages.
          </p>
        )}
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
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
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

export default Dashboard
