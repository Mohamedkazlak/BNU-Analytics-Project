-- BNU Analytics demo seed
-- Deterministic, reproducible synthetic dataset. People/students represent a
-- demo roster; exams, questions, attempts, answers, flags and transcripts are
-- generated with hash-based variation (high / average / weak performers,
-- absences, late starts, mixed letter grades) and marked is_synthetic = true.
--
-- Apply after schema.sql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql

begin;

insert into org_units (id, parent_id, level, code, name, title_for_role) values
  ('uni-bnu', null, 'university', 'BNU', 'Benha National University', 'President'),
  ('sec-engineering', 'uni-bnu', 'sector', 'ENG-SEC', 'Engineering and Basic & Applied Sciences', 'Dean, Engineering and Basic & Applied Sciences Sector'),
  ('prog-engineering', 'sec-engineering', 'program', 'ENG', 'Engineering', 'Program Director, Engineering'),
  ('prog-energy-sciences', 'sec-engineering', 'program', 'ENE', 'Energy Sciences', 'Program Director, Energy Sciences'),
  ('prog-computer-science', 'sec-engineering', 'program', 'CS', 'Computer Science', 'Program Director, Computer Science'),
  ('sec-health', 'uni-bnu', 'sector', 'HLTH-SEC', 'Health Sciences', 'Dean, Health Sciences Sector'),
  ('prog-medicine', 'sec-health', 'program', 'MED', 'Medicine', 'Program Director, Medicine'),
  ('prog-dentistry', 'sec-health', 'program', 'DEN', 'Dentistry', 'Program Director, Dentistry'),
  ('prog-physical-therapy', 'sec-health', 'program', 'PT', 'Physical Therapy', 'Program Director, Physical Therapy'),
  ('prog-veterinary', 'sec-health', 'program', 'VET', 'Veterinary', 'Program Director, Veterinary'),
  ('sec-humanities', 'uni-bnu', 'sector', 'HUM-SEC', 'Literature, Arts and Humanities', 'Dean, Literature, Arts and Humanities Sector'),
  ('prog-visual-arts', 'sec-humanities', 'program', 'ART', 'Visual Arts and Design', 'Program Director, Visual Arts and Design'),
  ('prog-economics', 'sec-humanities', 'program', 'ECO', 'Economics and Business Administration', 'Program Director, Economics and Business Administration');

insert into institution_settings (org_unit_id, pass_mark) values ('uni-bnu', 60);

insert into academic_years (id, label, start_date, end_date, is_current) values
  ('2023/24', '2023/24', '2023-09-17', '2024-06-20', false),
  ('2024/25', '2024/25', '2024-09-15', '2025-06-19', false),
  ('2025/26', '2025/26', '2025-09-14', '2026-06-18', true);

insert into terms (id, academic_year_id, code, name, start_date, end_date) values
  ('term-2023-spring', '2023/24', 'spring', 'Spring 2024', '2024-02-04', '2024-06-20'),
  ('term-2024-spring', '2024/25', 'spring', 'Spring 2025', '2025-02-02', '2025-06-19'),
  ('term-2025-spring', '2025/26', 'spring', 'Spring 2026', '2026-02-01', '2026-06-18');

insert into people (id, full_name, email) values
  ('p-priya-raman', 'Dr. Priya Raman', 'priya.raman@bnu.edu.eg'),
  ('p-karim-fawzy', 'Prof. Karim Fawzy', 'karim.fawzy@bnu.edu.eg'),
  ('p-hana-elmasry', 'Dr. Hana El-Masry', 'hana.el.masry@bnu.edu.eg'),
  ('p-daniel-osei', 'Prof. Daniel Osei', 'daniel.osei@bnu.edu.eg'),
  ('p-sara-mansour', 'Sara Mansour', 'sara.mansour@bnu.edu.eg'),
  ('p-tomas-oyelaran', 'Prof. Tomas Oyelaran', 'tomas.oyelaran@bnu.edu.eg'),
  ('p-layla-nasser', 'Layla Nasser', 'layla.nasser@bnu.edu.eg'),
  ('p-yasser-mansour', 'Prof. Yasser Mansour', 'yasser.mansour@bnu.edu.eg'),
  ('p-mai-khalil', 'Dr. Mai Khalil', 'mai.khalil@bnu.edu.eg'),
  ('p-tarek-fouad', 'Dr. Tarek Fouad', 'tarek.fouad@bnu.edu.eg'),
  ('p-yasmin-adel', 'Dr. Yasmin Adel', 'yasmin.adel@bnu.edu.eg'),
  ('p-walid-naguib', 'Prof. Walid Naguib', 'walid.naguib@bnu.edu.eg'),
  ('p-amira-saleh', 'Dr. Amira Saleh', 'amira.saleh@bnu.edu.eg'),
  ('p-nabil-youssef', 'Prof. Nabil Youssef', 'nabil.youssef@bnu.edu.eg'),
  ('p-lina-haddad', 'Prof. Lina Haddad', 'lina.haddad@bnu.edu.eg'),
  ('p-nour-elsayed', 'Dr. Nour El-Sayed', 'nour.el.sayed@bnu.edu.eg');

