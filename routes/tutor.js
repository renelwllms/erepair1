const express = require("express");
const router = express.Router();
const isAuthenticated = require("./auth");
const { getPagination } = require("./utils");
const sql = require("mssql");

router.get("/list", isAuthenticated, async function (req, res, next) {
  try {
    const request = new sql.Request();

    const query = `SELECT DeliverySpecialist FROM tblDeliverySpecialist WHERE DeliverySpecialistActive = 1`;

    request.query(query, (err, result) => {
      if (err) console.log(err);
      if (result?.recordset) {
        const d = result.recordsets[0] || [];

        return res.send({
          code: 0,
          data: d.map((e) => e.DeliverySpecialist),
        });
      }
      return res.send({ code: 0, data: [] });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/student", isAuthenticated, async function (req, res, next) {
  try {
    const request = new sql.Request();

    const current = Number(req.query.current || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const startIndex = (current - 1) * pageSize;
    const name = req.query.StudentName || "";
    const SchoolName = req.query.SchoolName || "";

    request.input("name", sql.VarChar, name);
    request.input("SchoolName", sql.VarChar, SchoolName);
    request.input("startIndex", sql.Int, startIndex);
    request.input("pageSize", sql.Int, pageSize);
    if (req?.info?.givenName !== "admin") {
      request.input(
        "DeliverySpecialist",
        sql.VarChar,
        req?.info?.displayName
      );
    }

    const query = `
    SELECT s.*, sw.SchoolName, sw.Email
    INTO #TempStudent
    FROM tblStudent s
    LEFT OUTER JOIN tblSchoolWorkplace sw ON s.SchoolNumber = sw.SchoolNumber
    WHERE s.StudentName LIKE '%' + @name + '%' 
    AND sw.SchoolName LIKE '%' + @SchoolName + '%'

    SELECT COUNT(*) AS totalRows FROM #TempStudent;
    SELECT * FROM #TempStudent
    ORDER BY StudentID 
    OFFSET @startIndex ROWS
    FETCH NEXT @pageSize ROWS ONLY;
    DROP TABLE #TempStudent;`;

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

router.get("/course/student", isAuthenticated, async function (req, res, next) {
  try {
    const request = new sql.Request();
    const CourseID = Number(req.query.CourseID);
    const UnitStandardID = Number(req.query.UnitStandardID);
    const DeliverySpecialist = req.query.DeliverySpecialist || "";
    const CourseDate = req.query.CourseDate || "";
    if (!CourseID || !UnitStandardID || !DeliverySpecialist) {
      return res.send({ code: 0, data: [] });
    }
    request.input("CourseID", sql.Int, CourseID);
    request.input("UnitStandardID", sql.Int, UnitStandardID);
    request.input("DeliverySpecialist", sql.VarChar, DeliverySpecialist);
    request.input("CourseDate", sql.VarChar, CourseDate);
    const query = `
    WITH CTE AS (
      SELECT DISTINCT sc.StudentID,sc.CourseDate
      FROM tblStudentCourse sc
      RIGHT OUTER JOIN tblStudentCourseUnitStandard scu ON scu.StudentCourseID = sc.StudentCourseID
      WHERE sc.DeliverySpecialist = @DeliverySpecialist
        AND sc.CourseID = @CourseID
        AND sc.CourseDate LIKE '%' + @CourseDate + '%' 
        AND scu.UnitStandardID = @UnitStandardID
   

  )
  SELECT s.*, cte.CourseDate
  FROM CTE cte
  LEFT JOIN tblStudent s ON cte.StudentID = s.StudentID;`;

    request.query(query, (err, result) => {
      if (err) console.log(err);
      if (result?.recordset) {
        const d = result.recordsets[0];

        return res.send({
          code: 0,
          data: d,
        });
      }
      return res.send({ code: 0, data: [] });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
