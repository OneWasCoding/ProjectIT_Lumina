-- ==============================================================================
-- Migration 05: Intentional Storage Visibility & Object Storage Security
-- ==============================================================================

-- 1. Intentional Storage Buckets Configuration (Public CDN for fast direct delivery)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'faculty-files',
    'faculty-files',
    true,
    52428800, -- 50MB
    ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']
  ),
  (
    'student-files',
    'student-files',
    true, -- 25MB (public for CDN getPublicUrl delivery)
    26214400,
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'application/json', 'application/zip']
  ),
  (
    'assignment-submissions',
    'assignment-submissions',
    true, -- 50MB (public for CDN getPublicUrl delivery)
    52428800,
    ARRAY['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'application/json']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop legacy storage policies to ensure clean state
DROP POLICY IF EXISTS "Public read for faculty course materials" ON storage.objects;
DROP POLICY IF EXISTS "Faculty can upload lecture materials" ON storage.objects;
DROP POLICY IF EXISTS "Faculty can update lecture materials" ON storage.objects;
DROP POLICY IF EXISTS "Faculty can delete lecture materials" ON storage.objects;
DROP POLICY IF EXISTS "Public read for student files" ON storage.objects;
DROP POLICY IF EXISTS "Private read for student files and faculty" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload into their own directory" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public read for assignment outputs" ON storage.objects;
DROP POLICY IF EXISTS "Student and faculty access to assignment outputs" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload assignment output into student folder" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own assignment output" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own assignment output" ON storage.objects;

-- 3. Storage Policies: faculty-files (Public Read, Faculty Write)
CREATE POLICY "Public read for faculty course materials"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'faculty-files');

CREATE POLICY "Faculty can upload lecture materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'faculty-files' AND
    (
      EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
      OR ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('faculty', 'admin'))
    )
  );

CREATE POLICY "Faculty can update lecture materials"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'faculty-files' AND
    (
      EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
      OR ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('faculty', 'admin'))
    )
  );

CREATE POLICY "Faculty can delete lecture materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'faculty-files' AND
    (
      EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
      OR ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('faculty', 'admin'))
    )
  );

-- 4. Storage Policies: student-files
CREATE POLICY "Public read for student files"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'student-files');

CREATE POLICY "Students can upload into their own directory"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-files' AND
    (
      split_part(name, '/', 1) = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Students can update their own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-files' AND
    (
      split_part(name, '/', 1) = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Students can delete their own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-files' AND
    (
      split_part(name, '/', 1) = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
      OR ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('faculty', 'admin'))
    )
  );

-- 5. Storage Policies: assignment-submissions
CREATE POLICY "Public read for assignment outputs"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'assignment-submissions');

CREATE POLICY "Students can upload assignment output into student folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-submissions' AND
    (
      split_part(name, '/', 1) = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Students can update their own assignment output"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assignment-submissions' AND
    (
      split_part(name, '/', 1) = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "Students can delete their own assignment output"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assignment-submissions' AND
    (
      split_part(name, '/', 1) = auth.uid()::text
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role IN ('faculty', 'admin'))
      OR ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('faculty', 'admin'))
    )
  );