insert into staff (person_id, title, org_unit_id) values
  ('p-priya-raman', 'University President', 'uni-bnu'),
  ('p-karim-fawzy', 'VP for Academic Affairs', 'uni-bnu'),
  ('p-hana-elmasry', 'Dean, Engineering and Basic & Applied Sciences', 'sec-engineering'),
  ('p-daniel-osei', 'Program Director, Computer Science', 'prog-computer-science'),
  ('p-sara-mansour', 'Academic Affairs Officer, Computer Science', 'prog-computer-science'),
  ('p-tomas-oyelaran', 'Professor of Computer Science', 'prog-computer-science'),
  ('p-layla-nasser', 'IT · Academic Integrity', 'uni-bnu'),
  ('p-yasser-mansour', 'Professor of Energy Sciences', 'prog-energy-sciences'),
  ('p-mai-khalil', 'Lecturer of Computer Science', 'prog-computer-science'),
  ('p-tarek-fouad', 'Lecturer of Computer Science', 'prog-computer-science'),
  ('p-yasmin-adel', 'Professor of Medicine', 'prog-medicine'),
  ('p-walid-naguib', 'Professor of Dentistry', 'prog-dentistry'),
  ('p-amira-saleh', 'Professor of Physical Therapy', 'prog-physical-therapy'),
  ('p-nabil-youssef', 'Professor of Veterinary Medicine', 'prog-veterinary'),
  ('p-lina-haddad', 'Professor of Visual Arts', 'prog-visual-arts'),
  ('p-nour-elsayed', 'Professor of Economics', 'prog-economics');

insert into courses (id, program_id, code, name, credits, year_level) values
  ('c-eng-110', 'prog-engineering', 'ENG 110', 'Engineering Drawing', 3, 1),
  ('c-eng-120', 'prog-engineering', 'ENG 120', 'Mechanics I', 4, 1),
  ('c-eng-130', 'prog-engineering', 'ENG 130', 'Mechanics II', 4, 2),
  ('c3', 'prog-engineering', 'ENG 210', 'Statics & Structural Analysis', 4, 3),
  ('c-ene-110', 'prog-energy-sciences', 'ENE 110', 'Introduction to Energy Systems', 3, 1),
  ('c-ene-120', 'prog-energy-sciences', 'ENE 120', 'Fluid Mechanics', 4, 1),
  ('c-ene-210', 'prog-energy-sciences', 'ENE 210', 'Heat Transfer', 3, 2),
  ('c2', 'prog-energy-sciences', 'ENR 220', 'Thermodynamics of Energy Systems', 4, 3),
  ('c-cs-101', 'prog-computer-science', 'CS 101', 'Programming I', 4, 1),
  ('c-cs-102', 'prog-computer-science', 'CS 102', 'Discrete Mathematics', 3, 1),
  ('c-cs-103', 'prog-computer-science', 'MATH 101', 'Calculus for Computing', 3, 1),
  ('c-cs-203', 'prog-computer-science', 'CS 203', 'Computer Organization', 3, 2),
  ('c-cs-204', 'prog-computer-science', 'CS 204', 'Software Engineering', 3, 2),
  ('c-cs-205', 'prog-computer-science', 'CS 205', 'Computer Networks', 3, 2),
  ('c1', 'prog-computer-science', 'CS 201', 'Data Structures & Algorithms', 4, 3),
  ('c10', 'prog-computer-science', 'CS 202', 'Database Systems', 3, 3),
  ('c11', 'prog-computer-science', 'CS 301', 'Operating Systems', 4, 3),
  ('c-med-110', 'prog-medicine', 'MED 101', 'Medical Biology', 4, 1),
  ('c-med-120', 'prog-medicine', 'MED 102', 'Biochemistry I', 3, 1),
  ('c-med-201', 'prog-medicine', 'MED 201', 'Physiology I', 4, 2),
  ('c4', 'prog-medicine', 'MED 110', 'Human Anatomy', 5, 3),
  ('c-den-110', 'prog-dentistry', 'DEN 101', 'Dental Morphology', 3, 1),
  ('c-den-201', 'prog-dentistry', 'DEN 201', 'Dental Materials', 3, 2),
  ('c5', 'prog-dentistry', 'DEN 120', 'Oral Biology', 4, 3),
  ('c-pt-110', 'prog-physical-therapy', 'PT 101', 'Foundations of Rehabilitation', 3, 1),
  ('c-pt-201', 'prog-physical-therapy', 'PT 201', 'Therapeutic Exercise', 3, 2),
  ('c6', 'prog-physical-therapy', 'PT 130', 'Kinesiology', 4, 3),
  ('c-vet-110', 'prog-veterinary', 'VET 101', 'Animal Anatomy', 4, 1),
  ('c-vet-201', 'prog-veterinary', 'VET 201', 'Veterinary Microbiology', 3, 2),
  ('c7', 'prog-veterinary', 'VET 140', 'Animal Physiology', 4, 3),
  ('c-art-110', 'prog-visual-arts', 'ART 101', 'Drawing Fundamentals', 3, 1),
  ('c-art-201', 'prog-visual-arts', 'ART 201', 'Visual Communication', 3, 2),
  ('c8', 'prog-visual-arts', 'ART 150', 'Design Studio I', 4, 3),
  ('c-eco-110', 'prog-economics', 'ECO 101', 'Principles of Economics', 3, 1),
  ('c-eco-201', 'prog-economics', 'ECO 201', 'Macroeconomic Theory', 3, 2),
  ('c9', 'prog-economics', 'ECO 160', 'Microeconomic Theory', 3, 3);

insert into course_offerings (id, course_id, academic_year_id, term_id, instructor_id) values
  ('off-c1-2025/26', 'c1', '2025/26', 'term-2025-spring', 'p-tomas-oyelaran'),
  ('off-c2-2025/26', 'c2', '2025/26', 'term-2025-spring', 'p-yasser-mansour'),
  ('off-c3-2025/26', 'c3', '2025/26', 'term-2025-spring', 'p-hana-elmasry'),
  ('off-c4-2025/26', 'c4', '2025/26', 'term-2025-spring', 'p-yasmin-adel'),
  ('off-c5-2025/26', 'c5', '2025/26', 'term-2025-spring', 'p-walid-naguib'),
  ('off-c6-2025/26', 'c6', '2025/26', 'term-2025-spring', 'p-amira-saleh'),
  ('off-c7-2025/26', 'c7', '2025/26', 'term-2025-spring', 'p-nabil-youssef'),
  ('off-c8-2025/26', 'c8', '2025/26', 'term-2025-spring', 'p-lina-haddad'),
  ('off-c9-2025/26', 'c9', '2025/26', 'term-2025-spring', 'p-nour-elsayed'),
  ('off-c10-2025/26', 'c10', '2025/26', 'term-2025-spring', 'p-mai-khalil'),
  ('off-c11-2025/26', 'c11', '2025/26', 'term-2025-spring', 'p-tarek-fouad');

