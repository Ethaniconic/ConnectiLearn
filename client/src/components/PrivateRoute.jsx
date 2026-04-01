import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  if (loading) {
    return <Loader overlay message="Checking session..." />
  }
  
  if (!user) return <Navigate to="/auth" />
  if (!user.questionnaireCompleted && location.pathname !== '/questionnaire') {
    return <Navigate to="/questionnaire" replace />
  }
  
  return children
}

export default PrivateRoute
