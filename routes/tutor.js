const express = require("express");
const router = express.Router();
const isAuthenticated = require("./auth");
const { getPagination, getPool } = require("./utils");
const sql = require("mssql");
const { nanoid } = require("nanoid");

router.get("/list", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();

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
    const pool = await getPool();
    const request = await pool.request();
   
    const current = Number(req.query.current || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const startIndex = (current - 1) * pageSize;
    const name = req.query.name || "";
    const School = req.query.School || "";
    request.input("Tutor", sql.VarChar, req?.info?.displayName);
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
      AND s.Tutor = @Tutor 
      )
      SELECT COUNT(*) AS totalRows
      FROM FilteredStudents;

      WITH FilteredStudentsPaged AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY EnrollmentID) AS RowNum
        FROM enrollment s
        WHERE (s.FirstName LIKE '%' + @name + '%' 
        OR s.LastName LIKE '%' + @name + '%')
        AND s.School LIKE '%' + @School + '%'
        AND s.Tutor = @Tutor 
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


router.get("/course/student", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();
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

router.post("/workshop", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();
    const CourseID = Number(req.body.CourseID);
    const StudentsNum = Number(req.body.StudentsNum);
    const {
      CourseDate = "",
      SchoolName = "",
      Location = "",
      CourseName = "",
    } = req.body;
    const Tutor = req?.info?.displayName || "";

    if (!CourseID || !SchoolName || !CourseDate) {
      return res.send({ code: 1, message: "Please select" });
    }
    const Code = nanoid();
    request.input("CourseID", sql.Int, CourseID);
    request.input("StudentsNum", sql.Int, StudentsNum);
    request.input("CourseDate", sql.VarChar, CourseDate);
    request.input("Tutor", sql.VarChar, Tutor);
    request.input("SchoolName", sql.VarChar, SchoolName);
    request.input("Location", sql.VarChar, Location);
    request.input("CourseName", sql.VarChar, CourseName);
    request.input("Code", sql.VarChar, Code);

    const query = `
    DECLARE @CurrentDateTime DATETIME = GETDATE();
    INSERT INTO tblWorkshop (CourseID,CourseName,CourseDate,SchoolName,Location,Tutor,CreateDate,Code,StudentsNum)
    VALUES (@CourseID,@CourseName,@CourseDate,@SchoolName,@Location,@Tutor,@CurrentDateTime,@Code,@StudentsNum);
    `;

    request.query(query, (err) => {
      if (err) console.log(err);
      return res.send({
        code: 0,
        data: Code,
      });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/workshop", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();
    const CourseID = Number(req.query.CourseID);
    const CreateUser = req?.info?.displayName;
    let query = `
    SELECT * FROM tblWorkshop WHERE 1=1
    `;
    if (!isNaN(CourseID)) {
      request.input("CourseID", sql.Int, CourseID);
      query += ` AND CourseID = @CourseID`;
    }

    if (CreateUser || req?.info?.givenName !== "Admin") {
      request.input("CreateUser", sql.VarChar, CreateUser);
      query += ` AND Tutor = @CreateUser`;
    }

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

router.get(
  "/workshop/result",
  isAuthenticated,
  async function (req, res, next) {
    try {
      const pool = await getPool();
      const request = await pool.request();
      const Code = req.query.Code;
      request.input("Code", sql.VarChar, Code);
      let query = `
      SELECT * FROM tblWorkshopResult WHERE Code = @Code
    `;

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
  }
);

router.get("/verifyCode", async function (req, res, next) {
  try {
    const Code = req.query?.Code || "";
    if (!Code) {
      return res.send({
        code: 0,
        data: false,
      });
    }

    const pool = await getPool();
    const request = await pool.request();
    let query = `
    SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM tblWorkshop WHERE Code = @Code
    ) 
    THEN 1 
    ELSE 0 
    END AS DoesExist;
    `;
    request.input("Code", sql.VarChar, Code);

    request.query(query, (err, result) => {
      if (err) console.log(err);
      if (result?.recordset) {
        const exists = result.recordset[0].DoesExist;
        if (exists) {
          return res.send({
            code: 0,
            data: true,
          });
        }
      }
      return res.send({ code: 0, data: false });
    });
  } catch (error) {
    next(error);
  }
});

router.post("/workshop/info", async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();

    const {
      Code,
      FirstName,
      LastName,
      School,
      Gender,
      DOB,
      Email,
      Ethnicity,
      Feedback,
    } = req.body;

    if (!Code) {
      return res.send({ code: 1, message: "Code Error" });
    }

    if (!FirstName || !LastName) {
      return res.send({ code: 1, message: "Please select" });
    }

    request.input("Code", sql.VarChar, Code);
    request.input("FirstName", sql.VarChar, FirstName);
    request.input("LastName", sql.VarChar, LastName);
    request.input("School", sql.VarChar, School);
    request.input("Gender", sql.VarChar, Gender);
    request.input("DOB", sql.VarChar, DOB);
    request.input("Email", sql.VarChar, Email);
    request.input("Ethnicity", sql.VarChar, Ethnicity);
    request.input("Feedback", sql.VarChar, Feedback);

    const query = `
    DECLARE @CreateDate DATETIME = GETDATE();
    INSERT INTO tblWorkshopResult (Code,FirstName,LastName,School,Gender,DOB,Email,Ethnicity,Feedback,CreateDate)
    VALUES (@Code,@FirstName,@LastName,@School,@Gender,@DOB,@Email,@Ethnicity,@Feedback,@CreateDate);
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
