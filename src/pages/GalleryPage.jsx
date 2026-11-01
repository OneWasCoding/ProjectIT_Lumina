import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  Plus,
  ImageIcon,
  Upload,
  X,
  Trash2,
  Calendar,
  User,
  Camera,
  Tag,
} from 'lucide-react'

export default function GalleryPage() {
  const { user, gallery, addGalleryPost, deleteGalleryPost } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [viewImage, setViewImage] = useState(null)
  const [filter, setFilter] = useState('all')

  const isTeacher = user?.role === 'teacher'

  const allTags = [...new Set(gallery.flatMap(g => g.tags))]
  const filtered = filter === 'all'
    ? gallery
    : gallery.filter(g => g.tags.includes(filter))

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">Activity Gallery</h1>
            <p className="page-subtitle">Photos from quizzes, activities, and class moments</p>
          </div>
          {isTeacher && (
            <button className="btn btn-gradient" onClick={() => setShowCreate(true)} id="btn-add-gallery">
              <Plus /> Add Post
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Filter Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
            <button
              className={`tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13,
                fontWeight: 600,
                background: filter === 'all' ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: filter === 'all' ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s ease',
              }}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilter(tag)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 13,
                  fontWeight: 600,
                  background: filter === tag ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: filter === tag ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <ImageIcon />
            <h3>No Posts Yet</h3>
            <p>
              {isTeacher
                ? 'Share photos of quizzes, activities, and class moments.'
                : 'No activity posts have been shared yet.'}
            </p>
          </div>
        ) : (
          <div className="gallery-grid">
            {filtered.map((post) => (
              <div key={post.id} className="gallery-card" id={`gallery-${post.id}`}>
                <div
                  className="gallery-card-image"
                  onClick={() => setViewImage(post)}
                  style={{ cursor: 'pointer' }}
                >
                  {post.imageUrl ? (
                    <img src={post.imageUrl} alt={post.title} />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `linear-gradient(135deg, 
                        ${post.tags.includes('Quiz') ? '#7c5cfc' : '#00d4aa'}15, 
                        ${post.tags.includes('Quiz') ? '#ff6b9d' : '#ffb547'}10)`,
                    }}>
                      <Camera style={{
                        width: 40,
                        height: 40,
                        color: post.tags.includes('Quiz') ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                        opacity: 0.5,
                      }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                        Photo placeholder
                      </span>
                    </div>
                  )}
                </div>

                <div className="gallery-card-body">
                  <div className="flex items-center justify-between">
                    <h3 className="gallery-card-title">{post.title}</h3>
                    {isTeacher && (
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={() => deleteGalleryPost(post.id)}
                        style={{ flexShrink: 0 }}
                      >
                        <Trash2 style={{ width: 14, height: 14, color: 'var(--accent-danger)' }} />
                      </button>
                    )}
                  </div>

                  {post.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                      {post.description}
                    </p>
                  )}

                  <div className="gallery-card-tags">
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        className={`badge ${
                          tag === 'Quiz' ? 'badge-purple' :
                          tag === 'Activity' ? 'badge-green' :
                          tag === 'Midterm' ? 'badge-pink' :
                          tag === 'Lab' ? 'badge-yellow' :
                          'badge-purple'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div
                    className="flex items-center gap-12 mt-8"
                    style={{ fontSize: 12, color: 'var(--text-muted)' }}
                  >
                    <span className="flex items-center gap-8">
                      <User style={{ width: 12, height: 12 }} /> {post.postedBy}
                    </span>
                    <span className="flex items-center gap-8">
                      <Calendar style={{ width: 12, height: 12 }} /> {post.postedAt}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreate && (
        <CreatePostModal onClose={() => setShowCreate(false)} onSave={addGalleryPost} />
      )}

      {/* View Image Modal */}
      {viewImage && (
        <div className="modal-overlay" onClick={() => setViewImage(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewImage.title}</h2>
              <button className="btn btn-icon btn-outline" onClick={() => setViewImage(null)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                width: '100%',
                aspectRatio: '16/10',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                overflow: 'hidden',
              }}>
                {viewImage.imageUrl ? (
                  <img src={viewImage.imageUrl} alt={viewImage.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Camera style={{ width: 64, height: 64, color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No image uploaded</p>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                {viewImage.description}
              </p>
              <div className="flex items-center gap-8 mt-16">
                {viewImage.tags.map(tag => (
                  <span key={tag} className="badge badge-purple">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CreatePostModal({ onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState([])
  const [imageUrl, setImageUrl] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileRef = useRef()

  const tagOptions = ['Quiz', 'Activity', 'Midterm', 'Finals', 'Lab', 'Group Work', 'Project']

  const toggleTag = (tag) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setImageUrl(url)
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim(),
      tags: tags.length > 0 ? tags : ['Activity'],
      imageUrl,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Gallery Post</h2>
          <button className="btn btn-icon btn-outline" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <div className="flex flex-col gap-20">
            {/* Image Upload */}
            <div
              className="upload-zone"
              onClick={() => fileRef.current?.click()}
              style={imagePreview ? { padding: 0, border: 'none' } : {}}
            >
              {imagePreview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                  <button
                    className="btn btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagePreview(null)
                      setImageUrl(null)
                    }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.6)',
                      borderRadius: 'var(--radius-full)',
                      color: 'white',
                    }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ) : (
                <>
                  <Camera style={{ width: 48, height: 48 }} />
                  <h3>Upload a Photo</h3>
                  <p>Click or drag an image here</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                placeholder="e.g. Midterm Quiz — IT Fundamentals"
                value={title}
                onChange={e => setTitle(e.target.value)}
                id="input-gallery-title"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Describe this activity..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                id="input-gallery-desc"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tags</label>
              <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
                {tagOptions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 13,
                      fontWeight: 600,
                      background: tags.includes(tag) ? 'var(--accent-primary)' : 'var(--bg-input)',
                      color: tags.includes(tag) ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${tags.includes(tag) ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gradient" onClick={handleSubmit} id="btn-save-gallery">
            <Upload style={{ width: 16, height: 16 }} /> Post to Gallery
          </button>
        </div>
      </div>
    </div>
  )
}
