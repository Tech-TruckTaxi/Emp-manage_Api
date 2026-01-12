const routes = require("express").Router();
const jwt = require("jsonwebtoken");
const config = require("../../config");
const validation = require("../validation");
const Dbaccess = require("../../Model/dbaccess");

// Login
routes.post("/login", async function (req, res) {
  try {
    var params = {
      username: req.body.username,
      password: req.body.password,
    };

    var reqDataValidateResp = await validation.ValidateRequestData(params);
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }

    const result = await Dbaccess.getdata(
      "login",
      { UserName: params.username, Passwd: params.password },
      {},
      {}
    );

    if (result.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Username or Password is incorrect!",
      });
    }

    // JWT Token
    const token = jwt.sign(
      { id: result[0].LoginID, role: result[0].role },
      config.secret,
      { expiresIn: "24h" }
    );

    // ===== Today range =====
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // ===== Check today's attendance =====
    const logCheck = await Dbaccess.getdata(
      "EmpAttendance",
      {
        empId: result[0].LoginID,
        LoginTime: { $gte: startOfDay, $lte: endOfDay },
      },
      {},
      {}
    );

    // ===== Insert attendance if not exists =====
    if (logCheck.length === 0) {
      // Get last attendID
      const lastRecord = await Dbaccess.getdata(
        "EmpAttendance",
        {},
        {},
        { attendID: -1 }
      );

      const attendID = lastRecord.length > 0 ? lastRecord[0].attendID + 1 : 1;

      await Dbaccess.insertone("EmpAttendance", {
        attendID: attendID,
        empId: result[0].LoginID,
        EmployeeName: result[0].name,
        LoginTime: new Date(),
      });
    }

    res.status(200).json({
      status: 200,
      message: "Login Successfully",
      employeeid: result[0].LoginID,
      employeename: result[0].name,
      roleid: result[0].role,
      token: token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

// Logout
routes.post("/logout", Dbaccess.authenticateToken, async function (req, res) {
  try {
    var params = {
      empId: req.body.empId,
    };

    var reqDataValidateResp = await validation.ValidateRequestData(params);
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await Dbaccess.getdata(
      "EmpAttendance",
      {
        LoginID: params.empId,
        LogTime: { $gte: startOfDay, $lte: endOfDay },
      },
      {},
      {}
    );

    if (logs.length > 0 && !logs[0].LogoutTime) {
      const loginTime = new Date(logs[0].LogTime);
      const logoutTime = new Date();

      // Calculate hours (decimal)
      // @ts-ignore
      const diffMs = logoutTime - loginTime;
      const loginHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

      await Dbaccess.updateone(
        "EmpAttendance",
        {
          LogoutTime: logoutTime,
          LoginHours: Number(loginHours),
        },
        { attendID: logs[0].attendID }
      );
    }

    res.status(200).json({
      status: 200,
      message: "Logout Successfully",
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
