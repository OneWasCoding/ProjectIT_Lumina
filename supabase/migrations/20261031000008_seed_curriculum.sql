-- ==============================================================================
-- Migration 08: Curriculum Seed Data (Subjects, Topics, Slides & Quizzes)
-- ==============================================================================

-- 1. Subjects across all year levels
INSERT INTO public.subjects (id, code, name, year_level, description)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'IT 101', 'IT 101: Introduction to Computing', '1st Year', 'Foundations of computer systems, digital logic, software engineering principles, and computer literacy.'),
  ('22222222-2222-2222-2222-222222222222', 'IT 102', 'IT 102: Computer Programming 1', '1st Year', 'Algorithmic problem solving, control structures, functional decomposition, and modern syntax.'),
  ('33333333-3333-3333-3333-333333333333', 'IT 201', 'IT 201: Data Structures & Algorithms', '2nd Year', 'Linear and non-linear data structures, trees, graphs, sorting algorithms, and complexity analysis.'),
  ('44444444-4444-4444-4444-444444444444', 'IT 301', 'IT 301: Web Systems & Technologies', '3rd Year', 'Fullstack web application engineering, RESTful APIs, relational databases, and cloud deployment.'),
  ('55555555-5555-5555-5555-555555555555', 'IT 401', 'IT 401: Capstone Project & Systems Integration', '4th Year', 'Enterprise architecture, agile development sprints, systems security, and final capstone defense.')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  year_level = EXCLUDED.year_level,
  description = EXCLUDED.description;

-- 2. Curriculum Topics (Topic 1 default selection, 75% quiz progression rule)
INSERT INTO public.topics (id, subject_id, order_number, title, summary)
VALUES
  -- IT 101 Topics
  (1, '11111111-1111-1111-1111-111111111111', 1, 'Topic 1: Computer Systems & Hardware Architecture', 'Core CPU microarchitecture, memory hierarchies (L1/L2 caches, RAM), system buses, and digital logic gates.'),
  (2, '11111111-1111-1111-1111-111111111111', 2, 'Topic 2: Operating Systems, Concurrency & Storage', 'Process scheduling, virtual memory paging, synchronization primitives, file systems, and kernel abstractions.'),
  (3, '11111111-1111-1111-1111-111111111111', 3, 'Topic 3: Database Systems & Relational Modeling', 'Relational algebra, SQL schema design, normalization (1NF-3NF/BCNF), transactions, and ACID compliance.'),
  -- IT 102 Topics
  (4, '22222222-2222-2222-2222-222222222222', 1, 'Topic 1: Algorithmic Logic & Syntax Basics', 'Primitive types, expressions, conditional branching, and procedural logic.'),
  (5, '22222222-2222-2222-2222-222222222222', 2, 'Topic 2: Functions, Arrays & Modular Design', 'Modular decomposition, memory references, loop paradigms, and clean coding standards.'),
  -- IT 201 Topics
  (6, '33333333-3333-3333-3333-333333333333', 1, 'Topic 1: Stacks, Queues & Dynamic Lists', 'Asymptotic complexity analysis, pointer manipulation, and sequential storage designs.'),
  (7, '33333333-3333-3333-3333-333333333333', 2, 'Topic 2: Trees, Graphs & Hash Tables', 'Binary search trees, balanced trees, graph traversal (BFS/DFS), and hash indexing.'),
  -- IT 301 Topics
  (8, '44444444-4444-4444-4444-444444444444', 1, 'Topic 1: HTTP Protocols & RESTful Architecture', 'Request/response lifecycle, statelessness, JSON serialization, and API design.'),
  (9, '44444444-4444-4444-4444-444444444444', 2, 'Topic 2: Authentication, JWT & Security Best Practices', 'Role-based access control, cryptographic tokens, password hashing, and CORS headers.'),
  -- IT 401 Topics
  (10, '55555555-5555-5555-5555-555555555555', 1, 'Topic 1: Enterprise System Architecture & CI/CD', 'Microservices vs monoliths, containerization, automated testing, and cloud infrastructure.')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary;

-- Synchronize serial sequence safely
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  seq_name := pg_get_serial_sequence('public.topics', 'id');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('SELECT setval(%L, GREATEST(COALESCE((SELECT MAX(id) FROM public.topics), 0), 20))', seq_name);
  END IF;
END $$;