insert into course_sections (id, offering_id, code) values
  ('sec-c1-A', 'off-c1-2025/26', 'A'),
  ('sec-c1-B', 'off-c1-2025/26', 'B'),
  ('sec-c1-C', 'off-c1-2025/26', 'C'),
  ('sec-c2-A', 'off-c2-2025/26', 'A'),
  ('sec-c2-B', 'off-c2-2025/26', 'B'),
  ('sec-c3-A', 'off-c3-2025/26', 'A'),
  ('sec-c3-B', 'off-c3-2025/26', 'B'),
  ('sec-c4-A', 'off-c4-2025/26', 'A'),
  ('sec-c4-B', 'off-c4-2025/26', 'B'),
  ('sec-c4-C', 'off-c4-2025/26', 'C'),
  ('sec-c5-A', 'off-c5-2025/26', 'A'),
  ('sec-c5-B', 'off-c5-2025/26', 'B'),
  ('sec-c6-A', 'off-c6-2025/26', 'A'),
  ('sec-c6-B', 'off-c6-2025/26', 'B'),
  ('sec-c7-A', 'off-c7-2025/26', 'A'),
  ('sec-c7-B', 'off-c7-2025/26', 'B'),
  ('sec-c8-A', 'off-c8-2025/26', 'A'),
  ('sec-c8-B', 'off-c8-2025/26', 'B'),
  ('sec-c9-A', 'off-c9-2025/26', 'A'),
  ('sec-c9-B', 'off-c9-2025/26', 'B'),
  ('sec-c10-A', 'off-c10-2025/26', 'A'),
  ('sec-c10-B', 'off-c10-2025/26', 'B'),
  ('sec-c10-C', 'off-c10-2025/26', 'C'),
  ('sec-c11-A', 'off-c11-2025/26', 'A'),
  ('sec-c11-B', 'off-c11-2025/26', 'B'),
  ('sec-c11-C', 'off-c11-2025/26', 'C');

insert into staff_course_assignments (staff_person_id, course_id) values
  ('p-tomas-oyelaran', 'c1'),
  ('p-yasser-mansour', 'c2'),
  ('p-hana-elmasry', 'c3'),
  ('p-yasmin-adel', 'c4'),
  ('p-walid-naguib', 'c5'),
  ('p-amira-saleh', 'c6'),
  ('p-nabil-youssef', 'c7'),
  ('p-lina-haddad', 'c8'),
  ('p-nour-elsayed', 'c9'),
  ('p-mai-khalil', 'c10'),
  ('p-tarek-fouad', 'c11');

insert into exams (id, offering_id, title, scheduled_at, duration_minutes, question_count, pass_mark, status) values
  ('e1', 'off-c1-2025/26', 'Midterm I — Recursion & Trees', '2026-02-18T09:00:00+02:00', 90, 24, 60, 'closed'),
  ('e2', 'off-c1-2025/26', 'Midterm II — Graphs & Hashing', '2026-04-09T09:00:00+02:00', 90, 26, 60, 'in_progress'),
  ('e3', 'off-c2-2025/26', 'Quiz Series — Energy Balances', '2026-03-03T09:00:00+02:00', 90, 20, 60, 'closed'),
  ('e4', 'off-c2-2025/26', 'Final Assessment', '2026-06-12T09:00:00+02:00', 90, 30, 60, 'scheduled'),
  ('e5', 'off-c3-2025/26', 'Midterm — Statics', '2026-03-11T09:00:00+02:00', 90, 22, 60, 'closed'),
  ('e6', 'off-c3-2025/26', 'Design Project Exam', '2026-05-20T09:00:00+02:00', 90, 18, 60, 'closing'),
  ('e7', 'off-c4-2025/26', 'Lab Practical — Anatomy', '2026-03-25T09:00:00+02:00', 90, 22, 60, 'closed'),
  ('e8', 'off-c4-2025/26', 'Systems Exam', '2026-05-28T09:00:00+02:00', 90, 28, 60, 'in_progress'),
  ('e9', 'off-c5-2025/26', 'Oral Biology Quiz', '2026-04-02T09:00:00+02:00', 90, 16, 60, 'closed'),
  ('e10', 'off-c5-2025/26', 'Clinical Skills Exam', '2026-06-04T09:00:00+02:00', 90, 20, 60, 'closed'),
  ('e11', 'off-c6-2025/26', 'Kinesiology Practical', '2026-03-18T09:00:00+02:00', 90, 18, 60, 'closed'),
  ('e12', 'off-c6-2025/26', 'Movement Analysis Exam', '2026-05-14T09:00:00+02:00', 90, 22, 60, 'closed'),
  ('e13', 'off-c7-2025/26', 'Physiology Lab', '2026-04-08T09:00:00+02:00', 90, 20, 60, 'closed'),
  ('e14', 'off-c7-2025/26', 'Species Systems Exam', '2026-06-10T09:00:00+02:00', 90, 24, 60, 'closed'),
  ('e15', 'off-c8-2025/26', 'Studio Critique', '2026-03-21T09:00:00+02:00', 90, 14, 60, 'closed'),
  ('e16', 'off-c8-2025/26', 'Visual Culture Exam', '2026-05-16T09:00:00+02:00', 90, 16, 60, 'closed'),
  ('e17', 'off-c9-2025/26', 'Markets Quiz', '2026-04-15T09:00:00+02:00', 90, 18, 60, 'closed'),
  ('e18', 'off-c9-2025/26', 'Policy Analysis Exam', '2026-06-18T09:00:00+02:00', 90, 22, 60, 'closed'),
  ('e19', 'off-c10-2025/26', 'Midterm — Relational Model', '2026-03-12T09:00:00+02:00', 90, 22, 60, 'closed'),
  ('e20', 'off-c10-2025/26', 'Query Processing Exam', '2026-05-21T09:00:00+02:00', 90, 24, 60, 'closed'),
  ('e21', 'off-c11-2025/26', 'Processes Quiz', '2026-04-01T09:00:00+02:00', 90, 20, 60, 'closed'),
  ('e22', 'off-c11-2025/26', 'Concurrency Exam', '2026-06-02T09:00:00+02:00', 90, 26, 60, 'closed');

