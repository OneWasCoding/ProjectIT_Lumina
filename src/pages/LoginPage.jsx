import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Eye, EyeOff, Mail, Lock, User, GraduationCap } from 'lucide-react'

export default function LoginPage() {
  const { login, signup, showToast } = useApp()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student') // 'student' | 'faculty'
  const [yearLevel, setYearLevel] = useState('1st Year')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (isSignup && !fullName.trim()) {
      showToast('Please enter your full name', 'error')
      return
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (isSignup) {
        const { error } = await signup(
          email.trim(),
          password,
          fullName.trim(),
          role,
          yearLevel
        )
        if (!error) {
          setIsSignup(false)
          setPassword('')
        }
      } else {
        await login(email.trim(), password)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">L</div>
          <h1>Lumina</h1>
          <p>Learning Management System</p>
        </div>

        {/* Toggle Login / Signup */}
        <div className="login-toggle">
          <button
            className={`login-toggle-btn ${!isSignup ? 'active' : ''}`}
            onClick={() => setIsSignup(false)}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`login-toggle-btn ${isSignup ? 'active' : ''}`}
            onClick={() => setIsSignup(true)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <User className="input-icon" />
                <input
                  type="text"
                  className="form-input form-input-icon"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  id="input-fullname"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" />
              <input
                type="email"
                className="form-input form-input-icon"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                id="input-email"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input form-input-icon"
                placeholder={isSignup ? 'Min. 6 characters' : 'Enter password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                id="input-password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {isSignup && (
            <>
              <div className="form-group">
                <label className="form-label">Account Role</label>
                <div className="login-role-select">
                  <button
                    type="button"
                    className={`role-option ${role === 'faculty' ? 'selected' : ''}`}
                    onClick={() => setRole('faculty')}
                    id="role-faculty"
                  >
                    <div className="role-option-icon">👨‍🏫</div>
                    <div className="role-option-label">Faculty</div>
                  </button>
                  <button
                    type="button"
                    className={`role-option ${role === 'student' ? 'selected' : ''}`}
                    onClick={() => setRole('student')}
                    id="role-student"
                  >
                    <div className="role-option-icon">🎓</div>
                    <div className="role-option-label">Student</div>
                  </button>
                </div>
              </div>

              {/* Student: Year Level Selection */}
              {role === 'student' && (
                <div className="form-group">
                  <label className="form-label">Year Level</label>
                  <div className="input-with-icon">
                    <GraduationCap className="input-icon" />
                    <select
                      className="form-select form-input-icon"
                      value={yearLevel}
                      onChange={e => setYearLevel(e.target.value)}
                      id="select-year"
                    >
                      {yearLevels.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="btn btn-gradient btn-lg w-full"
            id="btn-login"
            style={{ justifyContent: 'center', marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? (
              <span className="btn-loader" />
            ) : (
              isSignup ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          {isSignup ? (
            <p>Already have an account? <button type="button" onClick={() => setIsSignup(false)}>Sign In</button></p>
          ) : (
            <p>Don't have an account? <button type="button" onClick={() => setIsSignup(true)}>Sign Up</button></p>
          )}
        </div>
      </div>
    </div>
  )
}
