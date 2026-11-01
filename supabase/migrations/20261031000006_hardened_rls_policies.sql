-- ==============================================================================
-- Migration 06: Hardened RLS Policies, Profile Anti-Tamper & Granular Access
-- ==============================================================================

-- 1. Anti-Privilege Escalation Trigger on users_profile
-- Disallows any student/user from updating their role to faculty/admin
CREATE OR REPLACE FUNCTION public.protect_user_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    -- Only admin accounts or system security definer functions can modify roles
    IF NOT EXISTS (
      SELECT 1 FROM public.users_profile
      WHERE id = auth.uid() AND role = 'admin'
    ) AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Security Violation: Users cannot alter their own role.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_user_profile_role ON public.users_profile;
CREATE TRIGGER trg_protect_user_profile_role
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_profile_role();

-- 2. Drop all previous table-level policies to ensure strict, clean re-application
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 3. Hardened Policies: users_profile
CREATE POLICY "Authenticated users can view profiles"
  ON public.users_profile FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile on signup"
  ON public.users_profile FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their personal profile fields"
  ON public.users_profile FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Hardened Policies: subjects
CREATE POLICY "Subjects readable by all users"
  ON public.subjects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- 6. Hardened Policies: topics & content
CREATE POLICY "Topics readable by all users"
  ON public.topics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage topics"
  ON public.topics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

CREATE POLICY "Content readable by all users"
  ON public.topic_content FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create custom slide notes"
  ON public.topic_content FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Faculty can manage all topic content"
  ON public.topic_content FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- 7. Hardened Policies: faculty_files & student_files
CREATE POLICY "Faculty files readable by all users"
  ON public.faculty_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage course files"
  ON public.faculty_files FOR ALL TO authenticated
  USING (
    auth.uid() = faculty_id OR
    EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
  );

CREATE POLICY "Student files readable by owner and faculty"
  ON public.student_files FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
  );

CREATE POLICY "Students can manage own files"
  ON public.student_files FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 8. Hardened Policies: assignments & assignment_submissions
CREATE POLICY "Assignments readable by all users"
  ON public.assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- Submissions SELECT: Students see own; Faculty sees all
CREATE POLICY "Submissions viewable by student owner and faculty"
  ON public.assignment_submissions FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
  );

-- Submissions INSERT: Students only, cannot self-assign scores or grades
CREATE POLICY "Students can submit assignment deliverables"
  ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    score IS NULL AND
    feedback IS NULL AND
    graded_by IS NULL
  );

-- Submissions UPDATE (Student): Students can update their draft/submission text/files before grading
CREATE POLICY "Students can update their un-graded submission"
  ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (
    auth.uid() = student_id AND
    status IN ('draft', 'submitted')
  )
  WITH CHECK (
    auth.uid() = student_id AND
    score IS NULL AND
    graded_by IS NULL
  );

-- Submissions UPDATE (Faculty): Faculty can grade, score, and write feedback
CREATE POLICY "Faculty can grade and review submissions"
  ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- 9. Hardened Policies: quizzes & quiz_questions
CREATE POLICY "Quizzes readable by all users"
  ON public.quizzes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage quizzes"
  ON public.quizzes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- Questions: Master question rows with correct_answer are strictly faculty/admin accessible
CREATE POLICY "Faculty can view questions with answers"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

CREATE POLICY "Faculty can manage questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin')));

-- 10. Hardened Policies: quiz_results
CREATE POLICY "Results viewable by student owner and faculty"
  ON public.quiz_results FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
  );

CREATE POLICY "Allow server-side grading inserts"
  ON public.quiz_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
