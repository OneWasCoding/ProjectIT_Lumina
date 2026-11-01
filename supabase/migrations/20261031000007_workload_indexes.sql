-- ==============================================================================
-- Migration 07: Workload-Based Indexes for High-Performance LMS Queries
-- ==============================================================================

-- 1. Profiles & Roles Workload
CREATE INDEX IF NOT EXISTS idx_users_profile_role
  ON public.users_profile(role);

CREATE INDEX IF NOT EXISTS idx_users_profile_year_level
  ON public.users_profile(year_level)
  WHERE year_level IS NOT NULL;

-- 2. Curriculum & Topics Workload
CREATE INDEX IF NOT EXISTS idx_subjects_year_level
  ON public.subjects(year_level);

CREATE INDEX IF NOT EXISTS idx_subjects_created_by
  ON public.subjects(created_by);

CREATE INDEX IF NOT EXISTS idx_topics_subject_order
  ON public.topics(subject_id, order_number ASC);

CREATE INDEX IF NOT EXISTS idx_topic_content_topic_order
  ON public.topic_content(topic_id, order_number ASC);

-- 3. File Repositories Workload
CREATE INDEX IF NOT EXISTS idx_faculty_files_subject_category
  ON public.faculty_files(subject_id, category);

CREATE INDEX IF NOT EXISTS idx_faculty_files_faculty
  ON public.faculty_files(faculty_id);

CREATE INDEX IF NOT EXISTS idx_student_files_student_category
  ON public.student_files(student_id, category);

-- 4. Assignments & Submissions Workload
CREATE INDEX IF NOT EXISTS idx_assignments_subject_due
  ON public.assignments(subject_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student
  ON public.assignment_submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_status
  ON public.assignment_submissions(assignment_id, status);

-- 5. Quizzes & Progression Gate Workload (75% Check & Fast Sorting)
CREATE INDEX IF NOT EXISTS idx_quizzes_topic
  ON public.quizzes(topic_id);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order
  ON public.quiz_questions(quiz_id, order_number ASC);

-- Critical: Student history retrieval (sorted by date descending)
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_submitted
  ON public.quiz_results(student_id, submitted_at DESC);

-- Critical: TOC progression gate check (checking if student passed quiz >= 75%)
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_quiz_passed
  ON public.quiz_results(student_id, quiz_id, passed);

-- Critical: Faculty analytics score sorting
CREATE INDEX IF NOT EXISTS idx_quiz_results_percentage
  ON public.quiz_results(percentage DESC);