insert into people (id, full_name, email) values
  ('p-s1', 'Ahmed Farouk', 'ahmed.farouk.s1@stu.bnu.edu.eg'),
  ('p-s2', 'Mariam Helmy', 'mariam.helmy.s2@stu.bnu.edu.eg'),
  ('p-s3', 'Youssef Nassar', 'youssef.nassar.s3@stu.bnu.edu.eg'),
  ('p-s4', 'Dina Shawky', 'dina.shawky.s4@stu.bnu.edu.eg'),
  ('p-s5', 'Tarek Osman', 'tarek.osman.s5@stu.bnu.edu.eg'),
  ('p-s6', 'Salma Refaat', 'salma.refaat.s6@stu.bnu.edu.eg'),
  ('p-s8', 'Hassan Lotfy', 'hassan.lotfy.s8@stu.bnu.edu.eg'),
  ('p-s9', 'Noha Samir', 'noha.samir.s9@stu.bnu.edu.eg'),
  ('p-s10', 'Karim Fathy', 'karim.fathy.s10@stu.bnu.edu.eg'),
  ('p-s11', 'Aya Mostafa', 'aya.mostafa.s11@stu.bnu.edu.eg'),
  ('p-s12', 'Mahmoud Saber', 'mahmoud.saber.s12@stu.bnu.edu.eg'),
  ('p-s13', 'Reem Adel', 'reem.adel.s13@stu.bnu.edu.eg'),
  ('p-s14', 'Ziad Mansour', 'ziad.mansour.s14@stu.bnu.edu.eg'),
  ('p-s15', 'Hana Gaber', 'hana.gaber.s15@stu.bnu.edu.eg'),
  ('p-s16', 'Amr Selim', 'amr.selim.s16@stu.bnu.edu.eg'),
  ('p-s17', 'Malak Younis', 'malak.younis.s17@stu.bnu.edu.eg'),
  ('p-s7', 'Omar Haddad', 'omar.haddad.s7@stu.bnu.edu.eg'),
  ('p-s18', 'Nour El-Amin', 'nour.el-amin.s18@stu.bnu.edu.eg'),
  ('p-s19', 'Yusuf Karim', 'yusuf.karim.s19@stu.bnu.edu.eg'),
  ('p-s20', 'Fatma Hassan', 'fatma.hassan.s20@stu.bnu.edu.eg'),
  ('p-s21', 'Ali Bakr', 'ali.bakr.s21@stu.bnu.edu.eg'),
  ('p-s22', 'Sara Ibrahim', 'sara.ibrahim.s22@stu.bnu.edu.eg'),
  ('p-s23', 'Mostafa Galal', 'mostafa.galal.s23@stu.bnu.edu.eg'),
  ('p-s24', 'Laila Osman', 'laila.osman.s24@stu.bnu.edu.eg'),
  ('p-s25', 'Ibrahim Shawky', 'ibrahim.shawky.s25@stu.bnu.edu.eg'),
  ('p-s26', 'Yasmin Fouad', 'yasmin.fouad.s26@stu.bnu.edu.eg'),
  ('p-s27', 'Khaled Naguib', 'khaled.naguib.s27@stu.bnu.edu.eg'),
  ('p-s28', 'Farida Amin', 'farida.amin.s28@stu.bnu.edu.eg'),
  ('p-s29', 'Hossam Ezzat', 'hossam.ezzat.s29@stu.bnu.edu.eg'),
  ('p-s30', 'Nadine Kamal', 'nadine.kamal.s30@stu.bnu.edu.eg'),
  ('p-s31', 'Sherif Tawfik', 'sherif.tawfik.s31@stu.bnu.edu.eg'),
  ('p-s32', 'Mona Rashad', 'mona.rashad.s32@stu.bnu.edu.eg'),
  ('p-s33', 'Adel Hamdy', 'adel.hamdy.s33@stu.bnu.edu.eg'),
  ('p-s34', 'Rania Fouda', 'rania.fouda.s34@stu.bnu.edu.eg'),
  ('p-s35', 'Bassem Lotfi', 'bassem.lotfi.s35@stu.bnu.edu.eg'),
  ('p-s36', 'Dalia Naguib', 'dalia.naguib.s36@stu.bnu.edu.eg'),
  ('p-s37', 'Wael Sorour', 'wael.sorour.s37@stu.bnu.edu.eg'),
  ('p-s38', 'Heba Khalil', 'heba.khalil.s38@stu.bnu.edu.eg'),
  ('p-s39', 'Sherine Awad', 'sherine.awad.s39@stu.bnu.edu.eg'),
  ('p-s40', 'Tamer Ghanem', 'tamer.ghanem.s40@stu.bnu.edu.eg'),
  ('p-s41', 'Mina Aziz', 'mina.aziz.s41@stu.bnu.edu.eg'),
  ('p-s42', 'Nermine Saad', 'nermine.saad.s42@stu.bnu.edu.eg'),
  ('p-s43', 'Fady Wahba', 'fady.wahba.s43@stu.bnu.edu.eg'),
  ('p-s44', 'Christine Nabil', 'christine.nabil.s44@stu.bnu.edu.eg'),
  ('p-s45', 'Rami Shenouda', 'rami.shenouda.s45@stu.bnu.edu.eg'),
  ('p-s46', 'Marina Fawzy', 'marina.fawzy.s46@stu.bnu.edu.eg'),
  ('p-s47', 'George Hanna', 'george.hanna.s47@stu.bnu.edu.eg'),
  ('p-s48', 'Yara Mounir', 'yara.mounir.s48@stu.bnu.edu.eg'),
  ('p-s49', 'Menna Tallah', 'menna.tallah.s49@stu.bnu.edu.eg'),
  ('p-s50', 'Omar Sami', 'omar.sami.s50@stu.bnu.edu.eg'),
  ('p-s51', 'Jana Hatem', 'jana.hatem.s51@stu.bnu.edu.eg'),
  ('p-s52', 'Seif Eldin', 'seif.eldin.s52@stu.bnu.edu.eg'),
  ('p-s53', 'Farah Magdy', 'farah.magdy.s53@stu.bnu.edu.eg'),
  ('p-s54', 'Adam Youssef', 'adam.youssef.s54@stu.bnu.edu.eg'),
  ('p-s55', 'Lina Fouad', 'lina.fouad.s55@stu.bnu.edu.eg'),
  ('p-s56', 'Yassin Helal', 'yassin.helal.s56@stu.bnu.edu.eg'),
  ('p-s57', 'Amina Lotfy', 'amina.lotfy.s57@stu.bnu.edu.eg'),
  ('p-s58', 'Hany Darwish', 'hany.darwish.s58@stu.bnu.edu.eg'),
  ('p-s59', 'Salma Gad', 'salma.gad.s59@stu.bnu.edu.eg'),
  ('p-s60', 'Nader Fahmy', 'nader.fahmy.s60@stu.bnu.edu.eg'),
  ('p-s61', 'Esraa Hegazy', 'esraa.hegazy.s61@stu.bnu.edu.eg'),
  ('p-s62', 'Kareem Anwar', 'kareem.anwar.s62@stu.bnu.edu.eg'),
  ('p-s63', 'Basmala Taha', 'basmala.taha.s63@stu.bnu.edu.eg'),
  ('p-s64', 'Sherif Moussa', 'sherif.moussa.s64@stu.bnu.edu.eg'),
  ('p-s65', 'Nada Sherif', 'nada.sherif.s65@stu.bnu.edu.eg'),
  ('p-s66', 'Youssef Kamal', 'youssef.kamal.s66@stu.bnu.edu.eg'),
  ('p-s67', 'Malak Fouad', 'malak.fouad.s67@stu.bnu.edu.eg'),
  ('p-s68', 'Hassan Zaki', 'hassan.zaki.s68@stu.bnu.edu.eg'),
  ('p-s69', 'Farida Lotfi', 'farida.lotfi.s69@stu.bnu.edu.eg'),
  ('p-s70', 'Adam Nassar', 'adam.nassar.s70@stu.bnu.edu.eg'),
  ('p-s71', 'Hana Samy', 'hana.samy.s71@stu.bnu.edu.eg'),
  ('p-s72', 'Zein Ashraf', 'zein.ashraf.s72@stu.bnu.edu.eg'),
  ('p-s73', 'Omar Helmy', 'omar.helmy.s73@stu.bnu.edu.eg'),
  ('p-s74', 'Salma Naguib', 'salma.naguib.s74@stu.bnu.edu.eg'),
  ('p-s75', 'Karim Shawky', 'karim.shawky.s75@stu.bnu.edu.eg'),
  ('p-s76', 'Nourhan Adel', 'nourhan.adel.s76@stu.bnu.edu.eg'),
  ('p-s77', 'Ahmed Yassin', 'ahmed.yassin.s77@stu.bnu.edu.eg'),
  ('p-s78', 'Maya Fawzy', 'maya.fawzy.s78@stu.bnu.edu.eg'),
  ('p-s79', 'Tarek Amin', 'tarek.amin.s79@stu.bnu.edu.eg'),
  ('p-s80', 'Dina Lotfy', 'dina.lotfy.s80@stu.bnu.edu.eg');

