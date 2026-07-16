import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Sparkles, Network, ZoomIn, ZoomOut, RotateCcw, ChevronRight } from 'lucide-react'

const BRANCH_COLORS = [
  '#4F86F7', // Blue
  '#34D399', // Emerald Green
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316'  // Orange
]

/**
 * Normalizes a child item
 */
function normalizeChild(child) {
  if (typeof child === 'string') {
    return { type: 'leaf', text: child }
  }
  if (child && typeof child === 'object') {
    const name = child.name || child.title || child.text || ''
    const details = child.details || child.children || []
    if (name && Array.isArray(details) && details.length > 0) {
      return { type: 'subbranch', name, details }
    }
    if (name) {
      return { type: 'leaf', text: name }
    }
    return { type: 'leaf', text: JSON.stringify(child) }
  }
  return { type: 'leaf', text: String(child) }
}

/**
 * Renders a single child item
 */
function ChildItem({ child, branchColor, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const normalized = normalizeChild(child)

  if (normalized.type === 'leaf') {
    return (
      <div style={{
        fontSize: '0.88em',
        color: 'var(--text)',
        lineHeight: '1.5',
        padding: '6px 10px',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px'
      }}>
        <span style={{ color: branchColor, fontWeight: 700, marginTop: '1px' }}>📌</span>
        <span>{normalized.text}</span>
      </div>
    )
  }

  return (
    <div style={{
      border: `1px solid ${branchColor}33`,
      borderRadius: '10px',
      overflow: 'hidden',
      background: 'var(--bg-secondary)'
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: `${branchColor}12`,
          borderBottom: expanded ? `1px solid ${branchColor}22` : 'none',
          userSelect: 'none'
        }}
      >
        <span style={{ color: branchColor, fontSize: '0.85em' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span style={{ fontSize: '0.88em', fontWeight: 600, color: 'var(--text-dark)' }}>
          {normalized.name}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.7em',
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          padding: '2px 6px',
          borderRadius: '8px'
        }}>
          {normalized.details.length}
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {normalized.details.map((detail, di) => (
            <ChildItem key={di} child={detail} branchColor={branchColor} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function NotebookLMMindmap({ data }) {
  const branches = (data?.branches || []).filter(b => b && b.name)
  const centralTitle = data?.central || 'Central Concept'

  const [collapsedBranches, setCollapsedBranches] = useState({})
  const [activeNode, setActiveNode] = useState(null)
  const [zoomScale, setZoomScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: -750, y: -650 })
  const [isPanning, setIsPanning] = useState(false)
  
  // Starting coords in the middle of a 3000x2000 playground
  const [rootCoords, setRootCoords] = useState({ x: 1000, y: 900 })
  const [branchCoords, setBranchCoords] = useState([])
  const [lines, setLines] = useState([])

  const containerRef = useRef(null)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeType: null, nodeIndex: null, initialCoords: null })

  // Initialize node layout position when data loaded
  useEffect(() => {
    if (!branches || branches.length === 0) return
    
    setRootCoords({ x: 1000, y: 900 })
    
    const spaced = branches.map((_, idx) => {
      const x = 1450
      const totalHeight = Math.max(400, branches.length * 180)
      const startY = 900 - totalHeight / 2
      const step = branches.length > 1 ? totalHeight / (branches.length - 1) : 0
      const y = branches.length > 1 ? startY + idx * step : 900
      return { x, y }
    })
    setBranchCoords(spaced)
    setPanOffset({ x: -750, y: -650 })
  }, [data])

  const toggleBranch = (index) => {
    setCollapsedBranches(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const toggleAll = (collapseState) => {
    const nextState = {}
    branches.forEach((_, i) => {
      nextState[i] = collapseState
    })
    setCollapsedBranches(nextState)
  }

  // Draw connector lines mathematically from state coordinates
  const updateLines = () => {
    if (!branchCoords || branchCoords.length === 0) return

    // Rough size estimate of the root bubble
    const rootWidth = 220
    const rootHeight = 56
    const rootX = rootCoords.x + rootWidth
    const rootY = rootCoords.y + rootHeight / 2

    const computedLines = []

    branches.forEach((branch, index) => {
      const coords = branchCoords[index]
      if (!coords) return

      const branchX = coords.x
      const branchY = coords.y + 25 // Connect to vertical center of branch header card

      const controlX1 = rootX + Math.min(150, (branchX - rootX) * 0.5)
      const controlX2 = branchX - Math.min(150, (branchX - rootX) * 0.5)

      const pathData = `M ${rootX} ${rootY} C ${controlX1} ${rootY}, ${controlX2} ${branchY}, ${branchX} ${branchY}`
      const color = BRANCH_COLORS[index % BRANCH_COLORS.length]

      computedLines.push({ path: pathData, color, index })
    })

    setLines(computedLines)
  }

  useEffect(() => {
    updateLines()
  }, [rootCoords, branchCoords, data])

  // Dragging nodes handler
  const startDragNode = (e, type, index = null) => {
    if (e.button !== 0) return // Left click only
    e.preventDefault()
    e.stopPropagation()
    
    const initial = type === 'root' ? rootCoords : branchCoords[index]
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeType: type,
      nodeIndex: index,
      initialCoords: { ...initial }
    }

    window.addEventListener('mousemove', handleMouseMoveNode)
    window.addEventListener('mouseup', handleMouseUpNode)
  }

  const handleMouseMoveNode = (e) => {
    const { mouseX, mouseY, nodeType, nodeIndex, initialCoords } = dragStartRef.current
    const dx = (e.clientX - mouseX) / zoomScale
    const dy = (e.clientY - mouseY) / zoomScale

    if (nodeType === 'root') {
      setRootCoords({
        x: initialCoords.x + dx,
        y: initialCoords.y + dy
      })
    } else if (nodeType === 'branch') {
      setBranchCoords(prev => {
        const next = [...prev]
        if (next[nodeIndex]) {
          next[nodeIndex] = {
            x: initialCoords.x + dx,
            y: initialCoords.y + dy
          }
        }
        return next
      })
    }
  }

  const handleMouseUpNode = () => {
    window.removeEventListener('mousemove', handleMouseMoveNode)
    window.removeEventListener('mouseup', handleMouseUpNode)
  }

  // Panning canvas handler
  const startPan = (e) => {
    if (e.button !== 0) return
    if (e.target !== containerRef.current && !e.target.classList.contains('panning-trigger')) return
    
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialCoords: { ...panOffset }
    }

    setIsPanning(true)
    window.addEventListener('mousemove', handleMouseMovePan)
    window.addEventListener('mouseup', handleMouseUpPan)
  }

  const handleMouseMovePan = (e) => {
    const { mouseX, mouseY, initialCoords } = dragStartRef.current
    const dx = e.clientX - mouseX
    const dy = e.clientY - mouseY
    setPanOffset({
      x: initialCoords.x + dx,
      y: initialCoords.y + dy
    })
  }

  const handleMouseUpPan = () => {
    setIsPanning(false)
    window.removeEventListener('mousemove', handleMouseMovePan)
    window.removeEventListener('mouseup', handleMouseUpPan)
  }

  return (
    <div className="notebooklm-mindmap-wrapper card" style={{
      marginTop: '25px',
      background: 'var(--bg-secondary)',
      border: '1.5px solid var(--border)',
      borderRadius: '24px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
      userSelect: 'none'
    }}>
      {/* Background Panning pattern */}
      <div 
        className="panning-trigger"
        onMouseDown={startPan}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.25,
          cursor: isPanning ? 'grabbing' : 'grab',
          zIndex: 0
        }} 
      />

      {/* Header controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        position: 'relative',
        zIndex: 10,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Network size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--text)' }}>
            Interactive Mindmap (Drag Nodes & Pan Canvas)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setZoomScale(s => Math.min(s + 0.1, 1.5))}
            title="Zoom In"
            style={{ padding: '6px 12px', fontSize: '0.85em' }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setZoomScale(s => Math.max(s - 0.1, 0.5))}
            title="Zoom Out"
            style={{ padding: '6px 12px', fontSize: '0.85em' }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { setZoomScale(1); setPanOffset({ x: -750, y: -650 }); setRootCoords({ x: 1000, y: 900 }); }}
            title="Reset View"
            style={{ padding: '6px 12px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => toggleAll(false)}
            style={{ padding: '6px 12px', fontSize: '0.8em' }}
          >
            Expand All
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => toggleAll(true)}
            style={{ padding: '6px 12px', fontSize: '0.8em' }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div 
        className="panning-trigger"
        onMouseDown={startPan}
        style={{ 
          width: '100%', 
          height: '550px', 
          position: 'relative', 
          overflow: 'hidden', 
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          cursor: isPanning ? 'grabbing' : 'grab',
          zIndex: 1
        }}
      >
        {/* Transforming Canvas (3000px x 2000px playground) */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            width: '3000px',
            height: '2000px',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: 'top left',
            transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto'
          }}
        >
          {/* SVG Connector Layer */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2
            }}
          >
            <defs>
              {BRANCH_COLORS.map((col, idx) => (
                <linearGradient key={idx} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
                  <stop offset="100%" stopColor={col} stopOpacity="0.95" />
                </linearGradient>
              ))}
            </defs>
            {lines.map((line, idx) => (
              <path
                key={idx}
                d={line.path}
                fill="none"
                stroke={`url(#grad-${idx % BRANCH_COLORS.length})`}
                strokeWidth={activeNode === line.index ? '5' : '3.5'}
                strokeDasharray={activeNode === line.index ? '8 4' : 'none'}
                style={{
                  transition: 'stroke-width 0.15s ease',
                  filter: activeNode === line.index 
                    ? `drop-shadow(0 0 10px ${line.color})` 
                    : `drop-shadow(0 0 4px ${line.color}44)`
                }}
              />
            ))}
          </svg>

          {/* Central concept node */}
          <div 
            onMouseDown={(e) => startDragNode(e, 'root')}
            style={{ 
              position: 'absolute',
              left: `${rootCoords.x}px`,
              top: `${rootCoords.y}px`,
              zIndex: 10, 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 36px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #3B82F6 100%)',
              borderRadius: '50px',
              color: 'white',
              boxShadow: '0 12px 30px rgba(79, 134, 247, 0.45)',
              fontWeight: 800,
              fontSize: '1.2em',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              cursor: 'grab'
            }}
          >
            <Sparkles size={20} className="sparkle-icon" />
            <span>{centralTitle}</span>
          </div>

          {/* Draggable Branch Cards */}
          {branches.map((branch, i) => {
            const coords = branchCoords[i] || { x: 1450, y: 900 }
            const isCollapsed = collapsedBranches[i]
            const branchColor = BRANCH_COLORS[i % BRANCH_COLORS.length]
            const isSelected = activeNode === i
            const childrenList = branch.children || []

            return (
              <div
                key={i}
                onMouseEnter={() => setActiveNode(i)}
                onMouseLeave={() => setActiveNode(null)}
                onMouseDown={(e) => startDragNode(e, 'branch', i)}
                style={{
                  position: 'absolute',
                  left: `${coords.x}px`,
                  top: `${coords.y}px`,
                  width: '320px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '20px',
                  border: isSelected ? `2.5px solid ${branchColor}` : '1.5px solid var(--border)',
                  boxShadow: isSelected ? `0 10px 35px ${branchColor}44` : 'var(--shadow-md)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  overflow: 'hidden',
                  zIndex: 5,
                  cursor: 'grab'
                }}
              >
                {/* Glowing Color Bar Left */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: branchColor
                }} />

                {/* Branch Header Bar */}
                <div
                  onClick={(e) => {
                    e.stopPropagation() // Don't trigger drag on header clicks
                    toggleBranch(i)
                  }}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent dragging node when collapsing/expanding
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: !isCollapsed ? '1px solid var(--border)' : 'none',
                    background: isSelected ? `${branchColor}10` : 'transparent',
                    paddingLeft: '22px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: branchColor,
                      boxShadow: `0 0 10px ${branchColor}`
                    }} />
                    <h4 style={{
                      margin: 0,
                      color: 'var(--text-dark)',
                      fontSize: '1em',
                      fontWeight: 700
                    }}>
                      {branch.name}
                    </h4>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-muted)'
                  }}>
                    <span style={{ fontSize: '0.72em', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '10px', fontWeight: 600 }}>
                      {childrenList.length} items
                    </span>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </div>
                </div>

                {/* Children details */}
                {!isCollapsed && (
                  <div 
                    onMouseDown={(e) => e.stopPropagation()} // Prevent dragging node when selecting child text or scrolling
                    style={{ padding: '14px 18px', paddingLeft: '22px' }}
                  >
                    <div style={{
                      borderLeft: `2.5px solid ${branchColor}44`,
                      paddingLeft: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      {childrenList.map((child, j) => (
                        <ChildItem key={j} child={child} branchColor={branchColor} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default NotebookLMMindmap
