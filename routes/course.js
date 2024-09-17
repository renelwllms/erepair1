const express = require("express");
const router = express.Router();
const isAuthenticated = require("./auth");
const { getPool } = require("./utils");
const sql = require("mssql");

router.get("/list", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();

    let query = `
      SELECT c.*, 
        (SELECT STRING_AGG(CAST(ucs.UnitStandardID AS VARCHAR), ',') 
         FROM tblCourseUnitStandard ucs 
         WHERE ucs.CourseID = c.CourseID) AS UnitStandardIDs
      FROM tblCourse c
      WHERE 1=1`;

    const CourseName = req.query.CourseName;
    const CourseLevel = Number(req.query.CourseLevel);
    const CourseCredits = Number(req.query.CourseCredits);

    if (CourseName) {
      request.input("CourseName", sql.VarChar, CourseName);
      query += ` AND [CourseName] LIKE '%' + @CourseName + '%'`;
    }
    if (CourseLevel) {
      request.input("CourseLevel", sql.Int, CourseLevel);
      query += ` AND CourseLevel = @CourseLevel`;
    }
    if (CourseCredits) {
      request.input("CourseCredits", sql.Int, CourseCredits);
      query += ` AND CourseCredits = @CourseCredits`;
    }

    request.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.send({ code: 1, message: "Error occurred" });
      }

      if (result?.recordset) {
        const data = result.recordset.map((course) => ({
          ...course,
          UnitStandardIDs: course.UnitStandardIDs
            ? course.UnitStandardIDs.split(",").map((id) => parseInt(id))
            : [],
        }));

        return res.send({
          code: 0,
          data: data,
        });
      }

      return res.send({ code: 0, data: [] });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/unit", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();
    const id = Number(req.query.id);

    if (!id) {
      return res.send({ code: 0, data: [] });
    }
    request.input("id", sql.Int, id);
    const query = `
    WITH cus AS (
        SELECT * FROM tblCourseUnitStandard WHERE CourseID = @id
    )
    SELECT us.USName,us.UnitStandardID FROM  cus LEFT OUTER JOIN tblUnitStandard us ON cus.UnitStandardID = us.UnitStandardID`;

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