insert into students (id, person_id, student_number, program_id, section, cohort_year, status) values
  ('s1', 'p-s1', 'BNU-ENG-24-001', 'prog-engineering', 'A', 2023, 'active'),
  ('s2', 'p-s2', 'BNU-ENG-24-002', 'prog-engineering', 'B', 2023, 'active'),
  ('s3', 'p-s3', 'BNU-ENG-24-003', 'prog-engineering', 'A', 2023, 'active'),
  ('s4', 'p-s4', 'BNU-ENG-24-004', 'prog-engineering', 'B', 2023, 'active'),
  ('s5', 'p-s5', 'BNU-ENG-24-005', 'prog-engineering', 'A', 2023, 'active'),
  ('s6', 'p-s6', 'BNU-ENG-24-006', 'prog-engineering', 'B', 2023, 'active'),
  ('s8', 'p-s8', 'BNU-ENG-24-007', 'prog-engineering', 'A', 2023, 'active'),
  ('s9', 'p-s9', 'BNU-ENG-24-008', 'prog-engineering', 'B', 2023, 'active'),
  ('s10', 'p-s10', 'BNU-ENE-24-001', 'prog-energy-sciences', 'A', 2023, 'active'),
  ('s11', 'p-s11', 'BNU-ENE-24-002', 'prog-energy-sciences', 'B', 2023, 'active'),
  ('s12', 'p-s12', 'BNU-ENE-24-003', 'prog-energy-sciences', 'A', 2023, 'active'),
  ('s13', 'p-s13', 'BNU-ENE-24-004', 'prog-energy-sciences', 'B', 2023, 'active'),
  ('s14', 'p-s14', 'BNU-ENE-24-005', 'prog-energy-sciences', 'A', 2023, 'active'),
  ('s15', 'p-s15', 'BNU-ENE-24-006', 'prog-energy-sciences', 'B', 2023, 'active'),
  ('s16', 'p-s16', 'BNU-ENE-24-007', 'prog-energy-sciences', 'A', 2023, 'active'),
  ('s17', 'p-s17', 'BNU-ENE-24-008', 'prog-energy-sciences', 'B', 2023, 'active'),
  ('s7', 'p-s7', 'BNU-CS-24-001', 'prog-computer-science', 'A', 2023, 'active'),
  ('s18', 'p-s18', 'BNU-CS-24-002', 'prog-computer-science', 'B', 2023, 'active'),
  ('s19', 'p-s19', 'BNU-CS-24-003', 'prog-computer-science', 'C', 2023, 'active'),
  ('s20', 'p-s20', 'BNU-CS-24-004', 'prog-computer-science', 'A', 2023, 'active'),
  ('s21', 'p-s21', 'BNU-CS-24-005', 'prog-computer-science', 'B', 2023, 'active'),
  ('s22', 'p-s22', 'BNU-CS-24-006', 'prog-computer-science', 'C', 2023, 'active'),
  ('s23', 'p-s23', 'BNU-CS-24-007', 'prog-computer-science', 'A', 2023, 'active'),
  ('s24', 'p-s24', 'BNU-CS-24-008', 'prog-computer-science', 'B', 2023, 'active'),
  ('s25', 'p-s25', 'BNU-CS-24-009', 'prog-computer-science', 'C', 2023, 'active'),
  ('s26', 'p-s26', 'BNU-CS-24-010', 'prog-computer-science', 'A', 2023, 'active'),
  ('s27', 'p-s27', 'BNU-CS-24-011', 'prog-computer-science', 'B', 2023, 'active'),
  ('s28', 'p-s28', 'BNU-CS-24-012', 'prog-computer-science', 'C', 2023, 'active'),
  ('s29', 'p-s29', 'BNU-MED-24-001', 'prog-medicine', 'A', 2023, 'active'),
  ('s30', 'p-s30', 'BNU-MED-24-002', 'prog-medicine', 'B', 2023, 'active'),
  ('s31', 'p-s31', 'BNU-MED-24-003', 'prog-medicine', 'C', 2023, 'active'),
  ('s32', 'p-s32', 'BNU-MED-24-004', 'prog-medicine', 'A', 2023, 'active'),
  ('s33', 'p-s33', 'BNU-MED-24-005', 'prog-medicine', 'B', 2023, 'active'),
  ('s34', 'p-s34', 'BNU-MED-24-006', 'prog-medicine', 'C', 2023, 'active'),
  ('s35', 'p-s35', 'BNU-MED-24-007', 'prog-medicine', 'A', 2023, 'active'),
  ('s36', 'p-s36', 'BNU-MED-24-008', 'prog-medicine', 'B', 2023, 'active'),
  ('s37', 'p-s37', 'BNU-MED-24-009', 'prog-medicine', 'C', 2023, 'active'),
  ('s38', 'p-s38', 'BNU-MED-24-010', 'prog-medicine', 'A', 2023, 'active'),
  ('s39', 'p-s39', 'BNU-MED-24-011', 'prog-medicine', 'B', 2023, 'active'),
  ('s40', 'p-s40', 'BNU-MED-24-012', 'prog-medicine', 'C', 2023, 'active'),
  ('s41', 'p-s41', 'BNU-DEN-24-001', 'prog-dentistry', 'A', 2023, 'active'),
  ('s42', 'p-s42', 'BNU-DEN-24-002', 'prog-dentistry', 'B', 2023, 'active'),
  ('s43', 'p-s43', 'BNU-DEN-24-003', 'prog-dentistry', 'A', 2023, 'active'),
  ('s44', 'p-s44', 'BNU-DEN-24-004', 'prog-dentistry', 'B', 2023, 'active'),
  ('s45', 'p-s45', 'BNU-DEN-24-005', 'prog-dentistry', 'A', 2023, 'active'),
  ('s46', 'p-s46', 'BNU-DEN-24-006', 'prog-dentistry', 'B', 2023, 'active'),
  ('s47', 'p-s47', 'BNU-DEN-24-007', 'prog-dentistry', 'A', 2023, 'active'),
  ('s48', 'p-s48', 'BNU-DEN-24-008', 'prog-dentistry', 'B', 2023, 'active'),
  ('s49', 'p-s49', 'BNU-PT-24-001', 'prog-physical-therapy', 'A', 2023, 'active'),
  ('s50', 'p-s50', 'BNU-PT-24-002', 'prog-physical-therapy', 'B', 2023, 'active'),
  ('s51', 'p-s51', 'BNU-PT-24-003', 'prog-physical-therapy', 'A', 2023, 'active'),
  ('s52', 'p-s52', 'BNU-PT-24-004', 'prog-physical-therapy', 'B', 2023, 'active'),
  ('s53', 'p-s53', 'BNU-PT-24-005', 'prog-physical-therapy', 'A', 2023, 'active'),
  ('s54', 'p-s54', 'BNU-PT-24-006', 'prog-physical-therapy', 'B', 2023, 'active'),
  ('s55', 'p-s55', 'BNU-PT-24-007', 'prog-physical-therapy', 'A', 2023, 'active'),
  ('s56', 'p-s56', 'BNU-PT-24-008', 'prog-physical-therapy', 'B', 2023, 'active'),
  ('s57', 'p-s57', 'BNU-VET-24-001', 'prog-veterinary', 'A', 2023, 'active'),
  ('s58', 'p-s58', 'BNU-VET-24-002', 'prog-veterinary', 'B', 2023, 'active'),
  ('s59', 'p-s59', 'BNU-VET-24-003', 'prog-veterinary', 'A', 2023, 'active'),
  ('s60', 'p-s60', 'BNU-VET-24-004', 'prog-veterinary', 'B', 2023, 'active'),
  ('s61', 'p-s61', 'BNU-VET-24-005', 'prog-veterinary', 'A', 2023, 'active'),
  ('s62', 'p-s62', 'BNU-VET-24-006', 'prog-veterinary', 'B', 2023, 'active'),
  ('s63', 'p-s63', 'BNU-VET-24-007', 'prog-veterinary', 'A', 2023, 'active'),
  ('s64', 'p-s64', 'BNU-VET-24-008', 'prog-veterinary', 'B', 2023, 'active'),
  ('s65', 'p-s65', 'BNU-ART-24-001', 'prog-visual-arts', 'A', 2023, 'active'),
  ('s66', 'p-s66', 'BNU-ART-24-002', 'prog-visual-arts', 'B', 2023, 'active'),
  ('s67', 'p-s67', 'BNU-ART-24-003', 'prog-visual-arts', 'A', 2023, 'active'),
  ('s68', 'p-s68', 'BNU-ART-24-004', 'prog-visual-arts', 'B', 2023, 'active'),
  ('s69', 'p-s69', 'BNU-ART-24-005', 'prog-visual-arts', 'A', 2023, 'active'),
  ('s70', 'p-s70', 'BNU-ART-24-006', 'prog-visual-arts', 'B', 2023, 'active'),
  ('s71', 'p-s71', 'BNU-ART-24-007', 'prog-visual-arts', 'A', 2023, 'active'),
  ('s72', 'p-s72', 'BNU-ART-24-008', 'prog-visual-arts', 'B', 2023, 'active'),
  ('s73', 'p-s73', 'BNU-ECO-24-001', 'prog-economics', 'A', 2023, 'active'),
  ('s74', 'p-s74', 'BNU-ECO-24-002', 'prog-economics', 'B', 2023, 'active'),
  ('s75', 'p-s75', 'BNU-ECO-24-003', 'prog-economics', 'A', 2023, 'active'),
  ('s76', 'p-s76', 'BNU-ECO-24-004', 'prog-economics', 'B', 2023, 'active'),
  ('s77', 'p-s77', 'BNU-ECO-24-005', 'prog-economics', 'A', 2023, 'active'),
  ('s78', 'p-s78', 'BNU-ECO-24-006', 'prog-economics', 'B', 2023, 'active'),
  ('s79', 'p-s79', 'BNU-ECO-24-007', 'prog-economics', 'A', 2023, 'active'),
  ('s80', 'p-s80', 'BNU-ECO-24-008', 'prog-economics', 'B', 2023, 'active');

