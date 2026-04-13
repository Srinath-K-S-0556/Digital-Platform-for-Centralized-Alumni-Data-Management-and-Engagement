require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const db = require("./db");
const http = require("http");

const app = express();
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server,{cors:{origin:"*"}});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* EMAIL */
const transporter = nodemailer.createTransport({
 service:"gmail",
 auth:{
  user:process.env.EMAIL_USER,
  pass:process.env.EMAIL_PASS
 }
});

/* FILE UPLOAD */
const storage = multer.diskStorage({
 destination:(req,file,cb)=>cb(null,"uploads/"),
 filename:(req,file,cb)=>cb(null,Date.now()+"_"+file.originalname)
});

const upload = multer({storage});

/* LOGIN */

app.post("/api/login",(req,res)=>{

 const {university_id,email,password}=req.body;

 db.query(
 "SELECT * FROM users WHERE university_id=? AND email=? AND password=?",
 [university_id,email,password],
 (err,result)=>{

  if(result.length==0) return res.json({success:false});

  const user=result[0];

  db.query(
   "INSERT INTO login_logs(user_id) VALUES (?)",
   [user.id]
  );

  res.json({success:true,user});

 });

});


/* PROFILE */

app.get("/api/profile/:id",(req,res)=>{

 db.query(
 "SELECT name,university_id,email,role FROM users WHERE id=?",
 [req.params.id],
 (err,result)=>{
  res.json(result[0]);
 });

});


/* ADD EVENT */

app.post("/api/admin/add-event",(req,res)=>{

 const {title,description,event_date,admin_id}=req.body;

 db.query(
 "INSERT INTO events(title,description,event_date,created_by) VALUES (?,?,?,?)",
 [title,description,event_date,admin_id],
 ()=>res.json({message:"Event Added"})
 );

});


/* GET EVENTS */

app.get("/api/events",(req,res)=>{

 db.query("SELECT * FROM events",(err,result)=>{
  res.json(result);
 });

});


/* REGISTER EVENT */

app.post("/api/register-event",(req,res)=>{

 const {student_id,event_id}=req.body;

 db.query(
 "INSERT INTO event_registrations(student_id,event_id) VALUES (?,?)",
 [student_id,event_id],
 ()=>res.json({message:"Registered"})
 );

});


/* JOB POST */

app.post("/api/mentor/post-job",(req,res)=>{

 const {title,company,description,apply_link,mentor_id}=req.body;

 db.query(
 "INSERT INTO jobs(title,company,description,apply_link,posted_by) VALUES (?,?,?,?,?)",
 [title,company,description,apply_link,mentor_id],
 ()=>res.json({message:"Job Posted"})
 );

});


/* JOB LIST */

app.get("/api/jobs",(req,res)=>{

 db.query("SELECT * FROM jobs",(err,result)=>{
  res.json(result);
 });

});


/* RESUME UPLOAD */

app.post("/api/upload-resume",upload.single("resume"),(req,res)=>{

 const user_id=req.body.user_id;

 db.query(
 "INSERT INTO resumes(user_id,file_path) VALUES (?,?)",
 [user_id,req.file.filename],
 ()=>res.json({message:"Uploaded"})
 );

});


/* GET RESUMES */

app.get("/api/resumes",(req,res)=>{

 db.query(
 `SELECT resumes.id, resumes.file_path, users.name
  FROM resumes
  JOIN users ON users.id = resumes.user_id`,
 (err,result)=>{
   if(err) return res.json([]);
   res.json(result);
 });

});

/* MENTOR STUDENT LIST */

app.get("/api/mentor/students/:id",(req,res)=>{

 db.query(
 `SELECT DISTINCT users.name
  FROM mentor_requests
  JOIN users ON users.id = mentor_requests.student_id`,
 (err,result)=>{

  if(err) return res.json([]);

  res.json(result);

 });

});


/* MENTOR REQUESTS */
/* CREATE MENTOR REQUEST */

app.post("/api/mentor/request",(req,res)=>{

 const {student_id,mentor_id,message} = req.body;

 db.query(
 "INSERT INTO mentor_requests(student_id,mentor_id,message,status) VALUES (?,?,?,?)",
 [student_id,mentor_id,message,"Pending"],
 ()=>res.json({message:"Request saved"})
 );

});
/* GET ALL MENTOR REQUESTS (VISIBLE TO ALL MENTORS) */

app.get("/api/mentor/requests",(req,res)=>{

 db.query(
 `SELECT mentor_requests.id,
         mentor_requests.message,
         mentor_requests.status,
         users.name
  FROM mentor_requests
  JOIN users ON users.id = mentor_requests.student_id`,
 (err,result)=>{

  if(err) return res.json([]);

  res.json(result);

 });

});


/* ADMIN EVENT REGISTRATIONS */

