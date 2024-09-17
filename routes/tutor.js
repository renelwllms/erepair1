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
        code: 1,
        data: false,
        message: "Code is required",
      });
    }

    const pool = await getPool();
    const request = new sql.Request(pool);

    // Query to check if Code exists and if the number of students has reached the limit
    const query = `
      DECLARE @MaxStudents INT;
      DECLARE @CurrentCount INT;

      -- Check if Code exists
      IF EXISTS (SELECT 1 FROM tblWorkshop WHERE Code = @Code)
      BEGIN
        -- Get the maximum allowed number of students
        SELECT @MaxStudents = StudentsNum
        FROM tblWorkshop
        WHERE Code = @Code;

        -- Count current number of students
        SELECT @CurrentCount = COUNT(*)
        FROM tblWorkshopResult
        WHERE Code = @Code;

        -- Determine if the number of students has reached the maximum allowed
        IF (@CurrentCount >= @MaxStudents)
        BEGIN
          SELECT 1 AS IsFull; -- Indicates that the workshop is full
        END
        ELSE
        BEGIN
          SELECT 0 AS IsFull; -- Indicates that there is still space available
        END
      END
      ELSE
      BEGIN
        -- Code does not exist
        SELECT -1 AS IsFull;
      END
    `;

    request.input("Code", sql.VarChar, Code);

    // Execute query
    const result = await request.query(query);

    if (result?.recordset) {
      const isFull = result.recordset[0].IsFull;

      if (isFull === 1) {
        return res.send({
          code: 0,
          data: false,
          message: "The workshop is full. No more spots available.",
        });
      } else if (isFull === -1) {
        return res.send({
          code: 0,
          data: false,
          message: "Code not found.",
        });
      } else {
        return res.send({
          code: 0,
          data: true,
          message: "The workshop is available.",
        });
      }
    }

    // Default response if no recordset found
    return res.send({
      code: 0,
      data: false,
      message: "Unexpected error occurred.",
    });
  } catch (error) {
    console.error("Error verifying workshop code:", error);
    next(error);
  }
});

router.post("/workshop/info", async function (req, res, next) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool); // Initialize transaction

  try {
    await transaction.begin(); // Begin transaction
    const request = new sql.Request(transaction);

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

    // Validate required parameters
    if (!Code) {
      throw new Error("Code is required");
    }
    if (!FirstName || !LastName) {
      throw new Error("FirstName and LastName are required");
    }

    // Bind parameters
    request.input("Code", sql.VarChar, Code);
    request.input("FirstName", sql.VarChar, FirstName);
    request.input("LastName", sql.VarChar, LastName);
    request.input("School", sql.VarChar, School);
    request.input("Gender", sql.VarChar, Gender);
    request.input("DOB", sql.VarChar, DOB);
    request.input("Email", sql.VarChar, Email);
    request.input("Ethnicity", sql.VarChar, Ethnicity);
    request.input("Feedback", sql.VarChar, Feedback);

    // Query to perform the operations and get remaining spots
    const query = `
      DECLARE @CurrentCount INT;
      DECLARE @MaxStudents INT;
      DECLARE @RemainingSpots INT;

      -- Lock the tblWorkshopResult table to prevent concurrent inserts
      SELECT @CurrentCount = COUNT(*)
      FROM tblWorkshopResult WITH (UPDLOCK, HOLDLOCK)
      WHERE Code = @Code;

      SELECT @MaxStudents = StudentsNum
      FROM tblWorkshop 
      WHERE Code = @Code;

      -- Check if the number of students exceeds the limit
      IF (@CurrentCount < @MaxStudents)
      BEGIN
        -- Insert new student record
        DECLARE @CreateDate DATETIME = GETDATE();
        INSERT INTO tblWorkshopResult (
          Code, FirstName, LastName, School, Gender, DOB, Email, Ethnicity, Feedback, CreateDate
        ) VALUES (
          @Code, @FirstName, @LastName, @School, @Gender, @DOB, @Email, @Ethnicity, @Feedback, @CreateDate
        );

        -- Calculate remaining spots
        SET @RemainingSpots = @MaxStudents - (@CurrentCount + 1);
      END
      ELSE
      BEGIN
        -- If the number of students is full, throw an error
        THROW 50001, 'The workshop has reached its maximum capacity.', 1;
      END;

      -- Select remaining spots to return in the response
      SELECT @RemainingSpots AS RemainingSpots;
    `;

    // Execute the query and insert operation
    const result = await request.query(query);

    // Commit the transaction
    await transaction.commit();

    // Return success message with remaining spots
    return res.send({
      code: 0,
      data: true,
      message: "Student has been successfully added.",
      remainingSpots: result.recordset[0].RemainingSpots, // Access the remaining spots from the query result
    });
  } catch (error) {
    try {
      // Rollback the transaction if an error occurs
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Error rolling back transaction:", rollbackError);
    }

    console.error("Error processing request:", error);

    // Handle and return error messages
    if (error.number === 50001) {
      return res.send({
        code: 0,
        data: false,
        message: error.message, // Maximum capacity reached
      });
    }
    next(error); // Handle other unknown errors
  }
});

