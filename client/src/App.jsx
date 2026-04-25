import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import BehaviorTracker from './components/BehaviorTracker'
import Auth from './pages/Auth'
import Chat from './pages/Chat'
import Uploads from './pages/Uploads'
import About from './pages/About'
import Admin from './pages/Admin'
import Learn from './pages/Learn'
import Questionnaire from './pages/Questionnaire'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <BehaviorTracker />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/signup" element={<Navigate to="/auth" replace />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/chat" replace />} />
                <Route path="questionnaire" element={<Questionnaire />} />
              <Route path="chat" element={<Chat />} />
              <Route path="learn" element={<Learn />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="uploads" element={<Uploads />} />
              <Route path="about" element={<About />} />
              <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
