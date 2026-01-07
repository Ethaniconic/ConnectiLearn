import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'

function Uploads() {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data.documents || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      fetchDocuments()
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed')
    }
    setUploading(false)
    fileInputRef.current.value = ''
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return
    try {
      await api.delete(`/documents/${id}`)
      setDocuments(prev => prev.filter(d => d._id !== id))
    } catch (err) {
      alert('Delete failed')
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload Documents</h1>
      </div>
      <div className="card">
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".pdf,.txt,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
          />
          {uploading ? (
            <p><strong>Uploading...</strong></p>
          ) : (
            <>
              <p><strong>Click to upload</strong></p>
              <p>PDF, TXT, PNG, JPG (Max 10MB)</p>
            </>
          )}
        </div>

        <div className="documents-header">
          <h3>Your Documents ({documents.length})</h3>
        </div>
        {documents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No documents uploaded yet</p>
        ) : (
          documents.map(doc => (
            <div key={doc._id} className="document-item">
              <div className="document-info">
                <h4>{doc.originalName}</h4>
                <span>{formatSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
              <button className="btn btn-danger" onClick={() => handleDelete(doc._id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Uploads
