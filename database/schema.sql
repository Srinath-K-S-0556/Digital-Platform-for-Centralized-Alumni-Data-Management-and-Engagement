CREATE DATABASE alumni_enterprise;
USE alumni_enterprise;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120),
  university_id VARCHAR(50),
  email VARCHAR(120),
  role ENUM('admin','mentor','student'),
  password VARCHAR(120)
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  description TEXT,
  event_date DATE,
  created_by INT
);

CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  company VARCHAR(150),
  description TEXT,
  apply_link TEXT,
  posted_by INT
);

CREATE TABLE resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  file_path TEXT
);

CREATE TABLE mentor_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  mentor_id INT,
  message TEXT,
  status ENUM('Pending','Accepted','Rejected') DEFAULT 'Pending'
);
CREATE TABLE event_registrations (
 id INT AUTO_INCREMENT PRIMARY KEY,
 student_id INT,
 event_id INT,
 registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_logs (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT,
 login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
 id INT AUTO_INCREMENT PRIMARY KEY,
 sender_id INT,
 message TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);