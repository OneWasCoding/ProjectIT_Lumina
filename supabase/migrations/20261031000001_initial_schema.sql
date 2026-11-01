-- ==============================================================================
-- Migration 01: Initial Schema (Extensions, Profiles, Subjects, Topics, Content)
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Profile Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  year_level TEXT CHECK (year_level IN ('1st Year', '2nd Year', '3rd Year', '4th Year') OR year_level IS NULL),
  department TEXT,
  student_id_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subjects / Courses Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT NOT NULL,
  year_level TEXT NOT NULL CHECK (year_level IN ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  description TEXT,
  created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Topics / Lessons (Sequenced Units)
CREATE TABLE IF NOT EXISTS public.topics (
  id SERIAL PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  order_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, order_number)
);

-- 4. Topic Content (Lesson Reading, Presentation Decks, Custom Insights)
CREATE TABLE IF NOT EXISTS public.topic_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id INT NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'presentation', 'notes')),
  content TEXT,
  slides JSONB,
  order_number INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