insert into enrollments (id, student_id, offering_id, section_id)
select
  'enr-' || st.id || '-' || c.id,
  st.id,
  o.id,
  coalesce(cs_match.id, cs_any.id)
from students st
join courses c on c.program_id = st.program_id and c.year_level = 3
join course_offerings o on o.course_id = c.id
left join course_sections cs_match
  on cs_match.offering_id = o.id and cs_match.code = st.section
join lateral (
  select id from course_sections s where s.offering_id = o.id order by code limit 1
) cs_any on true;

insert into user_accounts (id, person_id, role, scope_id, student_id, is_demo) values
  ('u-president', 'p-priya-raman', 'senior_management', 'uni-bnu', null, true),
  ('u-vp-aa', 'p-karim-fawzy', 'senior_management', 'uni-bnu', null, true),
  ('u-dean-eng', 'p-hana-elmasry', 'senior_management', 'sec-engineering', null, true),
  ('u-pd-cs', 'p-daniel-osei', 'program_director', 'prog-computer-science', null, true),
  ('u-aa-cs', 'p-sara-mansour', 'academic_affairs', 'prog-computer-science', null, true),
  ('u-prof-cs', 'p-tomas-oyelaran', 'professor', 'prog-computer-science', null, true),
  ('u-it-integrity', 'p-layla-nasser', 'it_academic_integrity', null, null, true),
  -- Seed login is Omar Haddad (s7). Migration 011 remaps u-student onto an
  -- imported Computer Science roster student when that roster is present.
  ('u-student', 'p-s7', 'student', 'prog-computer-science', 's7', true);


