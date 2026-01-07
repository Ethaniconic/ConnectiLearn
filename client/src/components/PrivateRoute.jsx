import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'var(--text-light)' }}>Loading...</div>
      </div>
    )
  }
  
  if (!user) return <Navigate to="/auth" />
  
  return children
}

export default PrivateRoute