router.post("/workshop/info", async function (req, res, next) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool); // Initialize transaction

  try {
    await transaction.begin(); // Begin transaction
    const request = new sql.Request(transaction);

    const { Code, FirstName, LastName, School, Gender, DOB, Email, Ethnicity } =
      req.body;

    // Validate required parameters
    if (!Code) {
      throw new Error("Code is required");
    }
    if (!FirstName || !LastName) {
      throw new Error("FirstName and LastName are required");
    }

    // Bind parameters
    request.input("Code", sql.VarChar, Code);
    request.input("FirstName", sql.VarChar, FirstName);
    request.input("LastName", sql.VarChar, LastName);
    request.input("School", sql.VarChar, School);
    request.input("Gender", sql.VarChar, Gender);
    request.input("DOB", sql.VarChar, DOB);
    request.input("Email", sql.VarChar, Email);
    request.input("Ethnicity", sql.VarChar, Ethnicity);

    // Query to perform the operations and get remaining spots
    const query = `
      DECLARE @CurrentCount INT;
      DECLARE @MaxStudents INT;
      DECLARE @RemainingSpots INT;

      -- Lock the tblWorkshopResult table to prevent concurrent inserts
      SELECT @CurrentCount = COUNT(*)
      FROM tblWorkshopResult WITH (UPDLOCK, HOLDLOCK)
      WHERE Code = @Code;

      SELECT @MaxStudents = StudentsNum
      FROM tblWorkshop 
      WHERE Code = @Code;

      -- Check if the number of students exceeds the limit
      IF (@CurrentCount < @MaxStudents)
      BEGIN
        -- Insert new student record
        DECLARE @CreateDate DATETIME = GETDATE();
        INSERT INTO tblWorkshopResult (
          Code, FirstName, LastName, School, Gender, DOB, Email, Ethnicity, Feedback, CreateDate
        ) VALUES (
          @Code, @FirstName, @LastName, @School, @Gender, @DOB, @Email, @Ethnicity, @Feedback, @CreateDate
        );

        -- Calculate remaining spots
        SET @RemainingSpots = @MaxStudents - (@CurrentCount + 1);
      END
      ELSE
      BEGIN
        -- If the number of students is full, throw an error
        THROW 50001, 'The workshop has reached its maximum capacity.', 1;
      END;

      -- Select remaining spots to return in the response
      SELECT @RemainingSpots AS RemainingSpots;
    `;

    // Execute the query and insert operation
    const result = await request.query(query);

    // Commit the transaction
    await transaction.commit();

    // Return success message with remaining spots
    return res.send({
      code: 0,
      data: true,
      message: "Student has been successfully added.",
      remainingSpots: result.recordset[0].RemainingSpots, // Access the remaining spots from the query result
    });
  } catch (error) {
    try {
      // Rollback the transaction if an error occurs
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Error rolling back transaction:", rollbackError);
    }

    console.error("Error processing request:", error);

    // Handle and return error messages
    if (error.number === 50001) {
      return res.send({
        code: 0,
        data: false,
        message: error.message, // Maximum capacity reached
      });
    }
    next(error); // Handle other unknown errors
  }
});

router.post(
  "/workshop/info/extra",
  isAuthenticated,
  async function (req, res, next) {
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

      const query = `
    DECLARE @CreateDate DATETIME = GETDATE();
    INSERT INTO tblWorkshopResult (Code,FirstName,LastName,School,Gender,DOB,Email,Ethnicity,CreateDate,isAdd)
    VALUES (@Code,@FirstName,@LastName,@School,@Gender,@DOB,@Email,@Ethnicity,@CreateDate,1);
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
  }
);

router.get(
  "/workshop/course-with-units",
  isAuthenticated,
  async function (req, res, next) {
    try {
      const pool = await getPool();
      const request = await pool.request();
      const Code = req.query.Code;

      if (!Code) {
        return res.send({ code: 400, message: "Missing workshop code" });
      }

      // Fetch both course and unit information in a single SQL query
      const query = `
      SELECT c.CourseID, c.CourseName, us.USName, us.UnitStandardID
      FROM tblWorkshop w
      JOIN tblCourse c ON w.CourseID = c.CourseID
      LEFT JOIN tblCourseUnitStandard cus ON c.CourseID = cus.CourseID
      LEFT JOIN tblUnitStandard us ON cus.UnitStandardID = us.UnitStandardID
      WHERE w.Code = @Code
    `;

      request.input("Code", sql.VarChar, Code);

      request.query(query, (err, result) => {
        if (err) {
          console.log(err);
          return res.send({ code: 500, message: "Error fetching data" });
        }

        if (!result.recordset.length) {
          return res.send({ code: 404, message: "No data found" });
        }

        // Get course information
        const courseData = {
          CourseID: result.recordset[0].CourseID,
          CourseName: result.recordset[0].CourseName,
        };

        // Extract unit information, filtering out records without unit data
        const units = result.recordset
          .filter((row) => row.USName) // Filter out records without unit information
          .map((row) => ({
            USName: row.USName,
            UnitStandardID: row.UnitStandardID,
          }));

        return res.send({
          code: 0,
          data: {
            course: courseData,
            units: units,
          },
        });
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/workshop/submit-result",
  isAuthenticated,
  async function (req, res, next) {
    try {
      const pool = await getPool();
      const request = await pool.request();

      // Extracting the parameters from the request body
      const { WorkshopResultID, Result } = req.body;

      // Check if both parameters are provided
      if (!WorkshopResultID || !Result) {
        return res.send({
          code: 400,
          message: "Missing WorkshopResultID or result",
        });
      }

      // Convert result object to JSON string for storage in the database
      const resultJson = JSON.stringify(Result);

      // SQL query to update the Result column in tblWorkshopResult
      const query = `
      UPDATE tblWorkshopResult
      SET Result = @Result
      WHERE WorkshopResultID = @WorkshopResultID
    `;

      request.input("WorkshopResultID", sql.Int, WorkshopResultID);
      request.input("Result", sql.VarChar(sql.MAX), resultJson);

      request.query(query, (err, result) => {
        if (err) {
          console.log(err);
          return res.send({ code: 500, message: "Error updating result" });
        }

        if (result.rowsAffected[0] === 0) {
          return res.send({ code: 404, message: "WorkshopResultID not found" });
        }

        return res.send({
          code: 0,
          data: true,
          message: "Result updated successfully",
        });
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
