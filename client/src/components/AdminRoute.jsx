import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <Loader overlay message="Checking admin access..." />
  }
  
  if (!user || user.role !== 'admin') return <Navigate to="/chat" />
  
  return children
}

export default AdminRoute