-- 3. Topic Content (Slide Decks & Lesson Readings)
INSERT INTO public.topic_content (id, topic_id, content_type, content, slides, order_number)
VALUES
  (
    'cccccccc-cccc-cccc-cccc-000000000001',
    1,
    'presentation',
    'Topic 1 Slide Deck',
    '[
      {"title": "Computer Systems & Hardware Architecture", "bullets": ["CPU microarchitectures & arithmetic logic unit (ALU)", "Memory hierarchy: registers, L1/L2 caches, RAM, secondary storage", "System buses, I/O interfaces, and digital logic gates"], "color": "#7c5cfc", "insight": "Hardware abstractions define software performance boundaries."},
      {"title": "Memory Hierarchy & Cache Locality", "bullets": ["Temporal locality: recently accessed data is likely to be accessed again", "Spatial locality: data near recently accessed data is likely to be accessed", "Cache hits vs cache misses impact execution cycles significantly"], "color": "#00d4aa", "insight": "Write algorithms that respect cache locality for optimal speed."},
      {"title": "System Architecture Best Practices", "bullets": ["Always validate inputs at the interface boundary", "Minimize I/O bottlenecks through asynchronous operations", "75% passing standard required on the unit assessment"], "color": "#ff6b9d", "insight": "Review notes thoroughly before starting the 10-minute quiz!"}
    ]'::jsonb,
    1
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000002',
    1,
    'text',
    'Core Architectural Principles:\n\n1. Modular Decomposition: Breaking down complex problems into smaller, manageable subcomponents.\n2. Abstraction & Encapsulation: Hiding unnecessary lower-level complexities while exposing clean, secure interfaces.\n3. Scalability & Resilience: Designing workflows that can gracefully absorb increasing traffic and maintain data integrity.',
    NULL,
    2
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000003',
    2,
    'presentation',
    'Topic 2 Slide Deck',
    '[
      {"title": "Operating Systems & Kernel Services", "bullets": ["User space vs Kernel space privilege rings", "Interrupt vectors, system calls, and context switching", "Process control blocks (PCB) and thread scheduling"], "color": "#38bdf8", "insight": "Kernels arbitrate access to shared resources without letting processes crash each other."},
      {"title": "Concurrency & Synchronization", "bullets": ["Race conditions occur when threads access shared memory concurrently", "Semaphores, mutexes, and atomic operations prevent corruption", "Deadlock conditions: mutual exclusion, hold-and-wait, no preemption, circular wait"], "color": "#a855f7", "insight": "Acquire locks in a strict global hierarchy to prevent deadlocks."},
      {"title": "Virtual Memory & Paging", "bullets": ["MMU translates virtual page addresses into physical frames", "Page faults trigger disk fetching to load requested pages", "Page replacement algorithms: LRU, FIFO, and clock algorithm"], "color": "#10b981", "insight": "Virtual memory gives each program the illusion of contiguous private RAM."}
    ]'::jsonb,
    1
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000004',
    2,
    'text',
    'Operating System Fundamentals:\n\nAn Operating System is the primary software layer bridging hardware resources and user applications.\n\nKey responsibilities include:\n- Process Scheduling (CPU time allocation)\n- Memory Management (virtual memory, page tables, cache policies)\n- File System Management (inode structures, directory indexing, journals)\n- Device Drivers & Hardware I/O Control',
    NULL,
    2
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000005',
    3,
    'presentation',
    'Topic 3 Slide Deck',
    '[
      {"title": "Relational Modeling & Schema Design", "bullets": ["Entities, attributes, and relationship cardinality (1:1, 1:N, M:N)", "Primary keys, foreign keys, and referential integrity constraints", "Database normalization: 1NF through 3NF/BCNF"], "color": "#f59e0b", "insight": "Normalize until it hurts, then denormalize deliberately for read performance."},
      {"title": "ACID Transaction Guarantees", "bullets": ["Atomicity: All operations succeed or all roll back", "Consistency: Invariants and schema constraints are strictly preserved", "Isolation: Concurrent transactions do not observe intermediate states", "Durability: Committed transactions survive system crashes"], "color": "#ec4899", "insight": "ACID compliance protects mission-critical educational and financial records."},
      {"title": "Query Optimization & Indexing", "bullets": ["B-Trees are the default indexing structure for fast range queries", "Indexes speed up SELECT queries but add overhead to INSERT/UPDATE", "Analyze execution plans using EXPLAIN ANALYZE"], "color": "#6366f1", "insight": "Index foreign keys and frequent WHERE clause predicates."}
    ]'::jsonb,
    1
  )
ON CONFLICT (id) DO UPDATE SET
  slides = EXCLUDED.slides,
  content = EXCLUDED.content;

-- 4. Quizzes for Topics 1, 2, and 3
INSERT INTO public.quizzes (id, topic_id, title, time_limit_minutes, max_items, passing_score)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 1, 'Topic 1: Computer Systems & Architecture Assessment', 10, 5, 75),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 2, 'Topic 2: Operating Systems & Concurrency Assessment', 10, 5, 75),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 3, 'Topic 3: Database Systems & Relational Modeling Assessment', 10, 5, 75)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  time_limit_minutes = EXCLUDED.time_limit_minutes,
  max_items = EXCLUDED.max_items,
  passing_score = EXCLUDED.passing_score;

