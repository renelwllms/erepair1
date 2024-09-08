const express = require("express");
const cors = require("cors");

const student = require("./routes/student");
const tutor = require("./routes/tutor");
const course = require("./routes/course");
const createError = require("http-errors");

const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());


app.use("/api/student", student);
app.use("/api/tutor", tutor);
app.use("/api/course", course);
app.use(function (req, res, next) {
  next(createError(404));
});

// app.get("/search", (req, res) => {
//   const { name, level, room } = req.query;
//   let query = "SELECT * FROM Students WHERE 1=1";
//   if (name) {
//     query += ` AND ([Student ID] LIKE '%${name}%' OR [First Name] LIKE '%${name}%' OR [First Name] LIKE '%${name}%')`;
//   }
//   if (level) {
//     query += ` AND [Level] LIKE '%${level}%'`;
//   }
//   if (room && room !== "all") {
//     query += ` AND [Room] LIKE '%${room}%'`;
//   }

//   new sql.Request().query(query, (error, result) => {
//     if (error) {
//       console.error(error);
//       res.status(500).send("Internal Server Error");
//       return;
//     }

//     res.json({
//       code: 0,
//       data: result.recordset,
//     });
//   });
// });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
