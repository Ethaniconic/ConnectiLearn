import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import api from '../utils/api'

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)

  const fetchChats = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/chat/list')
      setChats(res.data.chats || [])
    } catch (err) {
      console.error('Error fetching chats:', err)
    }
  }, [user])

  const fetchActiveChat = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/chat/history')
      setActiveChat(res.data.chatId || null)
    } catch (err) {
      console.error('Error fetching active chat:', err)
    }
  }, [user])

  useEffect(() => {
    fetchChats()
    fetchActiveChat()
  }, [fetchChats, fetchActiveChat])

  useEffect(() => {
    const handleChatCreated = () => {
      fetchChats()
      fetchActiveChat()
    }
    window.addEventListener('chatCreated', handleChatCreated)
    return () => window.removeEventListener('chatCreated', handleChatCreated)
  }, [fetchChats, fetchActiveChat])

  const newChat = async () => {
    try {
      const res = await api.post('/chat/new')
      setActiveChat(res.data.chat._id)
      await fetchChats()
      navigate('/chat')
      window.dispatchEvent(new CustomEvent('chatUpdated'))
    } catch (err) {
      console.error('Error creating new chat:', err)
    }
  }

  const switchChat = async (chatId) => {
    try {
      await api.post(`/chat/switch/${chatId}`)
      setActiveChat(chatId)
      navigate('/chat')
      window.dispatchEvent(new CustomEvent('chatUpdated'))
    } catch (err) {
      console.error('Error switching chat:', err)
    }
  }

  const pinChat = async (e, chatId) => {
    e.stopPropagation()
    try {
      await api.post(`/chat/pin/${chatId}`)
      await fetchChats()
    } catch (err) {
      console.error('Error pinning chat:', err)
    }
  }

  const deleteChat = async (e, chatId) => {
    e.stopPropagation()
    try {
      await api.delete(`/chat/${chatId}`)
      await fetchChats()
      if (chatId === activeChat) {
        await fetchActiveChat()
        window.dispatchEvent(new CustomEvent('chatUpdated'))
      }
    } catch (err) {
      console.error('Error deleting chat:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000) return 'Today'
    if (diff < 172800000) return 'Yesterday'
    return d.toLocaleDateString()
  }

  const pinnedChats = chats.filter(c => c.isPinned)
  const recentChats = chats.filter(c => !c.isPinned)
  const isOnChat = location.pathname === '/chat'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">ConnectiLearn</div>
          <ThemeToggle />
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            💬 Chat
          </NavLink>
          <NavLink to="/learn" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🎓 Learn
          </NavLink>
          <NavLink to="/uploads" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            📁 Uploads
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            ℹ️ About
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              ⚙️ Admin
            </NavLink>
          )}
        </nav>
        
        <div className="chat-history-section">
          <div className="chat-history-header">
            <span>Chat History</span>
            <button className="new-chat-btn" onClick={newChat}>+</button>
          </div>
          <div className="chat-history-list">
            {pinnedChats.length > 0 && (
              <div className="chat-group">
                <div className="chat-group-title">📌 Pinned</div>
                {pinnedChats.map(chat => (
                  <div 
                    key={chat._id} 
                    className={`chat-history-item ${chat._id === activeChat && isOnChat ? 'active' : ''}`}
                    onClick={() => switchChat(chat._id)}
                  >
                    <div className="chat-history-item-content">
                      <span className="chat-history-item-title">{chat.title}</span>
                      <span className="chat-history-item-date">{formatDate(chat.updatedAt)}</span>
                    </div>
                    <div className="chat-history-item-actions">
                      <button onClick={(e) => pinChat(e, chat._id)}>📌</button>
                      <button onClick={(e) => deleteChat(e, chat._id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentChats.length > 0 && (
              <div className="chat-group">
                <div className="chat-group-title">💬 Recent</div>
                {recentChats.map(chat => (
                  <div 
                    key={chat._id} 
                    className={`chat-history-item ${chat._id === activeChat && isOnChat ? 'active' : ''}`}
                    onClick={() => switchChat(chat._id)}
                  >
                    <div className="chat-history-item-content">
                      <span className="chat-history-item-title">{chat.title}</span>
                      <span className="chat-history-item-date">{formatDate(chat.updatedAt)}</span>
                    </div>
                    <div className="chat-history-item-actions">
                      <button onClick={(e) => pinChat(e, chat._id)}>📍</button>
                      <button onClick={(e) => deleteChat(e, chat._id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {chats.length === 0 && (
              <div className="chat-history-empty">No chats yet</div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            {user?.name} ({user?.role})
          </div>
          <button className="btn btn-secondary btn-full" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
