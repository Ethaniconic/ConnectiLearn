import express from 'express'
import { auth } from '../middleware/auth.js'
import BehaviorMetric from '../models/BehaviorMetric.js'

const router = express.Router()

const MAX_DURATION_MS = 4 * 60 * 60 * 1000
const MAX_TAB_SWITCHES = 200

router.post('/track', auth, async (req, res) => {
  try {
    const {
      sessionId,
      pagePath,
      durationMs = 0,
      tabSwitches = 0,
      incrementVisit = false,
      reason = 'heartbeat',
      occurredAt
    } = req.body || {}

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'Valid sessionId is required' })
    }

    if (!pagePath || typeof pagePath !== 'string' || !pagePath.startsWith('/')) {
      return res.status(400).json({ message: 'Valid pagePath is required' })
    }

    const safeDuration = Math.min(Math.max(Number(durationMs) || 0, 0), MAX_DURATION_MS)
    const safeTabSwitches = Math.min(Math.max(Number(tabSwitches) || 0, 0), MAX_TAB_SWITCHES)
    const safeVisitIncrement = incrementVisit ? 1 : 0

    if (safeDuration === 0 && safeTabSwitches === 0 && safeVisitIncrement === 0) {
      return res.json({ ok: true, skipped: true })
    }

    const eventAt = occurredAt ? new Date(occurredAt) : new Date()
    const normalizedEventAt = Number.isNaN(eventAt.getTime()) ? new Date() : eventAt

    const metric = await BehaviorMetric.findOneAndUpdate(
      {
        userId: req.user._id,
        sessionId: sessionId.trim(),
        pagePath: pagePath.trim()
      },
      {
        $inc: {
          totalTimeMs: safeDuration,
          tabSwitchCount: safeTabSwitches,
          visitCount: safeVisitIncrement
        },
        $set: {
          lastSeenAt: normalizedEventAt,
          lastReason: typeof reason === 'string' ? reason.slice(0, 50) : 'heartbeat',
          lastUserAgent: (req.get('user-agent') || '').slice(0, 300)
        },
        $setOnInsert: {
          firstSeenAt: normalizedEventAt
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    )

    return res.json({
      ok: true,
      metric: {
        id: metric._id,
        totalTimeMs: metric.totalTimeMs,
        tabSwitchCount: metric.tabSwitchCount,
        visitCount: metric.visitCount
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id

    const [overall] = await BehaviorMetric.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalTimeMs: { $sum: '$totalTimeMs' },
          totalTabSwitches: { $sum: '$tabSwitchCount' },
          totalVisits: { $sum: '$visitCount' },
          trackedPages: { $addToSet: '$pagePath' }
        }
      }
    ])

    const pageBreakdown = await BehaviorMetric.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$pagePath',
          totalTimeMs: { $sum: '$totalTimeMs' },
          tabSwitchCount: { $sum: '$tabSwitchCount' },
          visitCount: { $sum: '$visitCount' },
          lastSeenAt: { $max: '$lastSeenAt' }
        }
      },
      { $sort: { totalTimeMs: -1 } },
      { $limit: 5 }
    ])

    const totalTimeMs = overall?.totalTimeMs || 0
    const totalTabSwitches = overall?.totalTabSwitches || 0
    const totalVisits = overall?.totalVisits || 0
    const trackedPages = overall?.trackedPages?.length || 0
    const tabSwitchesPerHour = totalTimeMs > 0
      ? Number((totalTabSwitches / (totalTimeMs / (60 * 60 * 1000))).toFixed(2))
      : 0

    const focusPenalty = totalTimeMs > 0
      ? (totalTabSwitches / Math.max(totalTimeMs / (60 * 1000), 1)) * 8
      : 0
    const focusScore = Math.max(0, Math.min(100, Math.round(100 - focusPenalty)))

    return res.json({
      summary: {
        totalTimeMs,
        totalActiveMinutes: Math.round(totalTimeMs / 60000),
        totalTabSwitches,
        totalVisits,
        trackedPages,
        tabSwitchesPerHour,
        focusScore
      },
      pageBreakdown: pageBreakdown.map((page) => ({
        pagePath: page._id,
        totalTimeMs: page.totalTimeMs,
        totalActiveMinutes: Math.round(page.totalTimeMs / 60000),
        tabSwitchCount: page.tabSwitchCount,
        visitCount: page.visitCount,
        lastSeenAt: page.lastSeenAt
      }))
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

export default router