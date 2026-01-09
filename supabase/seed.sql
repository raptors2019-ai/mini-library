-- Seed Data for Mini Library Management System
-- Run this AFTER creating users through Supabase Auth or use the demo users below

-- Note: To create demo users, you'll need to use Supabase Auth UI or API
-- Demo user emails for reference:
-- admin@library.demo (admin)
-- librarian@library.demo (librarian)
-- premium@library.demo (premium)
-- member1@library.demo (member)
-- member2@library.demo (member)

-- Sample Books (20 books across various genres)
INSERT INTO books (isbn, title, author, description, page_count, publish_date, genres, status) VALUES
-- Science & Technology
('9780553380163', 'A Brief History of Time', 'Stephen Hawking', 'A landmark volume in science writing by one of the great minds of our time, Stephen Hawking''s book explores such profound questions as: How did the universe begin—and what made its start possible?', 212, '1998-09-01', ARRAY['Science', 'Physics', 'Non-Fiction'], 'available'),
('9781476733524', 'The Gene: An Intimate History', 'Siddhartha Mukherjee', 'A magnificent history of the gene and a response to the defining question of the future: What becomes of being human when we learn to "read" and "write" our own genetic information?', 608, '2016-05-17', ARRAY['Science', 'Biology', 'Non-Fiction'], 'available'),

-- AI & Machine Learning
('9781492032649', 'Hands-On Machine Learning with Scikit-Learn and TensorFlow', 'Aurélien Géron', 'Through a series of recent breakthroughs, deep learning has boosted the entire field of machine learning. This practical book shows you how.', 856, '2019-10-15', ARRAY['Technology', 'Machine Learning', 'Programming'], 'available'),
('9780262035613', 'Deep Learning', 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', 'An introduction to a broad range of topics in deep learning, covering mathematical and conceptual background, deep learning techniques used in industry.', 800, '2016-11-18', ARRAY['Technology', 'Machine Learning', 'Textbook'], 'available'),
('9781328546395', 'AI Superpowers', 'Kai-Fu Lee', 'AI Superpowers introduces the main players in Chinese and American AI and explains the new world order that their contest for global technological dominance will create.', 272, '2018-09-25', ARRAY['Technology', 'Business', 'Non-Fiction'], 'available'),
('9780393635829', 'The Alignment Problem', 'Brian Christian', 'A brilliant exploration of one of the most important and pressing issues of our time: how we ensure that artificial intelligence systems are aligned with human values.', 496, '2020-10-06', ARRAY['Technology', 'AI Ethics', 'Non-Fiction'], 'available'),

-- Business & Self-Help
('9780735211292', 'Atomic Habits', 'James Clear', 'No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear reveals practical strategies that will teach you exactly how to form good habits.', 320, '2018-10-16', ARRAY['Self-Help', 'Productivity', 'Non-Fiction'], 'available'),
('9780804139298', 'Zero to One', 'Peter Thiel, Blake Masters', 'The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create. Zero to One presents at once an optimistic view of the future of progress.', 224, '2014-09-16', ARRAY['Business', 'Entrepreneurship', 'Non-Fiction'], 'available'),
('9780307887894', 'The Lean Startup', 'Eric Ries', 'Most startups fail. But many of those failures are preventable. The Lean Startup is a new approach being adopted across the globe.', 336, '2011-09-13', ARRAY['Business', 'Entrepreneurship', 'Non-Fiction'], 'available'),
('9780374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'In the international bestseller, Thinking, Fast and Slow, Daniel Kahneman takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think.', 499, '2011-10-25', ARRAY['Psychology', 'Non-Fiction', 'Science'], 'available'),

-- Fiction
('9780451524935', '1984', 'George Orwell', 'Among the seminal texts of the 20th century, Nineteen Eighty-Four is a rare work that grows more haunting as its futuristic purgatory becomes more real.', 328, '1961-01-01', ARRAY['Fiction', 'Dystopian', 'Classic'], 'available'),
('9780441172719', 'Dune', 'Frank Herbert', 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.', 896, '1990-09-01', ARRAY['Science Fiction', 'Fiction', 'Classic'], 'available'),
('9780593135204', 'Project Hail Mary', 'Andy Weir', 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish.', 496, '2021-05-04', ARRAY['Science Fiction', 'Fiction', 'Thriller'], 'available'),
('9780553418026', 'The Martian', 'Andy Weir', 'Six days ago, astronaut Mark Watney became one of the first people to walk on Mars. Now, he''s sure he''ll be the first person to die there.', 369, '2014-02-11', ARRAY['Science Fiction', 'Fiction', 'Thriller'], 'available'),

-- Non-Fiction
('9780062316110', 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 'In Sapiens, Dr. Yuval Noah Harari spans the whole of human history, from the very first humans to walk the earth to the radical breakthroughs of today.', 443, '2015-02-10', ARRAY['History', 'Non-Fiction', 'Science'], 'available'),
('9781400052189', 'The Immortal Life of Henrietta Lacks', 'Rebecca Skloot', 'Her name was Henrietta Lacks, but scientists know her as HeLa. She was a poor black tobacco farmer whose cells—taken without her knowledge in 1951—became one of the most important tools in medicine.', 381, '2010-02-02', ARRAY['Biography', 'Science', 'Non-Fiction'], 'available'),
('9780399590504', 'Educated', 'Tara Westover', 'An unforgettable memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.', 334, '2018-02-20', ARRAY['Biography', 'Memoir', 'Non-Fiction'], 'available'),

-- Additional Books
('9780735219106', 'Where the Crawdads Sing', 'Delia Owens', 'For years, rumors of the "Marsh Girl" have haunted Barkley Cove, a quiet town on the North Carolina coast.', 384, '2018-08-14', ARRAY['Fiction', 'Mystery', 'Romance'], 'available'),
('9781501110368', 'It Ends with Us', 'Colleen Hoover', 'Sometimes it is the one who loves you who hurts you the most. A brave and heartbreaking novel that digs its claws into you and doesn''t let go.', 384, '2016-08-02', ARRAY['Fiction', 'Romance', 'Contemporary'], 'available'),
('9780525559474', 'The Silent Patient', 'Alex Michaelides', 'Alicia Berenson''s life is seemingly perfect. A famous painter married to an in-demand fashion photographer, she lives in a grand house. One evening her husband Gabriel returns home late.', 336, '2019-02-05', ARRAY['Fiction', 'Thriller', 'Mystery'], 'available');

-- Note: After users are created, you can update their roles with:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@library.demo';
-- UPDATE profiles SET role = 'librarian' WHERE email = 'librarian@library.demo';
-- UPDATE profiles SET role = 'premium', checkout_limit = 5, hold_duration_days = 28 WHERE email = 'premium@library.demo';
