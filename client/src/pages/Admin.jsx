import { useState, useEffect } from 'react'
import api from '../utils/api'

function Admin() {
  const [stats, setStats] = useState({ totalUsers: 0, totalDocuments: 0, totalChats: 0 })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data.users || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user and all their data?')) return
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers(prev => prev.filter(u => u._id !== id))
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }))
    } catch (err) {
      alert('Delete failed')
    }
  }

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role: newRole } : u))
    } catch (err) {
      alert('Update failed')
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/admin/export/csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'connectilearn_research_data.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to export research CSV data')
    }
  }

  if (loading) return <p style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</p>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Admin Panel</h1>
        <button 
          onClick={handleExportCSV} 
          className="btn btn-primary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          📥 Export Research CSV
        </button>
      </div>
      
      <div className="stats-grid">
        <div className="card stat-card">
          <h3>{stats.totalUsers}</h3>
          <p>Total Users</p>
        </div>
        <div className="card stat-card">
          <h3>{stats.totalDocuments}</h3>
          <p>Total Documents</p>
        </div>
        <div className="card stat-card">
          <h3>{stats.totalChats}</h3>
          <p>Active Chats</p>
        </div>
      </div>

      {stats.globalResearchMetrics && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px', color: 'var(--text-dark)' }}>Global Learning Style Analytics (Research Data)</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>Aligned Study Focus Score</h4>
              <p style={{ margin: '8px 0 0', fontSize: '1.8em', fontWeight: 800, color: 'var(--success)' }}>
                {stats.globalResearchMetrics.avgAlignedFocus}%
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>Matched modality engagement</p>
            </div>
            
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>Misaligned Study Focus Score</h4>
              <p style={{ margin: '8px 0 0', fontSize: '1.8em', fontWeight: 800, color: 'var(--danger)' }}>
                {stats.globalResearchMetrics.avgMisalignedFocus}%
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>Unmatched modality engagement</p>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-muted)' }}>Quiz Tab Switches / Hour</h4>
              <p style={{ margin: '8px 0 0', fontSize: '1.8em', fontWeight: 800, color: 'var(--warning)' }}>
                {stats.globalResearchMetrics.avgQuizDisruptionsPerHour}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>Disruption during active testing</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ marginBottom: '12px', color: 'var(--text-dark)' }}>Style Count Distribution</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stats.styleDistribution || {}).map(([style, count]) => (
                  <div key={style} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <strong>{style}</strong>
                    <span>{count} users</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: '12px', color: 'var(--text-dark)' }}>Avg. Modality Metrics Comparison</h4>
              <table style={{ width: '100%', fontSize: '0.9em' }}>
                <thead>
                  <tr>
                    <th>Modality</th>
                    <th>Time Spent (min)</th>
                    <th>Avg Focus Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(stats.globalResearchMetrics.avgModalityTimes || {}).map((m) => (
                    <tr key={m}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{m}</td>
                      <td>{stats.globalResearchMetrics.avgModalityTimes[m]}m</td>
                      <td>{stats.globalResearchMetrics.avgModalityFocus[m]}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px', color: 'var(--text-dark)' }}>Users</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge badge-${user.role}`}>{user.role}</span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ marginRight: '8px', padding: '8px 14px', fontSize: '0.85em' }}
                    onClick={() => toggleRole(user._id, user.role)}
                  >
                    Toggle Role
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '8px 14px', fontSize: '0.85em' }}
                    onClick={() => handleDelete(user._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Admin
