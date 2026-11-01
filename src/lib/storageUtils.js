import { supabase } from './supabase.js'

/**
 * Upload a faculty course file or lecture material
 */
export async function uploadFacultyFile(file, facultyId, subjectId = null, topicId = null, category = 'lecture_slides', description = '') {
  try {
    const fileExt = file.name.split('.').pop()
    const filePath = `faculty/${facultyId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('faculty-files')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('faculty-files')
      .getPublicUrl(filePath)

    // Record in database
    const { data, error: dbError } = await supabase
      .from('faculty_files')
      .insert({
        faculty_id: facultyId,
        subject_id: subjectId,
        topic_id: topicId,
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type || fileExt,
        category,
        description,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading faculty file:', error)
    return { data: null, error }
  }
}

/**
 * Upload a student study file or portfolio work
 */
export async function uploadStudentFile(file, studentId, subjectId = null, topicId = null, category = 'notes') {
  try {
    const fileExt = file.name.split('.').pop()
    const filePath = `${studentId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('student-files')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('student-files')
      .getPublicUrl(filePath)

    const { data, error: dbError } = await supabase
      .from('student_files')
      .insert({
        student_id: studentId,
        subject_id: subjectId,
        topic_id: topicId,
        file_name: file.name,
        file_path: filePath,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type || fileExt,
        category,
      })
      .select()
      .single()

    if (dbError) throw dbError
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading student file:', error)
    return { data: null, error }
  }
}

/**
 * Upload an assignment output or submission
 */
export async function uploadAssignmentOutput(file, studentId, assignmentId, submissionText = '') {
  try {
    const fileExt = file.name.split('.').pop()
    const filePath = `${studentId}/${assignmentId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('assignment-submissions')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('assignment-submissions')
      .getPublicUrl(filePath)

    const attachedFile = {
      name: file.name,
      path: filePath,
      url: publicUrl,
      size: file.size,
      type: file.type || fileExt,
      uploadedAt: new Date().toISOString(),
    }

    const { data, error: dbError } = await supabase
      .from('assignment_submissions')
      .upsert({
        assignment_id: assignmentId,
        student_id: studentId,
        submission_text: submissionText,
        attached_files: [attachedFile],
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) throw dbError
    return { data, error: null }
  } catch (error) {
    console.error('Error submitting assignment:', error)
    return { data: null, error }
  }
}