-- 5. Quiz Questions
INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, explanation, order_number)
VALUES
  -- Topic 1 Questions
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'What is the primary role of an Operating System abstraction layer?', '["Managing hardware resources & providing secure execution boundaries", "Applying CSS colors", "Printing paper reports", "Formatting hard drives on boot"]'::jsonb, 0, 'The OS abstracts hardware resources and manages execution permissions.', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Which memory layer provides the fastest read/write access to the CPU core?', '["L1 Cache Registers", "Main Memory (RAM)", "NVMe SSD Storage", "Network Storage"]'::jsonb, 0, 'L1 cache operates at CPU clock speeds with nanosecond latency.', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'What is the minimum passing score required to unlock Topic 2 in the curriculum?', '["75%", "50%", "60%", "90%"]'::jsonb, 0, 'Academic standard requires 75% or higher to unlock subsequent topics.', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'Which component of the CPU performs mathematical operations like addition and logical comparisons?', '["Arithmetic Logic Unit (ALU)", "Control Bus", "SATA Controller", "BIOS Chip"]'::jsonb, 0, 'The ALU performs all arithmetic calculations and boolean logic tests.', 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', 'What type of storage is volatile and loses its state when power is lost?', '["Random Access Memory (RAM)", "Solid State Drive (SSD)", "Optical Disc", "Flash Drive"]'::jsonb, 0, 'RAM requires constant power refresh cycles to retain cell charges.', 5),

  -- Topic 2 Questions
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'What is the purpose of Virtual Memory in modern operating systems?', '["Allowing processes to use more memory than physically available via disk paging", "Increasing CPU clock speeds", "Cooling the computer hardware", "Connecting to the Wi-Fi network"]'::jsonb, 0, 'Virtual memory isolates processes and enables demand paging from disk storage.', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'Which of the following describes a Race Condition in concurrent programming?', '["Two or more threads access shared mutable data without proper synchronization", "A thread running too quickly for the CPU", "A program waiting for internet connectivity", "An infinite loop in a while construct"]'::jsonb, 0, 'Race conditions produce non-deterministic state when multiple threads access shared memory.', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'What is a Deadlock in operating system process management?', '["A situation where processes are permanently blocked waiting for resources held by each other", "A kernel panic caused by bad RAM", "When a computer runs out of battery power", "When an application window is closed"]'::jsonb, 0, 'Deadlock occurs when processes form a circular dependency waiting on resources.', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'Which CPU execution ring typically runs the Operating System Kernel?', '["Ring 0 (Highest Privilege)", "Ring 3 (User Space)", "Ring 1", "Ring 2"]'::jsonb, 0, 'Ring 0 provides unrestricted access to hardware instructions and physical memory.', 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', 'What data structure does the OS use to track an individual process state?', '["Process Control Block (PCB)", "Binary Search Tree", "Linked Hash Table", "HTML DOM Tree"]'::jsonb, 0, 'The PCB maintains registers, program counter, open file descriptors, and scheduling priority.', 5),

  -- Topic 3 Questions
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'What does the "A" in ACID database transactions stand for?', '["Atomicity (all-or-nothing execution)", "Availability", "Asynchronous", "Authentication"]'::jsonb, 0, 'Atomicity ensures that all statements within a transaction succeed, or the entire transaction rolls back.', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', 'What is the purpose of database normalization (1NF, 2NF, 3NF)?', '["Minimizing data redundancy and preventing update anomalies", "Making the database faster at printing reports", "Encrypting user passwords", "Compressing images"]'::jsonb, 0, 'Normalization structures schemas into logical relations to eliminate duplicate data.', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000013', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'Which constraint guarantees that a foreign key references a valid primary key row?', '["Referential Integrity Constraint", "Check Constraint", "Unique Index", "Default Value"]'::jsonb, 0, 'Referential integrity prevents orphaned records across relational tables.', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'What is the default indexing data structure used by PostgreSQL for primary keys and foreign keys?', '["B-Tree", "Linked List", "Radix Trie", "Bloom Filter"]'::jsonb, 0, 'B-Trees provide O(log n) search, insertion, and range scan performance.', 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000015', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', 'What SQL command is used to inspect the query execution plan and performance cost in PostgreSQL?', '["EXPLAIN ANALYZE", "SELECT COST", "INSPECT TABLE", "SHOW RUNTIME"]'::jsonb, 0, 'EXPLAIN ANALYZE executes the statement and displays actual run times and scan methods.', 5)
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  order_number = EXCLUDED.order_number;