router.get("/units", isAuthenticated, async function (req, res, next) {
  try {
    const pool = await getPool();
    const request = await pool.request();

    let query = `SELECT * FROM tblUnitStandard WHERE 1=1`;

    const name = req.query.name;
    const USLevel = Number(req.query.USLevel);
    const USCredits = Number(req.query.USCredits);

    if (name) {
      request.input("name", sql.VarChar, name);
      query += `AND ([USName] LIKE '%' + @name + '%' OR [US] LIKE '%' + @name + '%')`;
    }

    if (USLevel) {
      request.input("USLevel", sql.Int, USLevel);
      query += ` AND USLevel = @USLevel`;
    }
    if (USCredits) {
      request.input("USCredits", sql.Int, USCredits);
      query += ` AND USCredits = @USCredits`;
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

router.post("/", isAuthenticated, async (req, res, next) => {
  const {
    CourseName,
    CourseDetails,
    CourseLevel,
    CourseCredits,
    CourseDelivery,
    CourseGroup,
    UnitStandardIDs,
  } = req.body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    // Insert into tblCourse
    let courseQuery = `
      INSERT INTO tblCourse (CourseName, CourseDetails, CourseLevel, CourseCredits, CourseDelivery, CourseGroup, CreateDate, CreateUser, UpdateDate, UpdateUser)
      VALUES (@CourseName, @CourseDetails, @CourseLevel, @CourseCredits, @CourseDelivery, @CourseGroup, GETDATE(), @CreateUser, GETDATE(), @CreateUser);
    `;
    request.input("CourseName", sql.VarChar, CourseName);
    request.input("CourseDetails", sql.Text, CourseDetails);
    request.input("CourseLevel", sql.Int, CourseLevel);
    request.input("CourseCredits", sql.Int, CourseCredits);
    request.input("CourseDelivery", sql.VarChar, CourseDelivery);
    request.input("CourseGroup", sql.VarChar, CourseGroup);
    request.input("CreateUser", sql.VarChar, req?.info?.displayName);

    await request.query(courseQuery);
    const courseIdResult = await request.query(
      "SELECT SCOPE_IDENTITY() AS CourseID"
    );
    const CourseID = courseIdResult.recordset[0].CourseID;

    // Insert into tblCourseUnitStandard
    if (UnitStandardIDs && UnitStandardIDs.length > 0) {
      for (const UnitStandardID of UnitStandardIDs) {
        let unitStandardQuery = `
          INSERT INTO tblCourseUnitStandard (CourseID, UnitStandardID)
          VALUES (@CourseID, @UnitStandardID);
        `;
        request.input("CourseID", sql.Int, CourseID);
        request.input("UnitStandardID", sql.Int, UnitStandardID);
        await request.query(unitStandardQuery);
      }
    }

    await transaction.commit();
    res.send({ code: 0, data: true, message: "Course created successfully" });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

router.put("/", isAuthenticated, async (req, res, next) => {
  const {
    CourseID,
    CourseName,
    CourseDetails,
    CourseLevel,
    CourseCredits,
    CourseDelivery,
    CourseGroup,
    UnitStandardIDs,
  } = req.body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    // Update tblCourse
    let updateCourseQuery = `
      UPDATE tblCourse
      SET CourseName = @CourseName, CourseDetails = @CourseDetails, CourseLevel = @CourseLevel,
          CourseCredits = @CourseCredits, CourseDelivery = @CourseDelivery, CourseGroup = @CourseGroup,
          UpdateDate = GETDATE(), UpdateUser = @UpdateUser
      WHERE CourseID = @CourseID;
    `;
    request.input("CourseID", sql.Int, CourseID);
    request.input("CourseName", sql.VarChar, CourseName);
    request.input("CourseDetails", sql.Text, CourseDetails);
    request.input("CourseLevel", sql.Int, CourseLevel);
    request.input("CourseCredits", sql.Int, CourseCredits);
    request.input("CourseDelivery", sql.VarChar, CourseDelivery);
    request.input("CourseGroup", sql.VarChar, CourseGroup);
    request.input("UpdateUser", sql.VarChar, req?.info?.displayName);
    await request.query(updateCourseQuery);

    // Delete existing Unit Standards
    let deleteUnitsQuery = `DELETE FROM tblCourseUnitStandard WHERE CourseID = @CourseID;`;
    await request.query(deleteUnitsQuery);

    // Insert new Unit Standards
    if (UnitStandardIDs && UnitStandardIDs.length > 0) {
      let insertUnitsQuery = `
        INSERT INTO tblCourseUnitStandard (CourseID, UnitStandardID) 
        VALUES 
        ${UnitStandardIDs.map(
          (_, idx) => `(@CourseID, @UnitStandardID${idx})`
        ).join(", ")};
      `;
      UnitStandardIDs.forEach((UnitStandardID, idx) => {
        request.input(`UnitStandardID${idx}`, sql.Int, UnitStandardID);
      });

      await request.query(insertUnitsQuery);
    }

    await transaction.commit();
    res.send({ code: 0, data: "true", message: "Course updated successfully" });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

router.delete("/", isAuthenticated, async (req, res, next) => {
  const { CourseID } = req.body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    // Delete from tblCourseUnitStandard
    let deleteUnitsQuery = `DELETE FROM tblCourseUnitStandard WHERE CourseID = @CourseID;`;
    request.input("CourseID", sql.Int, CourseID);
    await request.query(deleteUnitsQuery);

    // Delete from tblCourse
    let deleteCourseQuery = `DELETE FROM tblCourse WHERE CourseID = @CourseID;`;
    await request.query(deleteCourseQuery);

    await transaction.commit();
    res.send({ code: 0, data: "true", message: "Course deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

router.post("/unitstandard", isAuthenticated, async (req, res, next) => {
  const {
    UnitStandardID,
    US,
    USName,
    USLevel,
    USCredits,
    USDescription,
    USClassification,
    USAvailableGrade,
    USURL,
    CreateUser,
  } = req.body;

  try {
    const pool = await getPool();
    const request = pool.request();

    if (UnitStandardID) {
      // Update existing Unit Standard
      const updateQuery = `
        UPDATE tblUnitStandard
        SET US = @US, USName = @USName, USLevel = @USLevel, USCredits = @USCredits, USDescription = @USDescription,
            USClassification = @USClassification, USAvailableGrade = @USAvailableGrade, USURL = @USURL,
            UpdateDate = GETDATE(), UpdateUser = @CreateUser
        WHERE UnitStandardID = @UnitStandardID;
      `;
      request.input("UnitStandardID", sql.Int, UnitStandardID);
    } else {
      // Insert new Unit Standard
      const insertQuery = `
        INSERT INTO tblUnitStandard (US, USName, USLevel, USCredits, USDescription, USClassification, USAvailableGrade, USURL, CreateDate, CreateUser, UpdateDate, UpdateUser)
        VALUES (@US, @USName, @USLevel, @USCredits, @USDescription, @USClassification, @USAvailableGrade, @USURL, GETDATE(), @CreateUser, GETDATE(), @CreateUser);
      `;
    }

    request.input("US", sql.VarChar, US);
    request.input("USName", sql.VarChar, USName);
    request.input("USLevel", sql.Int, USLevel);
    request.input("USCredits", sql.Int, USCredits);
    request.input("USDescription", sql.Text, USDescription);
    request.input("USClassification", sql.VarChar, USClassification);
    request.input("USAvailableGrade", sql.VarChar, USAvailableGrade);
    request.input("USURL", sql.VarChar, USURL);
    request.input("CreateUser", sql.VarChar, CreateUser);

    await request.query(UnitStandardID ? updateQuery : insertQuery);
    res.send({
      code: 0,
      message: UnitStandardID
        ? "Unit Standard updated successfully"
        : "Unit Standard created successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
