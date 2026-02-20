const routes = require("../user/auth");
const validation = require("../validation");
const Dbaccess = require("../../Model/dbaccess");

// Add Present
routes.post(
  "/addPresent",
  Dbaccess.authenticateToken,
  async function (req, res) {
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
          empId: params.empId,
          LoginTime: { $gte: startOfDay, $lte: endOfDay },
        },
        {},
        {},
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
        { attendID: attendance[0].attendID },
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
  },
);

// Add Leave
routes.post("/addleave", Dbaccess.authenticateToken, async function (req, res) {
  try {
    const params = {
      empId: req.body.empId,
      empName: req.body.empName,
      leaveType: req.body.leaveType,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      reason: req.body.reason,
      //isHalfDay: req.body.isHalfDay || false,
      //fromTime: req.body.fromTime || null,
     // toTime: req.body.toTime || null,
    };

    const reqDataValidateResp = await validation.ValidateRequestData(params);
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }

    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    //  Validate date range
    if (fromDate > toDate) {
      return res.status(400).json({
        status: 400,
        message: "From date cannot be greater than To date",
      });
    }

    // Calculate number of leave days (inclusive)
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(0, 0, 0, 0);
   /*  if (params.isHalfDay) {
      const fromTime = params.fromTime;
      const toTime = params.toTime;
      if (!fromTime || !toTime) {
        return res.status(400).json({
          status: 400,
          message: "fromTime and toTime are required for half-day leave",
        });
      }
      const fromDateTime = new Date(`${params.fromDate} ${fromTime}`);
      const toDateTime = new Date(`${params.toDate} ${toTime}`);
      // @ts-ignore
      const diffMs = toDateTime - fromDateTime;
      var noOfDays = diffMs / (1000 * 60 * 60 * 24);
    } else { */
      // @ts-ignore
      const diffTime = toDate - fromDate;
      var noOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    //}
    // Generate leaveId
    const lastLeave = await Dbaccess.getdata(
      "EmpLeave",
      {},
      {},
      { leaveId: -1 },
    );

    const leaveId = lastLeave.length > 0 ? lastLeave[0].leaveId + 1 : 1;

    // Insert leave request
    const insertResp = await Dbaccess.insertone("EmpLeave", {
      leaveId: leaveId,
      empName: params.empName,
      empId: params.empId,
      leaveType: params.leaveType,
      fromDate: new Date(params.fromDate),
      toDate: new Date(params.toDate),
      //isHalfDay: params.isHalfDay,
      //fromTime: params.fromTime,
      //toTime: params.toTime,
      reason: params.reason,
      noOfDays: noOfDays,
      leaveReqTime: new Date(),
      status: "pending",
    });
    const notifiResp = await Dbaccess.insertone("Ems_Notifications", {
      empId: params.empId,
      message: `Leave request by ${params.empName} `,
      type: "Leave Request",
      sentDate: new Date(),
      isRead: false,
    });
    if(!insertResp || !notifiResp){
      return res.status(400).json({
        status: 400,
        message: "Failed to submit leave request",
      });
    }
   return res.status(200).json({
      status: 200,
      message: "Leave request submitted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

// Add Permission
routes.post(
  "/addpermission",
  Dbaccess.authenticateToken,
  async function (req, res) {
    try {
      const params = {
        empId: req.body.empId,
        empName: req.body.empName,
        date: req.body.date,
        fromTime: req.body.fromTime, // HH:mm
        toTime: req.body.toTime, // HH:mm
        reason: req.body.reason,
      };

      const reqDataValidateResp = await validation.ValidateRequestData(params);
      if (reqDataValidateResp.respCode !== 2) {
        return res.send(reqDataValidateResp);
      }

      // Validate time range
      const fromDateTime = new Date(`${params.date} ${params.fromTime}`);
      const toDateTime = new Date(`${params.date} ${params.toTime}`);

      if (fromDateTime >= toDateTime) {
        return res.status(400).json({
          status: 400,
          message: "From time must be less than To time",
        });
      }

      // Calculate permission hours
      // @ts-ignore
      const diffMs = toDateTime - fromDateTime;
      const permissionHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

      // Generate permId
      const lastPermission = await Dbaccess.getdata(
        "EmpPermission",
        {},
        {},
        { permId: -1 },
      );

      const permId =
        lastPermission.length > 0 ? lastPermission[0].permId + 1 : 1;

      // Insert permission request
      await Dbaccess.insertone("EmpPermission", {
        permId: permId,
        empName: params.empName,
        empId: params.empId,
        date: new Date(params.date),
        fromTime: params.fromTime,
        toTime: params.toTime,
        reason: params.reason,
        permHours: Number(permissionHours),
        permReqDate: new Date(),
        status: "pending",
      });

      await Dbaccess.insertone("Ems_Notifications", {
        empId: params.empId,
        message: `Permission request by ${params.empName} `,
        type: "Permission Request",
        sentDate: new Date(),
        isRead: false,
      });

      res.status(200).json({
        message: "Permission request submitted",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: 500,
        message: "Internal Server Error",
      });
    }
  },
);

//get Employee Report
routes.get(
  "/getemployeereport",
  Dbaccess.authenticateToken,
  async function (req, res) {
    try {
      const { empId, monthYear } = req.query;

      const reqDataValidateResp = await validation.ValidateRequestData({
        empId,
        monthYear,
      });
      if (reqDataValidateResp.respCode !== 2) {
        return res.send(reqDataValidateResp);
      }

      // @ts-ignore
      const [year, month] = monthYear.split("-");
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      const dateOnly = (d) => d.toISOString().split("T")[0];

      /** ---------------- EMPLOYEE ---------------- */
      const empArr = await Dbaccess.getdata("Emp_Login", { empId }, {}, {});

      if (!empArr.length) {
        return res
          .status(404)
          .json({ status: 404, message: "Employee not found" });
      }

      const empData = empArr[0];

      const attendanceMap = {};

      /** ---------------- ATTENDANCE ---------------- */
      const attendanceData = await Dbaccess.getdata(
        "EmpAttendance",
        {
          empId,
          LoginTime: { $gte: startDate, $lte: endDate },
          isPresent: true,
        },
        {},
        {},
      );

      attendanceData.forEach((a) => {
        const d = dateOnly(a.LoginTime);
        attendanceMap[d] = attendanceMap[d] || {
          date: d,
          isPresent: false,
          leave: null,
          permission: null,
          attendStatus: "Absent",
        };
        attendanceMap[d].isPresent = true;
      });

      /** ---------------- LEAVE ---------------- */
      const leaveData = await Dbaccess.getdata(
        "EmpLeave",
        {
          empId,
          fromDate: { $lte: endDate },
          toDate: { $gte: startDate },
        },
        {},
        {},
      );

      leaveData.forEach((leave) => {
        let cur = new Date(leave.fromDate);
        const leaveEnd = new Date(leave.toDate);

        cur.setUTCHours(0, 0, 0, 0);
        leaveEnd.setUTCHours(0, 0, 0, 0);

        while (cur <= leaveEnd) {
          const d = dateOnly(cur);

          attendanceMap[d] = attendanceMap[d] || {
            date: d,
            isPresent: false,
            leave: null,
            permission: null,
            attendStatus: "Absent",
          };

          attendanceMap[d].leave = {
            leaveType: leave.leaveType,
            status: leave.status,
          };

          cur.setDate(cur.getDate() + 1);
        }
      });

      /** ---------------- PERMISSION ---------------- */
      const permissionData = await Dbaccess.getdata(
        "EmpPermission",
        {
          empId,
          date: { $gte: startDate, $lte: endDate },
        },
        {},
        {},
      );

      permissionData.forEach((p) => {
        const d = dateOnly(p.date);

        attendanceMap[d] = attendanceMap[d] || {
          date: d,
          isPresent: false,
          leave: null,
          permission: null,
        };

        attendanceMap[d].permission = {
          fromTime: p.fromTime,
          toTime: p.toTime,
          hours: p.permHours,
          status: p.status,
        };
      });

      const attendance = Object.values(attendanceMap).sort(
        // @ts-ignore
        (a, b) => new Date(a.date) - new Date(b.date),
      );

      /** ---------------- SUMMARY ---------------- */
      const totalPresent = attendance.filter((a) => a.isPresent).length;
      const totalLeave = attendance.filter(
        (a) => a.leave && a.leave.status === "approved",
      ).length;
      const totalPermHours = attendance.reduce(
        (sum, a) => sum + (a.permission?.hours || 0),
        0,
      );
      Object.values(attendanceMap).forEach((day) => {
        if (day.leave && day.leave.status === "approved") {
          day.attendStatus = "Leave";
        } else if (day.isPresent) {
          day.attendStatus = "Present";
        } else {
          day.attendStatus = "Absent";
        }
      });

      let workingDays = 0;
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        workingDays++;
      }
      let find = {
      isRead: false,
      type: { $in: ["Permission Action", "Leave Action"] },
      empId: empId,
    };
    let permCount = await Dbaccess.getdatacount("Ems_Notifications", {
      isRead: false,
      type: "Permission Action",
      empId: empId,
    });
      let leaveCount = await Dbaccess.getdatacount("Ems_Notifications", {
      isRead: false,
      type: "Leave Action",
      empId: empId,
    });
      res.status(200).json({
        status: 200,
        message: "Record Found",
        employee: {
          empId: empData.empId,
          employeeName: empData.name,
          role: empData.empType,
        },
        summary: {
          monthYear,
          totalPresent,
          totalLeave,
          totalPermHours,
          totalWorkingDays: workingDays,
        },
        attendance,
        permCount,
        leaveCount
      }); 
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  },
);

//Get Employee Notifications
routes.get(
  "/getEmpNotifications",
  Dbaccess.authenticateToken,
  async function (req, res) {
    const empId = req.query.empId;
    const reqDataValidateResp = await validation.ValidateRequestData({ empId });
    if (reqDataValidateResp.respCode !== 2) {
      return res.send(reqDataValidateResp);
    }
    let tablename = "Ems_Notifications";
    // Auto-mark notifications as read after 24 hours based on sentDate
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Dbaccess.updatemany(
      tablename,
      { isRead: true },
      {
        isRead: false,
        type: { $in: ["Permission Action", "Leave Action"] },
        empId: empId,
        sentDate: { $lte: cutoffDate },
      },
    );
    let find = {
      isRead: false,
      type: { $in: ["Permission Action", "Leave Action"] },
      empId: empId,
    };
    let project = {};
    let sort = { sentDate: -1 };
    let result = await Dbaccess.getdata(tablename, find, project, sort);
    let permCount = await Dbaccess.getdatacount("Ems_Notifications", {
      isRead: false,
      type: "Permission Action",
      empId: empId,
    });
      let leaveCount = await Dbaccess.getdatacount("Ems_Notifications", {
      isRead: false,
      type: "Leave Action",
      empId: empId,
    });
    
    if (result.length != 0) {
      var ResponseData = [];
      for (let index = 0; index < result.length; index++) {
        var obj = result[index];
        delete obj._id;
        const permStatus = obj.message.includes("Permission") ? obj.message.split(" ")[1] : null;
        const leaveStatus = obj.message.includes("Leave") ? obj.message.split(" ")[1] : null;
        obj.status = permStatus || leaveStatus || null;

        ResponseData.push(obj);
      }
      res.status(200).json({
        status: 200,
        message: "Records found",
        data: ResponseData,permCount,leaveCount
      });
    } else {
      res.status(404).json({
        status: 404,
        message: "Records Not found",
      });
    }
  },
);

//Employee Notifications Read
routes.post(
  "/empNotificationRead",
  Dbaccess.authenticateToken,
  async function (req, res) {
    try {
      const empId = req.body.empId;
      const reqDataValidateResp = await validation.ValidateRequestData({
        empId,
      });
      if (reqDataValidateResp.respCode !== 2) {
        return res.send(reqDataValidateResp);
      }
      const tablename = "Ems_Notifications";
      const filter = {
        isRead: false,
        type: { $in: ["Permission Action", "Leave Action"] },
        empId: empId,
      };

      const update = { isRead: true };
      var upResult = await Dbaccess.updatemany(tablename, update, filter);

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
  },
);
module.exports = routes;
