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

module.exports = router;
