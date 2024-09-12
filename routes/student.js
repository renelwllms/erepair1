const express = require("express");
const router = express.Router();
const isAuthenticated = require("./auth");
const { getPagination, getPool } = require("./utils");
const sql = require("mssql");

router.get("/list", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();
    // if (req?.info?.givenName !== "Admin") {
    //   return res.send({ code: 403, data: [], message: "no permission" });
    // }
    const current = Number(req.query.current || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const startIndex = (current - 1) * pageSize;
    const name = req.query.name || "";
    const School = req.query.School || "";

    request.input("name", sql.VarChar, name);
    request.input("School", sql.VarChar, School);
    request.input("startIndex", sql.Int, startIndex);
    request.input("pageSize", sql.Int, pageSize);

    const query = `
    WITH FilteredStudents AS (
      SELECT *
      FROM enrollment s
      WHERE (s.FirstName LIKE '%' + @name + '%' 
      OR s.LastName LIKE '%' + @name + '%')
      AND s.School LIKE '%' + @School + '%'
      )
      SELECT COUNT(*) AS totalRows
      FROM FilteredStudents;

      WITH FilteredStudentsPaged AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY EnrollmentID) AS RowNum
        FROM enrollment s
        WHERE (s.FirstName LIKE '%' + @name + '%' 
        OR s.LastName LIKE '%' + @name + '%')
        AND s.School LIKE '%' + @School + '%'
      )
      SELECT *
      FROM FilteredStudentsPaged
      WHERE RowNum BETWEEN @startIndex + 1 AND @startIndex + @pageSize
      ORDER BY EnrollmentID;
  `;

    request.query(query, (err, result) => {
      if (err) console.log(err);
      if (result?.recordset) {
        const total = result.recordsets[0][0].totalRows;
        const currentPageData = result.recordsets[1];

        return res.send({
          code: 0,
          data: currentPageData,
          pagination: getPagination(current, pageSize, total),
        });
      }

      return res.send({ code: 0, data: [], pagination: getPagination() });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/course", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();

    const id = Number(req.query.id);

    if (!id) {
      return res.send({ code: 0, data: [] });
    }
    request.input("id", sql.Int, id);

    const query = `
    SELECT DISTINCT sc.*, 
    c.CourseName,
    scu.StudentCourseUnitStandardID,   scu.UnitStandardID, 
    us.US,	us.USName,	us.USLevel,	us.USCredits,	us.USDescription
   FROM tblStudentCourse sc
   LEFT OUTER JOIN tblCourse c ON c.CourseID = sc.CourseID
   JOIN tblStudentCourseUnitStandard scu ON sc.StudentCourseID = scu.StudentCourseID
   LEFT OUTER JOIN tblUnitStandard us ON scu.UnitStandardID = us.UnitStandardID
   WHERE sc.StudentID = @id
`;

    request.query(query, (err, result) => {
      if (err) console.log(err);
      if (result?.recordset) {
        const currentPageData = result.recordsets[0];
        return res.send({
          code: 0,
          data: currentPageData || [],
        });
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/assigned", isAuthenticated, async function (req, res, next) {
  try {
    if (req?.info?.givenName !== "Admin") {
      return res.send({ code: 403, message: "no permission" });
    }
    const pool = await getPool();
    const request = await pool.request();
    const id = Number(req.body.id);
    const tutor = req.body.tutor || "";
    if (!id || !tutor) {
      return res.send({ code: 1, message: "Please select" });
    }
    request.input("id", sql.Int, id);
    request.input("Tutor", sql.VarChar, tutor);
    const query = `
    UPDATE enrollment
    SET Tutor = @Tutor
    WHERE EnrollmentID = @id;
    `;

    request.query(query, (err) => {
      if (err) console.log(err);
      return res.send({
        code: 0,
        data: "success",
      });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
