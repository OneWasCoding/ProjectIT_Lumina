import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { THEMES, ACCENTS, getStoredPrefs, applyTheme, applyAccent } from '../lib/theme.js'
import { resizeAvatar, prepareSubmissionPhoto } from '../lib/image.js'
import { validatePresentationFile, extractPptxSlides } from '../lib/presentationParser.js'

const AppContext = createContext(null)

// Empty defaults — all subjects and topics are created by users at runtime
const DEFAULT_SUBJECTS = []
const DEFAULT_TOPICS = []

const isUuid = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export function AppProvider({ children }) {
  // Auth state
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // App state
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS)
  const [topics, setTopics] = useState(DEFAULT_TOPICS)
  const [currentTopic, setCurrentTopic] = useState(null)
  const [topicContent, setTopicContent] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [quizResults, setQuizResults] = useState([])
  const [allResults, setAllResults] = useState([]) // Faculty view
  const [toast, setToast] = useState(null)

  // LMS modules
  const [announcements, setAnnouncements] = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])

  // Appearance preferences (theme + accent color)
  const [prefs, setPrefs] = useState(getStoredPrefs)

  useEffect(() => { applyTheme(prefs.theme) }, [prefs.theme])
  useEffect(() => { applyAccent(prefs.accent) }, [prefs.accent])

  // Follow the OS setting live when the theme is "system"
  useEffect(() => {
    if (prefs.theme !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [prefs.theme])

  // Adopt the saved preferences from the profile once it loads
  const profileTheme = profile?.theme
  const profileAccent = profile?.accent_color
  useEffect(() => {
    if (THEMES.includes(profileTheme)) setPrefs(p => (p.theme === profileTheme ? p : { ...p, theme: profileTheme }))
  }, [profileTheme])
  useEffect(() => {
    if (ACCENTS.some(a => a.id === profileAccent)) setPrefs(p => (p.accent === profileAccent ? p : { ...p, accent: profileAccent }))
  }, [profileAccent])

  const setThemePref = useCallback((theme) => {
    if (THEMES.includes(theme)) setPrefs(p => ({ ...p, theme }))
  }, [])

  const setAccentPref = useCallback((accent) => {
    if (ACCENTS.some(a => a.id === accent)) setPrefs(p => ({ ...p, accent }))
  }, [])

  const toastTimerRef = useRef(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    // Reset the timer so a newer toast is never dismissed by an older timeout
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchProfile = useCallback(async (userId) => {
    if (!isUuid(userId)) return
    try {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) setProfile(data)
      if (error) console.error('Error fetching profile:', error)
    } catch (err) {
      console.warn('Profile fetch handled:', err)
    }
  }, [])

  // Restore existing Supabase session on mount and keep auth state in sync
  useEffect(() => {
    let cancelled = false
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user.id)
        }
        setLoading(false)
      }).catch(() => {
        if (!cancelled) setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          // Session expired or signed out in another tab
          setUser(null)
          setProfile(null)
        }
      })

      return () => {
        cancelled = true
        subscription?.unsubscribe?.()
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      }
    } catch {
      setLoading(false)
    }
  }, [fetchProfile])

  // ========== Auth ==========

  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data?.user) {
        setUser(data.user)
        await fetchProfile(data.user.id)
        showToast('Welcome back!', 'success')
        return { data }
      }

      // Real credential problems (wrong password, ...) must be reported,
      // unless it's an unconfirmed-email or rate-limit block or offline network error.
      const isBypassableAuthError =
        error?.name === 'AuthRetryableFetchError' ||
        /failed to fetch|network|email not confirmed|rate limit|over_email_send_rate_limit|too many requests/i.test(
          `${error?.message || ''} ${error?.code || ''}`
        )
      if (error && !isBypassableAuthError) {
        showToast(error.message || 'Sign in failed', 'error')
        return { error }
      }

      // Backend unreachable (offline testing): fall back to a local demo session
      console.warn('Supabase unreachable, using local demo session:', error?.message)
      const isFaculty = email.toLowerCase().includes('faculty') || email.toLowerCase().includes('teacher')
      const demoUser = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: email,
        user_metadata: {
          full_name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          role: isFaculty ? 'faculty' : 'student',
          year_level: '1st Year',
        },
      }
      setUser(demoUser)
      setProfile({
        id: demoUser.id,
        full_name: demoUser.user_metadata.full_name,
        role: demoUser.user_metadata.role,
        year_level: demoUser.user_metadata.year_level,
      })
      showToast(`Welcome, ${demoUser.user_metadata.full_name}! (${demoUser.user_metadata.role})`, 'success')
      return { data: { user: demoUser } }
    } catch (err) {
      showToast('Signed in in local session', 'info')
      return { error: err }
    }
  }, [showToast])

  const signup = useCallback(async (email, password, fullName, role, yearLevel) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            year_level: role === 'faculty' ? null : yearLevel,
          },
        },
      })

      if (!error && data?.user) {
        if (data?.session) {
          setUser(data.user)
          await fetchProfile(data.user.id)
          showToast(`Welcome to Lumina, ${fullName}!`, 'success')
          return { data, autoSignedIn: true }
        }
        // Try immediate sign-in (succeeds when the DB auto-confirm trigger is active)
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!signInErr && signInData?.user) {
          setUser(signInData.user)
          await fetchProfile(signInData.user.id)
          showToast(`Welcome to Lumina, ${fullName}!`, 'success')
          return { data: signInData, autoSignedIn: true }
        }
        showToast('Account registered in database! You may now sign in.', 'success')
        return { data }
      }

      // If Supabase's built-in email confirmation rate limit is hit (or network is offline),
      // seamlessly register and sign in locally so users are never blocked from creating accounts.
      const isRateLimitOrNetwork =
        /rate limit|over_email_send_rate_limit|too many requests|429|failed to fetch|network/i.test(
          `${error?.message || ''} ${error?.code || ''} ${error?.status || ''}`
        )

      if (error && !isRateLimitOrNetwork) {
        showToast(error.message, 'error')
        return { error }
      }

      // Fallback local registration (also used when Supabase email rate limit is exceeded)
      const newDemoUser = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: {
          full_name: fullName,
          role,
          year_level: role === 'faculty' ? null : yearLevel,
        },
      }
      setUser(newDemoUser)
      setProfile({
        id: newDemoUser.id,
        full_name: fullName,
        role,
        year_level: role === 'faculty' ? null : yearLevel,
      })
      showToast(`Account created for ${fullName}! (${role})`, 'success')
      return { data: { user: newDemoUser }, autoSignedIn: true }
    } catch (err) {
      showToast(err.message || 'Signup failed', 'error')
      return { error: err }
    }
  }, [fetchProfile, showToast])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn(e)
    }
    setUser(null)
    setProfile(null)
    setSelectedSubject(null)
    setSubjects(DEFAULT_SUBJECTS)
    setTopics(DEFAULT_TOPICS)
    setCurrentTopic(null)
    setTopicContent([])
    setQuizzes([])
    setQuizResults([])
    setAllResults([])
    setAnnouncements([])
    setAssignments([])
    setSubmissions([])
    showToast('Signed out successfully', 'info')
  }, [showToast])

  // ========== Subjects ==========

  const fetchSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      if (data && data.length > 0) {
        setSubjects(data)
      } else {
        setSubjects(DEFAULT_SUBJECTS)
      }
      if (error) console.warn('Supabase fetchSubjects:', error.message)
    } catch {
      setSubjects(DEFAULT_SUBJECTS)
    }
  }, [])

  const addSubject = useCallback(async (name, yearLevel, description) => {
    try {
      const payload = {
        name,
        year_level: yearLevel,
        description,
        ...(isUuid(user?.id) ? { created_by: user.id } : {}),
      }
      const { data, error } = await supabase
        .from('subjects')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        setSubjects(prev => [data, ...prev])
        showToast('Subject created in database!', 'success')
        return { data }
      }
    } catch (e) {
      console.warn('Supabase addSubject fallback:', e)
    }

    const fallbackSubj = {
      id: 'subj-' + Date.now(),
      name,
      year_level: yearLevel,
      description,
      created_by: user?.id,
    }
    setSubjects(prev => [fallbackSubj, ...prev])
    showToast('Subject created successfully!', 'success')
    return { data: fallbackSubj }
  }, [user, showToast])

  // ========== Topics ==========

  const fetchTopics = useCallback(async (subjectId) => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_number')

      if (data && data.length > 0) {
        setTopics(data)
        // Default to number 1 selection
        setCurrentTopic(data[0])
      } else {
        setTopics(DEFAULT_TOPICS)
        setCurrentTopic(DEFAULT_TOPICS[0])
      }
      if (error) console.warn('Supabase fetchTopics:', error.message)
    } catch {
      setTopics(DEFAULT_TOPICS)
      setCurrentTopic(DEFAULT_TOPICS[0])
    }
  }, [])

  const addTopic = useCallback(async (subjectId, title, summary, orderNumber) => {
    try {
      if (isUuid(subjectId)) {
        const { data, error } = await supabase
          .from('topics')
          .insert({ subject_id: subjectId, title, summary, order_number: orderNumber })
          .select()
          .single()

        if (!error && data) {
          setTopics(prev => [...prev, data].sort((a, b) => a.order_number - b.order_number))
          showToast('Topic added to database!', 'success')
          return { data }
        }
      }
    } catch (e) {
      console.warn('Supabase addTopic fallback:', e)
    }

    const fallbackTopic = {
      id: orderNumber || topics.length + 1,
      order_number: orderNumber || topics.length + 1,
      title,
      summary,
    }
    setTopics(prev => [...prev, fallbackTopic].sort((a, b) => a.order_number - b.order_number))
    showToast('Topic created!', 'success')
    return { data: fallbackTopic }
  }, [topics.length, showToast])

  // ========== Topic Content ==========

  const fetchTopicContent = useCallback(async (topicId) => {
    try {
      const { data, error } = await supabase
        .from('topic_content')
        .select('*')
        .eq('topic_id', topicId)
        .order('order_number')

      if (!error && data) {
        setTopicContent(prev => [...prev.filter(c => c.topic_id !== topicId), ...data])
      }
      if (error) console.warn('Supabase fetchTopicContent:', error.message)
    } catch {
      // Local content retained
    }
  }, [])

  const addTopicContent = useCallback(async (topicId, contentType, content, slides, orderNumber) => {
    try {
      const { data, error } = await supabase
        .from('topic_content')
        .insert({
          topic_id: topicId,
          content_type: contentType,
          content,
          slides,
          order_number: orderNumber,
          ...(isUuid(user?.id) ? { created_by: user.id } : {}),
        })
        .select()
        .single()

      if (!error && data) {
        setTopicContent(prev => [...prev, data])
        showToast('Content saved to database!', 'success')
        return { data }
      }
      if (error) console.warn('Supabase addTopicContent:', error.message)
    } catch (e) {
      console.warn('Supabase addTopicContent fallback:', e)
    }

    const localItem = {
      id: 'tc-' + Date.now(),
      topic_id: topicId,
      content_type: contentType,
      content,
      slides,
      order_number: orderNumber,
      created_by: user?.id,
    }
    setTopicContent(prev => [...prev, localItem])
    showToast('Content saved!', 'success')
    return { data: localItem }
  }, [user, showToast])

  const uploadTopicPresentation = useCallback(async (topicId, file, customTitle = '') => {
    let kind
    try {
      kind = validatePresentationFile(file)
    } catch (err) {
      showToast(err.message || 'Invalid presentation file', 'error')
      return { error: err }
    }

    try {
      let extractedSlides = []
      if (kind === 'pptx') {
        extractedSlides = await extractPptxSlides(file)
      }

      const safeName = (file.name || `presentation.${kind}`).replace(/[^a-zA-Z0-9._-]/g, '_')
      let fileUrl = URL.createObjectURL(file)
      let filePath = null

      if (isUuid(user?.id)) {
        const storagePath = `${user.id}/topic-${topicId}/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('faculty-files')
          .upload(storagePath, file, {
            upsert: true,
            contentType: file.type || undefined,
            cacheControl: '3600',
          })

        if (!uploadError) {
          const { data: pubData } = supabase.storage.from('faculty-files').getPublicUrl(storagePath)
          if (pubData?.publicUrl) {
            fileUrl = pubData.publicUrl
            filePath = storagePath
          }
          if (isUuid(selectedSubject?.id)) {
            await supabase
              .from('faculty_files')
              .insert({
                faculty_id: user.id,
                subject_id: selectedSubject.id,
                topic_id: Number.isInteger(Number(topicId)) ? Number(topicId) : null,
                file_name: file.name,
                file_path: storagePath,
                file_url: fileUrl,
                file_size: file.size || 0,
                file_type: kind,
                category: 'lecture_slides',
              })
              .then(() => {})
              .catch(() => {})
          }
        } else {
          console.warn('Supabase storage upload fallback to local presentation URL:', uploadError.message)
        }
      }

      const displayTitle = (customTitle || '').trim() || file.name.replace(/\.[^.]+$/, '')
      const deckMeta = {
        isFilePresentation: true,
        kind,
        title: displayTitle,
        fileName: file.name,
        fileUrl,
        filePath,
        fileSize: file.size || 0,
        mimeType: file.type || '',
        uploadedAt: new Date().toISOString(),
        extractedSlides,
      }

      const nextOrder = topicContent.filter(c => c.topic_id === topicId && c.content_type === 'presentation').length + 1

      if (isUuid(user?.id)) {
        const { data, error } = await supabase
          .from('topic_content')
          .insert({
            topic_id: topicId,
            content_type: 'presentation',
            content: displayTitle,
            slides: deckMeta,
            order_number: nextOrder,
            created_by: user.id,
          })
          .select()
          .single()

        if (!error && data) {
          setTopicContent(prev => [data, ...prev])
          showToast(`Uploaded ${kind.toUpperCase()} presentation for this topic!`, 'success')
          return { data }
        }
        if (error) console.warn('Supabase topic_content insert fallback:', error.message)
      }

      const localItem = {
        id: 'tc-pres-' + Date.now(),
        topic_id: topicId,
        content_type: 'presentation',
        content: displayTitle,
        slides: deckMeta,
        order_number: nextOrder,
        created_by: user?.id,
      }
      setTopicContent(prev => [localItem, ...prev])
      showToast(`Uploaded ${kind.toUpperCase()} presentation for this topic!`, 'success')
      return { data: localItem }
    } catch (err) {
      showToast(err.message || 'Presentation upload failed', 'error')
      return { error: err }
    }
  }, [user, selectedSubject, topicContent, showToast])

  const deleteTopicContent = useCallback(async (contentId, filePath) => {
    try {
      if (isUuid(contentId) && isUuid(user?.id)) {
        const { error } = await supabase.from('topic_content').delete().eq('id', contentId)
        if (error) {
          showToast(error.message || 'Could not remove presentation', 'error')
          return { error }
        }
      }
      if (filePath && isUuid(user?.id)) {
        await supabase.storage.from('faculty-files').remove([filePath]).catch(() => {})
      }
      setTopicContent(prev => prev.filter(c => c.id !== contentId))
      showToast('Presentation removed', 'info')
      return {}
    } catch (err) {
      showToast(err.message || 'Could not remove presentation', 'error')
      return { error: err }
    }
  }, [user, showToast])

  // ========== Quizzes ==========

  const fetchQuizzes = useCallback(async (topicId) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(*)')
        .eq('topic_id', topicId)
        .order('created_at')

      if (!error && data) {
        setQuizzes(prev => [...prev.filter(q => q.topic_id !== topicId), ...data])
      }
      if (error) console.warn('Supabase fetchQuizzes:', error.message)
    } catch {
      // Retain active quizzes
    }
  }, [])

  // Loads the quizzes of several topics at once (used by the table of contents to know which topics have a quiz)
  const fetchSubjectQuizzes = useCallback(async (topicIds) => {
    const ids = (topicIds || []).filter(id => Number.isInteger(Number(id)))
    if (ids.length === 0) return
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, quiz_questions(*)')
        .in('topic_id', ids)
        .order('created_at')
      if (!error && data) {
        setQuizzes(prev => [...prev.filter(q => !ids.includes(q.topic_id)), ...data])
      }
    } catch {
      // keep current quizzes
    }
  }, [])

  // extra: { quizType: 'internal' | 'gform', externalUrl?: string }
  const addQuiz = useCallback(async (topicId, title, timeLimit, maxItems, passingScore, questions, extra = {}) => {
    const quizType = extra.quizType === 'gform' ? 'gform' : 'internal'
    const externalUrl = quizType === 'gform' ? (extra.externalUrl || '').trim() : null
    const topicIdNum = Number(topicId)
    const remote = isUuid(user?.id) && Number.isInteger(topicIdNum) && topicIdNum > 0

    if (remote) {
      try {
        const base = {
          topic_id: topicIdNum,
          title,
          time_limit_minutes: timeLimit,
          max_items: maxItems,
          passing_score: passingScore,
          created_by: user.id,
        }
        // quiz_type / external_url only exist after running the latest supabase_schema.sql
        const payload = quizType === 'gform' ? { ...base, quiz_type: 'gform', external_url: externalUrl } : base

        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .insert(payload)
          .select()
          .single()

        if (quizError || !quiz) {
          const missingCol = /quiz_type|external_url|column|schema cache/i.test(quizError?.message || '')
          showToast(
            missingCol && quizType === 'gform'
              ? 'Run the latest supabase_schema.sql in Supabase to enable Google Forms quizzes.'
              : quizError?.message || 'Could not create the quiz',
            'error'
          )
          return { error: quizError || new Error('Quiz insert failed') }
        }

        if (quizType === 'internal') {
          const rows = questions.map((q, idx) => ({
            quiz_id: quiz.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correctAnswer,
            order_number: idx + 1,
          }))
          const { error: qError } = await supabase.from('quiz_questions').insert(rows)
          if (qError) {
            // Never leave a quiz without its questions behind
            await supabase.from('quizzes').delete().eq('id', quiz.id)
            showToast(qError.message || 'Could not save the quiz questions', 'error')
            return { error: qError }
          }
        }

        await fetchQuizzes(topicId)
        showToast(quizType === 'gform' ? 'Google Form quiz published!' : 'Quiz published to your students!', 'success')
        return { data: quiz }
      } catch (e) {
        showToast(e.message || 'Could not create the quiz', 'error')
        return { error: e }
      }
    }

    // Local demo session
    const localQuiz = {
      id: 'quiz-' + Date.now(),
      topic_id: topicId,
      title,
      time_limit_minutes: timeLimit,
      max_items: maxItems,
      passing_score: passingScore,
      quiz_type: quizType,
      external_url: externalUrl,
      created_at: new Date().toISOString(),
      quiz_questions: quizType === 'gform' ? [] : questions.map((q, i) => ({
        id: `q-${i + 1}`,
        question: q.question,
        options: q.options,
        correct_answer: q.correctAnswer,
        order_number: i + 1,
      })),
    }
    setQuizzes(prev => [...prev, localQuiz])
    showToast('Quiz published!', 'success')
    return { data: localQuiz }
  }, [user, showToast, fetchQuizzes])

  const deleteQuiz = useCallback(async (quizId) => {
    if (isUuid(quizId) && isUuid(user?.id)) {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId)
      if (error) {
        showToast(error.message || 'Could not delete the quiz', 'error')
        return { error }
      }
    }
    setQuizzes(prev => prev.filter(q => q.id !== quizId))
    setQuizResults(prev => prev.filter(r => r.quiz_id !== quizId))
    setAllResults(prev => prev.filter(r => r.quiz_id !== quizId))
    showToast('Quiz deleted', 'info')
    return {}
  }, [user, showToast])

  // Google Forms quizzes can't be auto-graded: the student confirms they finished it,
  // which is recorded as a completed attempt (and unlocks the next topic).
  const completeExternalQuiz = useCallback(async (quiz) => {
    const row = {
      quiz_id: quiz.id,
      student_id: user?.id,
      score: 1,
      total_items: 1,
      percentage: 100,
      passed: true,
      answers: { external: true },
    }
    let saved = null
    if (isUuid(quiz.id) && isUuid(user?.id)) {
      const { data, error } = await supabase.from('quiz_results').insert(row).select().single()
      if (error) {
        showToast(error.message || 'Could not record your completion', 'error')
        return { error }
      }
      saved = data
    }
    const result = {
      ...row,
      id: saved?.id || 'res-' + Date.now(),
      submitted_at: saved?.submitted_at || new Date().toISOString(),
      quizzes: { id: quiz.id, title: quiz.title, topic_id: quiz.topic_id },
      users_profile: {
        full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Student',
      },
    }
    setQuizResults(prev => [result, ...prev])
    setAllResults(prev => [result, ...prev])
    showToast('Marked as completed. Next topic unlocked!', 'success')
    return { data: result }
  }, [user, profile, showToast])

  // ========== Quiz Results ==========

  const submitQuizResult = useCallback(async (quizId, score, totalItems, percentage, passed, answers) => {
    let finalScore = score
    let finalTotal = totalItems
    let finalPct = percentage
    let finalPassed = passed
    let serverResult = null

    try {
      if (isUuid(quizId) && isUuid(user?.id)) {
        // 1. Try server-side anti-cheat grading engine RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('submit_quiz_attempt', {
          p_quiz_id: quizId,
          p_answers: answers,
        })

        if (!rpcError && rpcData) {
          serverResult = rpcData
          finalScore = rpcData.score
          finalTotal = rpcData.totalItems
          finalPct = rpcData.percentage
          finalPassed = rpcData.passed
        } else {
          // Direct table insert fallback if RPC isn't deployed yet
          const { data, error } = await supabase
            .from('quiz_results')
            .insert({
              quiz_id: quizId,
              student_id: user.id,
              score,
              total_items: totalItems,
              percentage,
              passed,
              answers,
            })
            .select()
            .single()

          if (!error && data) {
            serverResult = data
          } else if (error) {
            showToast('Your score could not be saved to the server: ' + error.message, 'error')
          }
        }
      }
    } catch (e) {
      console.warn('Supabase submitQuizResult RPC fallback:', e)
    }

    const quizMeta = quizzes.find(q => q.id === quizId)
    const newResult = {
      id: serverResult?.id || serverResult?.resultId || ('res-' + Date.now()),
      quiz_id: quizId,
      student_id: user?.id,
      score: finalScore,
      total_items: finalTotal,
      percentage: finalPct,
      passed: finalPassed,
      answers,
      submitted_at: new Date().toISOString(),
      quizzes: {
        id: quizId,
        title: quizMeta?.title || (currentTopic?.title ? `${currentTopic.title} Quiz` : 'Topic Quiz'),
        topic_id: quizMeta?.topic_id ?? currentTopic?.id,
      },
      users_profile: {
        full_name: profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Student User',
      },
    }

    setQuizResults(prev => [newResult, ...prev])
    setAllResults(prev => [newResult, ...prev])

    showToast(
      finalPassed
        ? `🎉 Passed! Score: ${finalScore}/${finalTotal} (${finalPct}%) — Unlocked subsequent topics in Table of Contents!`
        : `Score: ${finalScore}/${finalTotal} (${finalPct}%) — Failed. 75% required to unlock next topic.`,
      finalPassed ? 'success' : 'error'
    )

    return { data: newResult }
  }, [user, profile, currentTopic, quizzes, showToast])

  const fetchMyResults = useCallback(async () => {
    try {
      if (isUuid(user?.id)) {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('*, quizzes(title, topic_id)')
          .eq('student_id', user.id)
          .order('submitted_at', { ascending: false })

        if (!error && data) setQuizResults(data)
        if (error) console.warn('Supabase fetchMyResults:', error.message)
      }
    } catch {
      // Local results remain
    }
  }, [user])

  const fetchAllResults = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*, users_profile!student_id(full_name), quizzes(title, topic_id)')
        .order('submitted_at', { ascending: false })

      if (!error && data) setAllResults(data)
      if (error) console.warn('Supabase fetchAllResults:', error.message)
    } catch {
      // Local allResults remain
    }
  }, [])

  // ========== Profile customization ==========

  const updateProfile = useCallback(async (fields) => {
    if (!user) return { error: new Error('Not signed in') }
    const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))

    if (!isUuid(user.id)) {
      // Local demo session: keep changes in memory only
      setProfile(prev => ({ ...(prev || { id: user.id }), ...clean }))
      showToast('Profile updated', 'success')
      return { data: clean }
    }

    try {
      const run = (payload) =>
        supabase.from('users_profile').update(payload).eq('id', user.id).select().maybeSingle()

      let { data, error } = await run(clean)

      // Columns added by the latest schema may not exist yet: save the base fields anyway
      if (error && /column|schema cache/i.test(error.message || '')) {
        const { bio, accent_color, theme, ...base } = clean
        if (Object.keys(base).length > 0) {
          ;({ data, error } = await run(base))
        } else {
          data = null
          error = null
        }
        if (!error) {
          setProfile(prev => ({ ...(prev || { id: user.id }), ...clean }))
          showToast('Saved. Run the latest supabase_schema.sql to store bio, theme and accent on your account.', 'info')
          return { data: clean }
        }
      }

      if (!error && !data) {
        // No profile row yet (account created before the signup trigger): create it
        const created = await supabase
          .from('users_profile')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: clean.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            ...clean,
          })
          .select()
          .maybeSingle()
        data = created.data
        error = created.error
      }

      if (error) {
        showToast(error.message || 'Could not update profile', 'error')
        return { error }
      }

      if (data) setProfile(data)
      showToast('Profile updated', 'success')
      return { data }
    } catch (e) {
      showToast(e.message || 'Could not update profile', 'error')
      return { error: e }
    }
  }, [user, showToast])

  const uploadAvatar = useCallback(async (file) => {
    try {
      const { blob, dataUrl } = await resizeAvatar(file)
      if (!isUuid(user?.id)) return { url: dataUrl }

      const path = `${user.id}/avatar.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
      if (error) throw error

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return { url: `${data.publicUrl}?v=${Date.now()}` }
    } catch (e) {
      showToast(e.message || 'Avatar upload failed', 'error')
      return { error: e }
    }
  }, [user, showToast])

  // ========== Announcements ==========

  const authorName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const isRemote = (subjectId) => isUuid(user?.id) && isUuid(subjectId)
  const AUTHOR_EMBED = 'author:users_profile!created_by(full_name, avatar_url)'

  const fetchAnnouncements = useCallback(async (subjectId) => {
    if (!isRemote(subjectId)) return
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`*, ${AUTHOR_EMBED}`)
        .eq('subject_id', subjectId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) return console.warn('Supabase fetchAnnouncements:', error.message)
      setAnnouncements(prev => [...prev.filter(a => a.subject_id !== subjectId), ...data])
    } catch (e) {
      console.warn('fetchAnnouncements failed:', e)
    }
  }, [user])

  const addAnnouncement = useCallback(async (subjectId, { title, body, pinned }) => {
    const base = { subject_id: subjectId, title, body, pinned: !!pinned }
    if (isRemote(subjectId)) {
      const { data, error } = await supabase
        .from('announcements')
        .insert({ ...base, created_by: user.id })
        .select(`*, ${AUTHOR_EMBED}`)
        .single()
      if (error) {
        showToast(error.message || 'Could not post announcement', 'error')
        return { error }
      }
      setAnnouncements(prev => [data, ...prev])
      showToast('Announcement posted', 'success')
      return { data }
    }
    const local = {
      id: 'ann-' + Date.now(),
      ...base,
      created_by: user?.id,
      created_at: new Date().toISOString(),
      author: { full_name: authorName, avatar_url: profile?.avatar_url },
    }
    setAnnouncements(prev => [local, ...prev])
    showToast('Announcement posted', 'success')
    return { data: local }
  }, [user, profile, authorName, showToast])

  const updateAnnouncement = useCallback(async (id, fields) => {
    if (isUuid(id) && isUuid(user?.id)) {
      const { error } = await supabase.from('announcements').update(fields).eq('id', id)
      if (error) {
        showToast(error.message || 'Could not update announcement', 'error')
        return { error }
      }
    }
    setAnnouncements(prev => prev.map(a => (a.id === id ? { ...a, ...fields } : a)))
    return {}
  }, [user, showToast])

  const deleteAnnouncement = useCallback(async (id) => {
    if (isUuid(id) && isUuid(user?.id)) {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) {
        showToast(error.message || 'Could not delete announcement', 'error')
        return { error }
      }
    }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    showToast('Announcement deleted', 'info')
    return {}
  }, [user, showToast])

  // ========== Assignments ==========

  const fetchAssignments = useCallback(async (subjectId) => {
    if (!isRemote(subjectId)) return
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('subject_id', subjectId)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) return console.warn('Supabase fetchAssignments:', error.message)
      setAssignments(prev => [...prev.filter(a => a.subject_id !== subjectId), ...data])
    } catch (e) {
      console.warn('fetchAssignments failed:', e)
    }
  }, [user])

  const addAssignment = useCallback(async (subjectId, { title, instructions, maxPoints, dueDate }) => {
    const base = {
      subject_id: subjectId,
      title,
      instructions,
      max_points: Number(maxPoints) || 100,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    }
    if (isRemote(subjectId)) {
      const { data, error } = await supabase
        .from('assignments')
        .insert({ ...base, created_by: user.id })
        .select()
        .single()
      if (error) {
        showToast(error.message || 'Could not create assignment', 'error')
        return { error }
      }
      setAssignments(prev => [...prev, data])
      showToast('Assignment created', 'success')
      return { data }
    }
    const local = { id: 'asg-' + Date.now(), ...base, created_by: user?.id, created_at: new Date().toISOString() }
    setAssignments(prev => [...prev, local])
    showToast('Assignment created', 'success')
    return { data: local }
  }, [user, showToast])

  const deleteAssignment = useCallback(async (id) => {
    if (isUuid(id) && isUuid(user?.id)) {
      const { error } = await supabase.from('assignments').delete().eq('id', id)
      if (error) {
        showToast(error.message || 'Could not delete assignment', 'error')
        return { error }
      }
    }
    setAssignments(prev => prev.filter(a => a.id !== id))
    setSubmissions(prev => prev.filter(s => s.assignment_id !== id))
    showToast('Assignment deleted', 'info')
    return {}
  }, [user, showToast])

  // ========== Submissions & grading ==========

  const fetchSubmissions = useCallback(async (subjectId) => {
    if (!isRemote(subjectId)) return
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*, assignments!inner(subject_id), student:users_profile!student_id(full_name, avatar_url, student_id_number)')
        .eq('assignments.subject_id', subjectId)
        .order('submitted_at', { ascending: false })
      if (error) return console.warn('Supabase fetchSubmissions:', error.message)
      const rows = data.map(({ assignments: a, ...rest }) => ({ ...rest, subject_id: a?.subject_id ?? subjectId }))
      setSubmissions(prev => [...prev.filter(s => s.subject_id !== subjectId), ...rows])
    } catch (e) {
      console.warn('fetchSubmissions failed:', e)
    }
  }, [user])

  const uploadSubmissionPhoto = useCallback(async (assignmentId, file) => {
    try {
      const { blob, dataUrl, name, size } = await prepareSubmissionPhoto(file)
      const id = 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)

      if (isUuid(user?.id) && isUuid(assignmentId)) {
        const path = `${user.id}/${assignmentId}/${Date.now()}-${name}`
        const { error } = await supabase.storage
          .from('assignment-submissions')
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })

        if (!error) {
          const { data } = supabase.storage.from('assignment-submissions').getPublicUrl(path)
          return {
            photo: {
              id,
              name,
              url: data.publicUrl,
              path,
              size,
              uploaded_at: new Date().toISOString(),
            },
          }
        }
        console.warn('Supabase storage upload fallback to inline image:', error.message)
      }

      return {
        photo: {
          id,
          name,
          url: dataUrl,
          size,
          uploaded_at: new Date().toISOString(),
        },
      }
    } catch (e) {
      showToast(e.message || 'Photo upload failed', 'error')
      return { error: e }
    }
  }, [user, showToast])

  const submitAssignment = useCallback(async (assignment, text, attachedFiles = []) => {
    const isLate = assignment.due_date && new Date(assignment.due_date) < new Date()
    const cleanFiles = Array.isArray(attachedFiles) ? attachedFiles : []
    const row = {
      assignment_id: assignment.id,
      student_id: user?.id,
      submission_text: text || '',
      attached_files: cleanFiles,
      status: isLate ? 'late' : 'submitted',
      submitted_at: new Date().toISOString(),
    }
    const merge = (saved) =>
      setSubmissions(prev => [
        ...prev.filter(s => !(s.assignment_id === assignment.id && s.student_id === user?.id)),
        {
          ...saved,
          attached_files: Array.isArray(saved.attached_files) ? saved.attached_files : cleanFiles,
          subject_id: assignment.subject_id,
          student: saved.student || { full_name: authorName, avatar_url: profile?.avatar_url },
        },
      ])

    if (isUuid(assignment.id) && isUuid(user?.id)) {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .upsert(row, { onConflict: 'assignment_id,student_id' })
        .select()
        .single()
      if (error) {
        showToast(error.message || 'Could not submit assignment', 'error')
        return { error }
      }
      merge(data)
      showToast(isLate ? 'Submitted (marked late)' : 'Assignment submitted', isLate ? 'info' : 'success')
      return { data }
    }
    const local = {
      id: 'sub-' + Date.now(),
      ...row,
      score: null,
      feedback: null,
      student: { full_name: authorName, avatar_url: profile?.avatar_url },
    }
    merge(local)
    showToast(isLate ? 'Submitted (marked late)' : 'Assignment submitted', isLate ? 'info' : 'success')
    return { data: local }
  }, [user, profile, authorName, showToast])

  const gradeSubmission = useCallback(async (submission, score, feedback) => {
    const fields = {
      score,
      feedback: feedback || null,
      status: 'graded',
      graded_by: isUuid(user?.id) ? user.id : null,
      graded_at: new Date().toISOString(),
    }
    if (isUuid(submission.id) && isUuid(user?.id)) {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update(fields)
        .eq('id', submission.id)
        .select()
        .single()
      if (error) {
        showToast(error.message || 'Could not save grade', 'error')
        return { error }
      }
      setSubmissions(prev => prev.map(s => (s.id === submission.id ? { ...s, ...data } : s)))
    } else {
      setSubmissions(prev => prev.map(s => (s.id === submission.id ? { ...s, ...fields } : s)))
    }
    showToast('Grade saved', 'success')
    return {}
  }, [user, showToast])

  // Fall back to auth metadata while the profile row is loading so role-based UI doesn't flicker
  const effectiveProfile = profile || (user
    ? {
        id: user.id,
        full_name: user.user_metadata?.full_name,
        role: user.user_metadata?.role || 'student',
        year_level: user.user_metadata?.year_level,
      }
    : null)

  const value = {
    // Auth
    user,
    profile: effectiveProfile,
    loading,
    login,
    signup,
    logout,

    // Subject selection
    selectedSubject,
    setSelectedSubject,
    subjects,
    fetchSubjects,
    addSubject,

    // Topics
    topics,
    fetchTopics,
    addTopic,
    currentTopic,
    setCurrentTopic,

    // Topic Content
    topicContent,
    fetchTopicContent,
    addTopicContent,
    uploadTopicPresentation,
    deleteTopicContent,

    // Quizzes
    quizzes,
    fetchQuizzes,
    addQuiz,
    fetchSubjectQuizzes,
    deleteQuiz,
    completeExternalQuiz,
    // Results
    quizResults,
    fetchMyResults,
    allResults,
    fetchAllResults,
    submitQuizResult,

    // UI
    toast,
    showToast,

    // Appearance & profile
    prefs,
    setThemePref,
    setAccentPref,
    updateProfile,
    uploadAvatar,

    // Announcements
    announcements,
    fetchAnnouncements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,

    // Assignments & submissions
    assignments,
    fetchAssignments,
    addAssignment,
    deleteAssignment,
    submissions,
    fetchSubmissions,
    uploadSubmissionPhoto,
    submitAssignment,
    gradeSubmission,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
