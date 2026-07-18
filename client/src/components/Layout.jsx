import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import api from '../utils/api'
import { MessageSquare, GraduationCap, UploadCloud, Info, Settings, Pin, PinOff, Trash2, ClipboardList, Menu, LogOut, LayoutDashboard, Eye, Headphones, Hand, BookOpenText } from 'lucide-react'
import Loader from './Loader'

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [chats, setChats] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [activeChat, setActiveChat] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const mainContentRef = useRef(null)

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

  // Lightweight route transition loader for polish
  useEffect(() => {
    setRouteLoading(true)
    const t = setTimeout(() => setRouteLoading(false), 350)
    return () => clearTimeout(t)
  }, [location.pathname])

  // Auto-focus the scroll container on route changes so the mouse wheel
  // scrolls immediately without the user needing to click first.
  useEffect(() => {
    const t = setTimeout(() => {
      mainContentRef.current?.focus({ preventScroll: true })
    }, 360) // Just after the route-loading overlay clears (350ms)
    return () => clearTimeout(t)
  }, [location.pathname])

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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const pinnedChats = chats.filter(c => c.isPinned)
  const recentChats = chats.filter(c => !c.isPinned)
  const isOnChat = location.pathname === '/chat'

  return (
    <div className="layout">
      {routeLoading && <Loader overlay message="Loading view..." />}

      {/* Top Mobile Header Bar for <= 768px viewports */}
      <div className="mobile-header-bar">
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={22} />
        </button>
        <div className="sidebar-logo">ConnectiLearn</div>
        <ThemeToggle />
      </div>

      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '10px' }}>
          <button 
            onClick={toggleSidebar} 
            className={`hamburger-btn ${isCollapsed ? 'is-active' : ''}`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={20} />
          </button>
          {!isCollapsed && <div className="sidebar-logo" style={{ flex: 1 }}>ConnectiLearn</div>}
          {!isCollapsed && <ThemeToggle />}
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <MessageSquare size={18} /> {!isCollapsed && <span>Chat</span>}
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} /> {!isCollapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink to="/learn" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <GraduationCap size={18} /> {!isCollapsed && <span>Learn Hub</span>}
          </NavLink>
          <NavLink to="/questionnaire" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ClipboardList size={18} /> {!isCollapsed && <span>Questionnaire</span>}
          </NavLink>
          <NavLink to="/uploads" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <UploadCloud size={18} /> {!isCollapsed && <span>Uploads</span>}
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Info size={18} /> {!isCollapsed && <span>About</span>}
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={18} /> {!isCollapsed && <span>Admin</span>}
            </NavLink>
          )}
        </nav>

        {/* One-Click Modes Menu */}
        <div className="sidebar-modes-menu" style={{ 
          padding: isCollapsed ? '10px 5px' : '20px 14px', 
          borderTop: '1px solid var(--sidebar-border)',
          marginTop: '10px'
        }}>
          {!isCollapsed && <div style={{ fontSize: '0.7em', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Quick Modes</div>}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isCollapsed ? '1fr' : 'repeat(4, 1fr)', 
            gap: isCollapsed ? '12px' : '8px' 
          }}>
            <button onClick={() => navigate('/learn', { state: { forcedMode: 'visual', ts: Date.now() }, replace: false })} className="mode-dot visual" title="Visual Mode">
              <Eye size={isCollapsed ? 20 : 16} />
            </button>
            <button onClick={() => navigate('/learn', { state: { forcedMode: 'auditory', ts: Date.now() }, replace: false })} className="mode-dot auditory" title="Auditory Mode">
              <Headphones size={isCollapsed ? 20 : 16} />
            </button>
            <button onClick={() => navigate('/learn', { state: { forcedMode: 'readwrite', ts: Date.now() }, replace: false })} className="mode-dot readwrite" title="Read/Write Mode">
              <BookOpenText size={isCollapsed ? 20 : 16} />
            </button>
            <button onClick={() => navigate('/learn', { state: { forcedMode: 'kinesthetic', ts: Date.now() }, replace: false })} className="mode-dot kinesthetic" title="Kinesthetic Mode">
              <Hand size={isCollapsed ? 20 : 16} />
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
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
                        <button onClick={(e) => pinChat(e, chat._id)} title="Pin">
                          <Pin size={16} />
                        </button>
                        <button onClick={(e) => deleteChat(e, chat._id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
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
                        <button onClick={(e) => pinChat(e, chat._id)} title="Pin">
                          <PinOff size={16} />
                        </button>
                        <button onClick={(e) => deleteChat(e, chat._id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
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
        )}

        <div className="sidebar-footer">
          {!isCollapsed ? (
            <div className="user-info">
              {user?.name} ({user?.role})
            </div>
          ) : null}
          <button className="btn btn-secondary btn-full" onClick={handleLogout} style={isCollapsed ? { padding: '10px', display: 'flex', justifyContent: 'center' } : { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogOut size={isCollapsed ? 20 : 18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <main
        className="main-content"
        ref={mainContentRef}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
