import React from 'react'

function Loader({ message = 'Loading...', size = 120, overlay = false }) {
  return (
    <div className={overlay ? 'loader-overlay' : ''}>
      <div className="loader" style={{ width: size, height: size }}>
        <div className="loader-core">CL</div>
        <div className="loader-orbit loader-orbit-1"><span className="orbit-dot" /></div>
        <div className="loader-orbit loader-orbit-2"><span className="orbit-dot" /></div>
        <div className="loader-orbit loader-orbit-3"><span className="orbit-dot" /></div>
      </div>
      {message && <div className="loader-message">{message}</div>}
    </div>
  )
}

export default Loader
