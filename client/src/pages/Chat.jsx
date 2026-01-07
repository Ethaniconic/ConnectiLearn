import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../utils/api'

function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchHistory()
    window.addEventListener('chatUpdated', fetchHistory)
    return () => window.removeEventListener('chatUpdated', fetchHistory)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/chat/history')
      setMessages(res.data.history || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const query = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)

    try {
      const res = await api.post('/chat/query', { query })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }])
      window.dispatchEvent(new CustomEvent('chatCreated'))
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not get response' }])
    }
    setLoading(false)
  }

  const clearHistory = async () => {
    try {
      await api.delete('/chat/history')
      setMessages([])
      window.dispatchEvent(new CustomEvent('chatCreated'))
    } catch (err) {
      console.error(err)
    }
  }

  const speakMessage = (text, id) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      if (speakingId === id) {
        setSpeakingId(null)
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.onend = () => setSpeakingId(null)
      setSpeakingId(id)
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="chat-page">
      <div className="page-header">
        <h1 className="page-title">Chat</h1>
        <button className="btn btn-secondary" onClick={clearHistory}>Clear</button>
      </div>
      <div className="card chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="messages-empty">
              <p>Start a conversation by asking a question about your documents</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  <button 
                    className="speak-btn"
                    onClick={() => speakMessage(msg.content, i)}
                    title={speakingId === i ? 'Stop' : 'Listen'}
                  >
                    {speakingId === i ? '⏹️' : '🔊'}
                  </button>
                </>
              ) : (
                msg.content
              )}
            </div>
          ))}
          {loading && <div className="message thinking">Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input-container" onSubmit={handleSubmit}>
          <input
            type="text"
            className="input"
            placeholder="Ask a question about your documents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn" disabled={loading}>Send</button>
        </form>
      </div>
    </div>
  )
}

export default Chat
