const express = require("express");
const router = express.Router();
const isAuthenticated = require("./auth");
const { getPagination } = require("./utils");
const sql = require("mssql");

router.get("/list", isAuthenticated, async function (req, res, next) {
  try {
    const request = new sql.Request();

    const query = `SELECT * FROM tblCourse`;

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

router.get("/unit", isAuthenticated, async function (req, res, next) {
  try {
    const request = new sql.Request();
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

module.exports = router;