-- Question stems by program
insert into questions (id, exam_id, number, topic, prompt, max_score)
select
  x.id || '-q' || gs,
  x.id,
  gs,
  bank.topic,
  bank.prompt,
  1
from exams x
join course_offerings o on o.id = x.offering_id
join courses c on c.id = o.course_id
cross join lateral generate_series(1, least(12, x.question_count)) as gs
join lateral (
  select
    (array[
      case c.program_id
        when 'prog-engineering' then 'Statics'
        when 'prog-energy-sciences' then 'Energy balances'
        when 'prog-computer-science' then 'Recursion'
        when 'prog-medicine' then 'Anatomy'
        when 'prog-dentistry' then 'Oral biology'
        when 'prog-physical-therapy' then 'Kinesiology'
        when 'prog-veterinary' then 'Animal physiology'
        when 'prog-visual-arts' then 'Composition'
        else 'Demand'
      end,
      case c.program_id
        when 'prog-engineering' then 'Beams'
        when 'prog-energy-sciences' then 'Cycles'
        when 'prog-computer-science' then 'Graph Traversal'
        when 'prog-medicine' then 'Physiology'
        when 'prog-dentistry' then 'Caries'
        when 'prog-physical-therapy' then 'Gait'
        when 'prog-veterinary' then 'Species anatomy'
        when 'prog-visual-arts' then 'Colour theory'
        else 'Elasticity'
      end
    ])[((gs - 1) % 2) + 1] as topic,
    (array[
      'Identify the correct answer for this item.',
      'Which statement is most accurate given the stem below?'
    ])[((gs - 1) % 2) + 1] as prompt
) bank on true;


