-- ==============================================================================
-- Migration 03: LMS Course Files, Student Portfolios & Assignment Deliverables
-- ==============================================================================

-- 1. Faculty Course Materials & Uploads
CREATE TABLE IF NOT EXISTS public.faculty_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id INT REFERENCES public.topics(id) ON DELETE SET NULL,
  faculty_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  category TEXT DEFAULT 'lecture_slides' CHECK (category IN ('syllabus', 'lecture_slides', 'reading_material', 'reference', 'other')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Personal Notes & Study Files
CREATE TABLE IF NOT EXISTS public.student_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id INT REFERENCES public.topics(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  category TEXT DEFAULT 'notes' CHECK (category IN ('notes', 'insight_slide', 'project', 'portfolio', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assignments Created by Faculty
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id INT REFERENCES public.topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  attached_files JSONB DEFAULT '[]'::jsonb,
  max_points INT NOT NULL DEFAULT 100,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Assignment Submissions & Outputs (Grading, Feedback, Outputs)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  submission_text TEXT,
  attached_files JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned', 'late')),
  score NUMERIC(5, 2),
  feedback TEXT,
  graded_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);
