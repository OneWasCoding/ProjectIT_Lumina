-- ==============================================================================
-- Migration 04: Quizzes, Anti-Cheat Question Views & Server-Side Grading Engine
-- ==============================================================================

-- 1. Quizzes (10-minute timer, max 50 items, 75% pass standard)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id INT NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time_limit_minutes INT NOT NULL DEFAULT 10,
  max_items INT NOT NULL DEFAULT 50,
  passing_score INT NOT NULL DEFAULT 75,
  created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quiz Questions Table (Contains master correct answers)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL,
  explanation TEXT,
  order_number INT NOT NULL DEFAULT 1
);

-- 3. Quiz Results Table (Records student score, pass/fail, and progression)
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_items INT NOT NULL,
  percentage FLOAT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  answers JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Anti-Cheat Student Question View (Excludes correct_answer from client inspections)
CREATE OR REPLACE VIEW public.student_quiz_questions AS
SELECT
  id,
  quiz_id,
  question,
  options,
  order_number
FROM public.quiz_questions;

-- 5. Secure Server-Side Quiz Grading Function
-- Eliminates client-side tampering by computing grades directly against master answers
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id UUID,
  p_answers JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_passing_score INT;
  v_total_items INT := 0;
  v_score INT := 0;
  v_percentage FLOAT := 0.0;
  v_passed BOOLEAN := FALSE;
  v_q RECORD;
  v_chosen INT;
  v_result_id UUID;
  v_review JSONB := '[]'::jsonb;
BEGIN
  -- Authenticate caller
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated attempt. Please sign in.';
  END IF;

  -- Fetch passing threshold
  SELECT passing_score INTO v_passing_score
  FROM public.quizzes
  WHERE id = p_quiz_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz does not exist.';
  END IF;

  -- Iterate through master questions and compute score securely
  FOR v_q IN
    SELECT id, question, options, correct_answer, order_number
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY order_number
  LOOP
    v_total_items := v_total_items + 1;
    -- Retrieve chosen answer from answers object (by order index or question id)
    v_chosen := COALESCE(
      (p_answers->>v_q.id)::INT,
      (p_answers->>(v_q.order_number - 1)::TEXT)::INT,
      -1
    );

    IF v_chosen = v_q.correct_answer THEN
      v_score := v_score + 1;
    END IF;

    -- Build review item
    v_review := v_review || jsonb_build_object(
      'questionId', v_q.id,
      'orderNumber', v_q.order_number,
      'chosen', v_chosen,
      'correctAnswer', v_q.correct_answer,
      'isCorrect', (v_chosen = v_q.correct_answer)
    );
  END LOOP;

  IF v_total_items = 0 THEN
    RAISE EXCEPTION 'This quiz contains no questions.';
  END IF;

  v_percentage := ROUND(((v_score::FLOAT / v_total_items::FLOAT) * 100)::numeric, 1);
  v_passed := (v_percentage >= v_passing_score);

  -- Insert verified result into database
  INSERT INTO public.quiz_results (
    quiz_id,
    student_id,
    score,
    total_items,
    percentage,
    passed,
    answers
  )
  VALUES (
    p_quiz_id,
    v_student_id,
    v_score,
    v_total_items,
    v_percentage,
    v_passed,
    p_answers
  )
  RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'resultId', v_result_id,
    'quizId', p_quiz_id,
    'score', v_score,
    'totalItems', v_total_items,
    'percentage', v_percentage,
    'passed', v_passed,
    'passingScore', v_passing_score,
    'review', v_review
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