-- Roster attempts: one row per enrollment × exam. Scores are deterministic hashes.
insert into exam_attempts (
  id, exam_id, student_id, enrollment_id, score, time_taken_min,
  started_at, ended_at, ip, device, attempt_count, late_start, status
)
select
  'att-' || x.id || '-' || e.student_id,
  x.id,
  e.student_id,
  e.id,
  case when h.h1 > 0.06 then round((18 + (h.h2 * 82))::numeric, 0) else null end,
  case when h.h1 > 0.06 then (14 + floor(h.h3 * 81))::int else null end,
  case when h.h1 > 0.06 then x.scheduled_at + make_interval(mins => floor(h.h4 * 90)::int) else null end,
  case when h.h1 > 0.06 then x.scheduled_at + make_interval(mins => floor(h.h4 * 90)::int) + make_interval(mins => (14 + floor(h.h3 * 81))::int) else null end,
  case when h.h1 > 0.06 then ('10.24.12.' || (abs(hashtext(e.student_id)) % 240))::inet else null end,
  case when h.h1 > 0.06 then (array['MacBook Pro · Chrome 131','Windows 11 · Edge 130','iPad Air · Safari 18'])[1 + (abs(hashtext(e.student_id || x.id)) % 3)] else null end,
  case when h.h5 > 0.94 then 3 when h.h5 > 0.88 then 2 else 1 end,
  h.h6 > 0.92,
  case
    when h.h1 <= 0.06 then 'absent'::attempt_status
    when x.status in ('in_progress','closing') and (abs(hashtext(e.student_id)) % 4) = 0 then 'in_progress'::attempt_status
    else 'submitted'::attempt_status
  end
from enrollments e
join course_offerings o on o.id = e.offering_id
join exams x on x.offering_id = o.id
cross join lateral (
  select
    abs(hashtext(e.id || x.id || 'p'))::numeric / 2147483647.0 as h1,
    abs(hashtext(e.id || x.id || 's'))::numeric / 2147483647.0 as h2,
    abs(hashtext(e.id || x.id || 't'))::numeric / 2147483647.0 as h3,
    abs(hashtext(e.id || x.id || 'u'))::numeric / 2147483647.0 as h4,
    abs(hashtext(e.id || x.id || 'a'))::numeric / 2147483647.0 as h5,
    abs(hashtext(e.id || x.id || 'l'))::numeric / 2147483647.0 as h6
) h;

insert into integrity_flags (id, attempt_id, flag_type, detail)
select 'flg-' || a.id || '-attempts', a.id, 'multiple_attempts', a.attempt_count || ' attempts on this sitting'
from exam_attempts a where a.attempt_count > 1 and a.status <> 'absent';

insert into integrity_flags (id, attempt_id, flag_type, detail)
select 'flg-' || a.id || '-fast', a.id, 'fast_submission', 'Submitted in ' || a.time_taken_min || ' minutes'
from exam_attempts a where a.time_taken_min is not null and a.time_taken_min < 25 and a.status <> 'absent';

insert into integrity_flags (id, attempt_id, flag_type, detail)
select 'flg-' || a.id || '-late', a.id, 'late_start', 'Started more than 60 minutes after the scheduled open'
from exam_attempts a where a.late_start and a.status <> 'absent';


insert into transcript_entries (id, student_id, course_id, academic_year_id, average, letter_grade, credits)
select
  'tr-' || st.id || '-' || c.id || '-' || y.id,
  st.id,
  c.id,
  y.id,
  round((18 + (abs(hashtext(st.id || c.id || y.id)) % 82))::numeric, 1),
  case
    when (18 + (abs(hashtext(st.id || c.id || y.id)) % 82)) >= 90 then 'A+'
    when (18 + (abs(hashtext(st.id || c.id || y.id)) % 82)) >= 85 then 'A'
    when (18 + (abs(hashtext(st.id || c.id || y.id)) % 82)) >= 80 then 'B+'
    when (18 + (abs(hashtext(st.id || c.id || y.id)) % 82)) >= 70 then 'B'
    when (18 + (abs(hashtext(st.id || c.id || y.id)) % 82)) >= 60 then 'C'
    when (18 + (abs(hashtext(st.id || c.id || y.id)) % 82)) >= 50 then 'D'
    else 'F'
  end,
  c.credits
from students st
join academic_years y on y.is_current = false
join courses c on c.program_id = st.program_id
  and c.year_level = case y.id when '2023/24' then 1 else 2 end;

-- Catalog rows keep conservative curriculum defaults from schema.sql:
-- requirement_level_type = 'college', counted_in_cumulative_gpa = true,
-- pass_fail_subject = false. Do not invent classifications from year_level
-- or hard-code a demo course as pass/fail.

insert into attempt_answers (attempt_id, question_id, is_correct, points, is_synthetic)
select
  a.id,
  q.id,
  (abs(hashtext(a.id || q.id || 'ans')) % 100)
    >= (12 + ((q.number * 7 + abs(hashtext(a.student_id))) % 55)),
  case
    when (abs(hashtext(a.id || q.id || 'ans')) % 100)
      >= (12 + ((q.number * 7 + abs(hashtext(a.student_id))) % 55))
    then q.max_score
    else 0
  end,
  true
from exam_attempts a
join questions q on q.exam_id = a.exam_id
where a.status <> 'absent';

update exams set is_synthetic = true;
update questions set is_synthetic = true;
update exam_attempts set is_synthetic = true;
update integrity_flags set is_synthetic = true;
update transcript_entries set is_synthetic = true;

commit;
