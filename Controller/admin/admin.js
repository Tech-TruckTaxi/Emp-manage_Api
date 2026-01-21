const routes = require("../employee/employee");
const Dbaccess = require("../../Model/dbaccess");
const validation = require("../validation");

// Leave Action (Approve/Reject)
routes.post("/addleaveAction", Dbaccess.authenticateToken, async (req, res) => {
  try {
    const params = {
      leaveId: req.body.leaveId,
      action: req.body.action,
    };
    const leaveId = params.leaveId;
    const action = params.action;

    const reqDataValidateResp = await validation.ValidateRequestData(params);
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }
    // Find leave record
    const leaveArr = await Dbaccess.getdata(
      "EmpLeave",
      { leaveId: Number(leaveId) },
      {},
      {}
    );

    if (leaveArr.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Leave request not found",
      });
    }

    // Update status
    const updatedStatus = action === "approve" ? "approved" : "rejected";

    await Dbaccess.updateone(
      "EmpLeave",
      { status: updatedStatus, updatedAt: new Date() },
      { leaveId: Number(leaveId) }
    );

    return res.status(200).json({
      status: 200,
      message:
        updatedStatus === "approved"
          ? "Leave approved successfully"
          : "Leave rejected successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

//Permission Action (Approve/Reject)
routes.post("/addpermAction", Dbaccess.authenticateToken, async (req, res) => {
  try {
    const params = {
      permId: req.body.permId,
      action: req.body.action,
    };
    const permId = params.permId;
    const action = params.action;
    const reqDataValidateResp = await validation.ValidateRequestData(params);
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }
    // Find permission record
    const permArr = await Dbaccess.getdata(
      "EmpPermission",
      { permId: Number(permId) },
      {},
      {}
    );

    if (permArr.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Permission request not found",
      });
    }

    // Update status
    const updatedStatus = action === "approve" ? "approved" : "rejected";

    await Dbaccess.updateone(
      "EmpPermission",
      { status: updatedStatus, updatedAt: new Date() },
      { permId: Number(permId) }
    );

    if (permArr.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Permission request not found",
      });
    }

    return res.status(200).json({
      status: 200,
      message:
        updatedStatus === "approved"
          ? "Permission approved successfully"
          : "Permission rejected successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

// Daily Report
routes.get("/getdailyreport", Dbaccess.authenticateToken, async (req, res) => {
  try {
    // Date range (once)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const nextDay = new Date(startOfDay);
    nextDay.setDate(startOfDay.getDate() + 1);

    // Run ALL independent queries in parallel
    const [
      totalEmployees,
      presentToday,
      pendLeaveReq,
      pendPermReq,
      leaveRequests,
      permRequests,
    ] = await Promise.all([
      Dbaccess.getdatacount("login", {}),

      Dbaccess.getdatacount("EmpAttendance", {
        LoginTime: { $gte: startOfDay, $lt: nextDay },
        isPresent: true,
      }),

      Dbaccess.getdatacount("EmpLeave", { status: "pending" }),

      Dbaccess.getdatacount("EmpPermission", { status: "pending" }),

      Dbaccess.getdata("EmpLeave", { status: "pending" }),

      Dbaccess.getdata("EmpPermission", { status: "pending" }),
    ]);

    return res.json({
      status: 200,
      message: "Record Found",
      summary: {
        totalEmployees,
        presentToday,
        pendLeaveReq,
        pendPermReq,
      },
      leaveRequests,
      permRequests,
    });
  } catch (error) {
    console.error("Daily Report Error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

//Monthly Report
routes.get(
  "/getmonthlyreport",
  Dbaccess.authenticateToken,
  async (req, res) => {
    try {
      const params = {
        Month: req.query.monthYear, // YYYY-MM
      };
      var reqDataValidateResp = await validation.ValidateRequestData(params);
      if (reqDataValidateResp.respCode !== 2) {
        return res.send(reqDataValidateResp);
      }
      const Month = params.Month;

      // @ts-ignore
      const [year, month] = Month.split("-").map(Number);

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      // Working days (excluding Sundays)
      let workingDays = 0;
      for (
        let d = new Date(startOfMonth);
        d <= endOfMonth;
        d.setDate(d.getDate() + 1)
      ) {
        if (d.getDay() !== 0) workingDays++;
      }

      const employees = await Dbaccess.getdata("login", {});

      const [attendanceData, leaveData, permissionData] = await Promise.all([
        Dbaccess.getdata("EmpAttendance", {
          LoginTime: { $gte: startOfMonth, $lte: endOfMonth },
        }),
        Dbaccess.getdata("EmpLeave", {
          status: "approved",
          fromDate: { $lte: endOfMonth },
          toDate: { $gte: startOfMonth },
        }),
        Dbaccess.getdata("EmpPermission", {
          status: "approved",
          date: { $gte: startOfMonth, $lte: endOfMonth },
        }),
      ]);

      const employeesReport = employees.map((emp) => {
        const present = attendanceData.filter(
          (a) => a.empId === emp.LoginID && a.isPresent
        ).length;

        const leave = leaveData.filter((l) => l.empId === emp.LoginID).length;

        const empPermissions = permissionData.filter(
          (p) => p.empId === emp.LoginID
        );

        const totalPermHours = empPermissions.reduce(
          (sum, p) => sum + (p.permHours || 0),
          0
        );

        const totalPermDays = empPermissions.length;

        const permission = `${totalPermHours} hours - ${totalPermDays} days`;

        const attendPercent = Math.round((present / workingDays) * 100);

        return {
          empName: emp.name,
          present,
          leave,
          permission,
          attendPercent,
        };
      });

      return res.json({
        status: 200,
        message: "Monthly Report Generated",
        month: Month,
        workingDays,
        employees: employeesReport,
      });
    } catch (error) {
      console.error("Monthly Report Error:", error);
      return res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  }
);

//Get Notifications
routes.get(
  "/getnotifications",
  Dbaccess.authenticateToken,
  async function (req, res) {
      let tablename = "Ems_Notifications";
      let find = { isRead: false };
      let project = {};
      let sort = { sentDate: -1 };
      let result = await Dbaccess.getdata(tablename, find, project, sort);
      if (result.length != 0) {
        var ResponseData = [];
        for (let index = 0; index < result.length; index++) {
          var obj = result[index];
          delete obj._id;
          ResponseData.push(obj);
        }
        res.status(200).json({
          status: 200,
          message: "Records found",
          data: ResponseData,
        });
      } else {
        res.status(404).json({
          status: 404,
          message: "Records Not found",
        });
      }
  }
);

//Notifications Read
routes.post("/notificationRead", Dbaccess.authenticateToken, async function (req, res) {
  try {
    const tablename = "Ems_Notifications";
    const filter = { isRead: false};

    const update = { isRead: true };
    var upResult = await Dbaccess.updatemany(tablename, { isRead: true }, {isRead: false});

    if (upResult) {
      res.status(200).json({
        status: 200,
        message: "Notifications marked as read",
      });
    } else {
      res.status(404).json({
        status: 404,
        message: "No matching notifications found",
      });
    }
  } catch (error) {
    console.error("Error in /notificationsread:", error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

module.exports = routes;
