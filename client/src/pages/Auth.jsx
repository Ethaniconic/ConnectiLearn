import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState(localStorage.getItem('lastName') || '')
  const [email, setEmail] = useState(localStorage.getItem('lastEmail') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        const res = await login(email, password)
        localStorage.setItem('lastEmail', email)
        if (res.user?.name) localStorage.setItem('lastName', res.user.name)
        navigate(res.user?.questionnaireCompleted ? '/chat' : '/questionnaire')
      } else {
        const res = await signup(name, email, password)
        localStorage.setItem('lastEmail', email)
        localStorage.setItem('lastName', name)
        navigate(res.user?.questionnaireCompleted ? '/chat' : '/questionnaire')
      }
    } catch (err) {
      setError(err.response?.data?.message || (isLogin ? 'Login failed' : 'Signup failed'))
    }
    setLoading(false)
  }

  const switchMode = (mode) => {
    setIsLogin(mode)
    setError('')
  }

  return (
    <div className="auth-container">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-wrapper">
        <div className="auth-header">
          <h1>ConnectiLearn</h1>
          <p>AI-Powered Learning Assistant</p>
        </div>
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => switchMode(true)}
          >
            Login
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => switchMode(false)}
          >
            Sign Up
          </button>
        </div>
        <div className="auth-card-container">
          <div className={`auth-flip-inner ${!isLogin ? 'is-flipped' : ''}`}>
            
            <div className="auth-flip-front">
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && isLogin && <p className="error-message">{error}</p>}
                <button type="submit" className="btn btn-full" disabled={loading}>
                  {loading ? 'Please wait...' : 'Login'}
                </button>
              </form>
            </div>

            <div className="auth-flip-back">
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && !isLogin && <p className="error-message">{error}</p>}
                <button type="submit" className="btn btn-full" disabled={loading}>
                  {loading ? 'Please wait...' : 'Create Account'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
