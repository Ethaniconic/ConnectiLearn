import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

const HEARTBEAT_INTERVAL_MS = 20000
const MIN_TRACKABLE_DURATION_MS = 750
const SESSION_KEY = 'connectilearn_behavior_session'

function buildSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getTrackingUrl() {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  return `${base}/analytics/track`
}

function BehaviorTracker() {
  const { user } = useAuth()
  const location = useLocation()

  const currentPathRef = useRef('')
  const sessionIdRef = useRef('')
  const activeStartRef = useRef(null)
  const accumulatedMsRef = useRef(0)
  const tabSwitchesRef = useRef(0)
  const trackerReadyRef = useRef(false)
  const unloadSentRef = useRef(false)

  const sendTrackEvent = async (payload, keepalive = false) => {
    const token = localStorage.getItem('token')
    if (!token) return

    if (keepalive) {
      // navigator.sendBeacon is the browser-native solution for unload tracking:
      // it doesn't trigger CORS preflight, works even when the page is unloading,
      // and has no payload size issues like fetch keepalive.
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
          const blob = new Blob(
            [JSON.stringify({ ...payload, _token: token })],
            { type: 'application/json' }
          )
          navigator.sendBeacon(getTrackingUrl(), blob)
        } catch (err) {
          // sendBeacon failed (very rare) — swallow silently, non-critical
        }
        return
      }

      // Fallback: fetch with keepalive (works in most cases except large payloads)
      if (typeof fetch === 'function') {
        try {
          await fetch(getTrackingUrl(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload),
            keepalive: true
          })
        } catch (err) {
          // Expected on page unload — not an actionable error
          console.warn('Behavior tracker keepalive request failed (non-critical):', err.message)
        }
        return
      }
    }

    try {
      await api.post('/analytics/track', payload)
    } catch (err) {
      console.warn('Behavior tracker request failed:', err)
    }
  }

  const resetBucket = () => {
    accumulatedMsRef.current = 0
    tabSwitchesRef.current = 0
    activeStartRef.current = document.visibilityState === 'visible' ? Date.now() : null
    unloadSentRef.current = false
  }

  const flushCurrentPage = (reason, keepalive = false) => {
    if (!trackerReadyRef.current || !user || !currentPathRef.current || !sessionIdRef.current) return

    let activeMs = accumulatedMsRef.current
    if (document.visibilityState === 'visible' && activeStartRef.current) {
      activeMs += Date.now() - activeStartRef.current
    }

    const durationMs = Math.max(0, Math.round(activeMs))
    const tabSwitches = tabSwitchesRef.current
    const incrementVisit = reason === 'route_change' || reason === 'page_unload' || reason === 'tracker_unmount'

    if (durationMs < MIN_TRACKABLE_DURATION_MS && tabSwitches === 0 && !incrementVisit) {
      return
    }

    const payload = {
      sessionId: sessionIdRef.current,
      pagePath: currentPathRef.current,
      durationMs,
      tabSwitches,
      incrementVisit,
      reason,
      occurredAt: new Date().toISOString()
    }

    resetBucket()
    sendTrackEvent(payload, keepalive)
  }

  useEffect(() => {
    if (!user) {
      trackerReadyRef.current = false
      currentPathRef.current = ''
      sessionIdRef.current = ''
      activeStartRef.current = null
      accumulatedMsRef.current = 0
      tabSwitchesRef.current = 0
      unloadSentRef.current = false
      return
    }

    const storedSession = sessionStorage.getItem(SESSION_KEY)
    if (storedSession) {
      sessionIdRef.current = storedSession
    } else {
      const newSession = buildSessionId()
      sessionStorage.setItem(SESSION_KEY, newSession)
      sessionIdRef.current = newSession
    }

    trackerReadyRef.current = true
  }, [user])

  useEffect(() => {
    if (!user || !trackerReadyRef.current) return

    const nextPath = `${location.pathname}${location.search || ''}`
    if (currentPathRef.current && currentPathRef.current !== nextPath) {
      flushCurrentPage('route_change')
    }

    currentPathRef.current = nextPath
    resetBucket()
  }, [location.pathname, location.search, user])

  useEffect(() => {
    if (!user || !trackerReadyRef.current) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (activeStartRef.current) {
          accumulatedMsRef.current += Date.now() - activeStartRef.current
          activeStartRef.current = null
        }
        tabSwitchesRef.current += 1
        flushCurrentPage('tab_hidden', true)
      } else if (!activeStartRef.current) {
        activeStartRef.current = Date.now()
      }
    }

    const handleUnload = () => {
      if (unloadSentRef.current) return
      unloadSentRef.current = true
      flushCurrentPage('page_unload', true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleUnload)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleUnload)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [user])

  useEffect(() => {
    if (!user || !trackerReadyRef.current) return

    const timer = setInterval(() => {
      flushCurrentPage('heartbeat')
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    return () => {
      flushCurrentPage('tracker_unmount', true)
    }
  }, [user])

  return null
}

export default BehaviorTracker