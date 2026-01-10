const routes = require("../user/auth");
var validation = require("../validation");
var Dbaccess = require("../../Model/dbaccess");

// Add Present
routes.post("/addPresent", Dbaccess.authenticateToken, async function (req, res) {
  try {
    const params = {
      empId: req.body.empId,
    };

    const reqDataValidateResp = await validation.ValidateRequestData(params);
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }

    // Today range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find today's attendance
    const attendance = await Dbaccess.getdata(
      "EmpAttendance",
      {
        EmpId: params.empId,
        LoginTime: { $gte: startOfDay, $lte: endOfDay },
      },
      {},
      {}
    );

    if (attendance[0].isPresent === true) {
      return res.status(200).json({
        status: 200,
        message: "Already marked present",
      });
    }

    //Update isPresent
    await Dbaccess.updateone(
      "EmpAttendance",
      { isPresent: true, presentTime: new Date() },
      { attendID: attendance[0].attendID }
    );

    res.status(200).json({
      status: 200,
      message: "Present marked successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

module.exports = routes;