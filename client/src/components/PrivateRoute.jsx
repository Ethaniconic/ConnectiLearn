import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <Loader overlay message="Checking session..." />
  }
  
  if (!user) return <Navigate to="/auth" />
  
  return children
}

export default PrivateRoute