app.get("/api/admin/event-registrations",(req,res)=>{

 db.query(
 `SELECT users.name, events.title 
  FROM event_registrations
  JOIN users ON users.id = event_registrations.student_id
  JOIN events ON events.id = event_registrations.event_id`,
 (err,result)=>res.json(result)
 );

});


/* LOGIN ANALYTICS */

app.get("/api/admin/login-stats",(req,res)=>{

 db.query(
 `SELECT DATE(login_time) as date, COUNT(*) as count
  FROM login_logs
  GROUP BY DATE(login_time)`,
 (err,result)=>res.json(result)
 );

});


/* CHAT HISTORY (24H) */

app.get("/api/chat-history",(req,res)=>{

 db.query(
 `SELECT chat_messages.message, users.name
  FROM chat_messages
  JOIN users ON users.id = chat_messages.sender_id
  WHERE created_at > NOW() - INTERVAL 1 DAY`,
 (err,result)=>res.json(result)
 );

});


/* CHATROOM */

let onlineUsers={};

io.on("connection",(socket)=>{

 /* USER ONLINE */

 socket.on("user-online",(id)=>{

  db.query(
  "SELECT name FROM users WHERE id=?",
  [id],
  (err,result)=>{

   const username=result[0].name;

   onlineUsers[username]=socket.id;

   io.emit("online-users",Object.keys(onlineUsers));

  });

 });


 /* CHAT MESSAGE */

 socket.on("chat-message",(data)=>{

  db.query(
  "SELECT name FROM users WHERE id=?",
  [data.user],
  (err,result)=>{

   const username=result[0].name;

   db.query(
   "INSERT INTO chat_messages(sender_id,message) VALUES (?,?)",
   [data.user,data.message]
   );

   io.emit("chat-message",{
    user:username,
    message:data.message
   });

  });

 });


 /* USER DISCONNECT */

 socket.on("disconnect",()=>{

  for(let user in onlineUsers){

   if(onlineUsers[user]==socket.id){

    delete onlineUsers[user];

   }

  }

  io.emit("online-users",Object.keys(onlineUsers));

 });

});


/* DELETE CHAT AFTER 24H */

setInterval(()=>{

 db.query(
 "DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL 1 DAY"
 );

},3600000);

/* ADMIN ACTIVITY */

app.get("/api/admin/activity",(req,res)=>{

 db.query(`
 SELECT
 (SELECT COUNT(*) FROM users WHERE role='student') AS students,
 (SELECT COUNT(*) FROM users WHERE role='mentor') AS mentors,
 (SELECT COUNT(*) FROM events) AS events,
 (SELECT COUNT(*) FROM jobs) AS jobs
 `,(err,result)=>{

   if(err) return res.json({});
   res.json(result[0]);

 });

});
/* DELETE EVENT */

app.delete("/api/admin/delete-event/:id",(req,res)=>{

 db.query(
 "DELETE FROM events WHERE id=?",
 [req.params.id],
 ()=>res.json({message:"Event deleted"})
 );

});
/* DELETE JOB */

app.delete("/api/mentor/delete-job/:id",(req,res)=>{

 db.query(
 "DELETE FROM jobs WHERE id=?",
 [req.params.id],
 ()=>res.json({message:"Job removed"})
 );

});
/* DELETE REQUEST */

app.delete("/api/mentor/delete-request/:id",(req,res)=>{

 db.query(
 "DELETE FROM mentor_requests WHERE id=?",
 [req.params.id],
 ()=>res.json({message:"Request deleted"})
 );

});
app.get("/api/admin/online-users",(req,res)=>{
 res.json(Object.keys(onlineUsers));
});
/* DELETE JOB POSTED BY MENTOR */

app.delete("/api/mentor/delete-job/:id",(req,res)=>{

 db.query(
 "DELETE FROM jobs WHERE id=?",
 [req.params.id],
 ()=>res.json({message:"Job deleted"})
 );

});

/* ADD DONATION */

app.post("/api/admin/add-donation", upload.single("scanner"), (req,res)=>{

 const {name,phone,description} = req.body;

 db.query(
 "INSERT INTO donations(name,phone,description,scanner_image) VALUES (?,?,?,?)",
 [name,phone,description,req.file.filename],
 ()=>res.json({message:"Donation added"})
 );

});
/* GET DONATIONS */

app.get("/api/donations",(req,res)=>{

 db.query(
 "SELECT * FROM donations ORDER BY created_at DESC",
 (err,result)=>res.json(result)
 );

});
/* DELETE DONATION */

app.delete("/api/admin/delete-donation/:id",(req,res)=>{

 db.query(
 "DELETE FROM donations WHERE id=?",
 [req.params.id],
 ()=>res.json({message:"Donation deleted"})
 );

});
/* START SERVER */

server.listen(process.env.PORT,()=>{
 console.log("Server running");
});