import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'var(--text-light)' }}>Loading...</div>
      </div>
    )
  }
  
  if (!user || user.role !== 'admin') return <Navigate to="/chat" />
  
  return children
}

export default AdminRoute
