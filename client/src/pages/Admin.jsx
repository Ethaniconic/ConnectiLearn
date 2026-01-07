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

  if (loading) return <p style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading...</p>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
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
