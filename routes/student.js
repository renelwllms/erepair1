const express = require("express");
const router = express.Router();
const isAuthenticated = require("./auth");
const { getPagination } = require("./utils");
const sql = require("mssql");

router.get("/list", isAuthenticated, async function (req, res, next) {
  try {
    const request = new sql.Request();

    const current = Number(req.query.current || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const startIndex = (current - 1) * pageSize;
    const name = req.query.StudentName || "";

    request.input("name", sql.VarChar, name);
    request.input("startIndex", sql.Int, startIndex);
    request.input("pageSize", sql.Int, pageSize);

    const query = `
    SELECT COUNT(*) AS totalRows 
    FROM tblStudent 
    WHERE StudentName LIKE '%' + @name + '%';
    WITH s AS (
      SELECT * FROM tblStudent WHERE StudentName LIKE '%' + @name + '%'
    )
    SELECT s.*, sw.SchoolName, sw.Email
    FROM  s
    LEFT OUTER JOIN tblSchoolWorkplace sw ON s.SchoolNumber = sw.SchoolNumber
    ORDER BY StudentID OFFSET @startIndex ROWS FETCH NEXT @pageSize ROWS ONLY`;

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

module.exports = router;
