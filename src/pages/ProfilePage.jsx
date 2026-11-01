import { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { ACCENTS } from '../lib/theme.js'
import {
  Sun,
  Moon,
  Monitor,
  Camera,
  Trash2,
  Save,
  Mail,
  LogOut,
  Check,
  Award,
  BookOpen,
  GraduationCap,
  Layers,
} from 'lucide-react'

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export default function ProfilePage() {
  const {
    user, profile, updateProfile, uploadAvatar, logout,
    prefs, setThemePref, setAccentPref,
    quizResults, fetchMyResults, subjects, fetchSubjects,
  } = useApp()

  const isFaculty = profile?.role === 'faculty'
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLook, setSavingLook] = useState(false)

  const initialForm = useMemo(() => ({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    department: profile?.department || '',
    student_id_number: profile?.student_id_number || '',
    year_level: profile?.year_level || '1st Year',
  }), [profile?.full_name, profile?.bio, profile?.department, profile?.student_id_number, profile?.year_level])

  const [form, setForm] = useState(initialForm)
  useEffect(() => setForm(initialForm), [initialForm])

  useEffect(() => {
    if (isFaculty) fetchSubjects()
    else fetchMyResults()
  }, [isFaculty, fetchSubjects, fetchMyResults])

  const dirty = Object.keys(initialForm).some(k => form[k] !== initialForm[k])

  const savedTheme = profile?.theme || 'dark'
  const savedAccent = profile?.accent_color || 'violet'
  const lookDirty = prefs.theme !== savedTheme || prefs.accent !== savedAccent

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    await updateProfile({
      full_name: form.full_name.trim(),
      bio: form.bio.trim() || null,
      department: form.department.trim() || null,
      ...(isFaculty
        ? {}
        : {
            student_id_number: form.student_id_number.trim() || null,
            year_level: form.year_level,
          }),
    })
    setSaving(false)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const { url } = await uploadAvatar(file)
    if (url) await updateProfile({ avatar_url: url })
    setUploading(false)
  }

  const handleSaveLook = async () => {
    setSavingLook(true)
    await updateProfile({ theme: prefs.theme, accent_color: prefs.accent })
    setSavingLook(false)
  }

  // Quick stats
  const stats = useMemo(() => {
    if (isFaculty) {
      const mine = subjects.filter(s => s.created_by === user?.id)
      return [
        { icon: BookOpen, tone: 'purple', value: mine.length, label: 'Subjects you teach' },
      ]
    }
    const taken = quizResults.length
    const passed = quizResults.filter(r => r.passed).length
    const avg = taken ? Math.round(quizResults.reduce((a, r) => a + (Number(r.percentage) || 0), 0) / taken) : 0
    return [
      { icon: Layers, tone: 'purple', value: taken, label: 'Quiz attempts' },
      { icon: Award, tone: 'green', value: passed, label: 'Quizzes passed' },
      { icon: GraduationCap, tone: 'yellow', value: `${avg}%`, label: 'Average score' },
    ]
  }, [isFaculty, subjects, quizResults, user])

  const displayName = form.full_name || profile?.full_name || user?.email || 'User'
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : null

  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your personal details and how Lumina looks for you.</p>
          </div>
          <button className="btn btn-outline" onClick={logout} id="btn-profile-logout">
            <LogOut /> Sign Out
          </button>
        </div>
      </div>

      <div className="page-body profile-layout">
        {/* Identity card */}
        <div className="card profile-hero">
          <div className="profile-avatar-wrap">
            <Avatar name={displayName} url={profile?.avatar_url} size={104} />
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change photo"
              id="btn-change-avatar"
            >
              {uploading ? <span className="btn-loader" /> : <Camera />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleAvatarChange}
            />
          </div>

          <div className="profile-hero-info">
            <h2 className="profile-name">{displayName}</h2>
            <div className="profile-meta">
              <span className={`badge ${isFaculty ? 'badge-pink' : 'badge-purple'}`}>
                {isFaculty ? 'Faculty' : 'Student'}
              </span>
              {!isFaculty && profile?.year_level && <span className="badge badge-green">{profile.year_level}</span>}
              {profile?.department && <span className="badge badge-yellow">{profile.department}</span>}
            </div>
            {user?.email && (
              <p className="profile-email"><Mail /> {user.email}</p>
            )}
            {profile?.bio && <p className="profile-bio">{profile.bio}</p>}
            {memberSince && <p className="profile-since">Member since {memberSince}</p>}
          </div>

          {profile?.avatar_url && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => updateProfile({ avatar_url: null })}
              id="btn-remove-avatar"
            >
              <Trash2 /> Remove photo
            </button>
          )}
        </div>

        {/* Stats */}
        <div className={`grid-${Math.min(stats.length + 1, 4)} profile-stats`}>
          {stats.map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.tone}`}><s.icon /></div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2-custom">
          {/* Personal info */}
          <form className="section-card" onSubmit={handleSave}>
            <h2 className="section-title mb-16">Personal information</h2>

            <div className="flex flex-col gap-16">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full name</label>
                <input
                  id="profile-name"
                  className="form-input"
                  value={form.full_name}
                  onChange={e => setField('full_name', e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-bio">
                  About me <span className="form-hint">{form.bio.length}/300</span>
                </label>
                <textarea
                  id="profile-bio"
                  className="form-textarea"
                  rows={4}
                  maxLength={300}
                  placeholder={isFaculty ? 'Tell students about yourself and your teaching style...' : 'Tell your teachers and classmates a little about yourself...'}
                  value={form.bio}
                  onChange={e => setField('bio', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-dept">
                  {isFaculty ? 'Department' : 'Program / Department'}
                </label>
                <input
                  id="profile-dept"
                  className="form-input"
                  value={form.department}
                  onChange={e => setField('department', e.target.value)}
                  placeholder="e.g. Information Technology"
                  maxLength={80}
                />
              </div>

              {!isFaculty && (
                <div className="grid-2" style={{ gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-sid">Student ID</label>
                    <input
                      id="profile-sid"
                      className="form-input"
                      value={form.student_id_number}
                      onChange={e => setField('student_id_number', e.target.value)}
                      maxLength={40}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-year">Year level</label>
                    <select
                      id="profile-year"
                      className="form-select"
                      value={form.year_level}
                      onChange={e => setField('year_level', e.target.value)}
                    >
                      {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-12">
                <button type="submit" className="btn btn-gradient" disabled={!dirty || saving || !form.full_name.trim()} id="btn-save-profile">
                  {saving ? <span className="btn-loader" /> : <><Save /> Save changes</>}
                </button>
                {dirty && (
                  <button type="button" className="btn btn-outline" onClick={() => setForm(initialForm)}>
                    Discard
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Appearance */}
          <div className="section-card">
            <h2 className="section-title mb-16">Appearance</h2>

            <div className="form-label mb-6">Theme</div>
            <div className="theme-options" role="radiogroup" aria-label="Theme">
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.theme === opt.id}
                  className={`theme-option ${prefs.theme === opt.id ? 'selected' : ''}`}
                  onClick={() => setThemePref(opt.id)}
                  id={`theme-${opt.id}`}
                >
                  <opt.icon />
                  <span>{opt.label}</span>
                  {prefs.theme === opt.id && <Check className="theme-option-check" />}
                </button>
              ))}
            </div>

            <div className="form-label mb-6 mt-24">Accent color</div>
            <div className="accent-swatches" role="radiogroup" aria-label="Accent color">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.accent === a.id}
                  aria-label={a.name}
                  title={a.name}
                  className={`accent-swatch ${prefs.accent === a.id ? 'selected' : ''}`}
                  style={{ backgroundColor: a.hex }}
                  onClick={() => setAccentPref(a.id)}
                  id={`accent-${a.id}`}
                >
                  {prefs.accent === a.id && <Check />}
                </button>
              ))}
            </div>

            <p className="section-subtitle mt-16">
              Changes preview instantly. Save them to keep this look on every device you sign in from.
            </p>

            <button
              type="button"
              className="btn btn-gradient mt-16"
              onClick={handleSaveLook}
              disabled={!lookDirty || savingLook}
              id="btn-save-appearance"
            >
              {savingLook ? <span className="btn-loader" /> : <><Save /> Save appearance</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

