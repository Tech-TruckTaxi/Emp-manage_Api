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
  }
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

    // @ts-ignore
    const diffTime = toDate - fromDate;
    const noOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Generate leaveId
    const lastLeave = await Dbaccess.getdata(
      "EmpLeave",
      {},
      {},
      { leaveId: -1 }
    );

    const leaveId = lastLeave.length > 0 ? lastLeave[0].leaveId + 1 : 1;

    // Insert leave request
    await Dbaccess.insertone("EmpLeave", {
      leaveId: leaveId,
      empName: params.empName,
      empId: params.empId,
      leaveType: params.leaveType,
      fromDate: new Date(params.fromDate),
      toDate: new Date(params.toDate),
      reason: params.reason,
      noOfDays: noOfDays,
      leaveReqTime: new Date(),
      status: "pending",
    });

    res.status(200).json({
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
        { permId: -1 }
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
  }
);

//get Employee Report
routes.get(
  "/getemployeereport",
  Dbaccess.authenticateToken,
  async function (req, res) {
    try {
      const params = {
        empId: req.query.empId,
        monthYear: req.query.monthYear, // yyyy-mm
      };
      const empId = params.empId;
      const monthYear = params.monthYear;

      const reqDataValidateResp = await validation.ValidateRequestData(params);
      if (reqDataValidateResp.respCode !== 2) {
        return res.send(reqDataValidateResp);
      }

      // Split yyyy-mm
      // @ts-ignore
      const [year, month] = monthYear.split("-");

      // Month start & end
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      // Employee Info
      const empDataArr = await Dbaccess.getdata(
        "login",
        { LoginID: empId },
        {},
        {}
      );

      if (empDataArr.length === 0) {
        return res
          .status(404)
          .json({ status: 404, message: "Employee not found" });
      }

      const empData = empDataArr[0];

      // Attendance
      const attendanceData = await Dbaccess.getdata(
        "EmpAttendance",
        {
          EmpId: empId,
          LoginTime: { $gte: startDate, $lte: endDate },
        },
        {},
        { LoginTime: 1 }
      );

      const attendance = attendanceData.map((a) => ({
        date: a.LoginTime.toISOString().split("T")[0],
        isPresent: !!a.isPresent,
      }));

      const totalPresent = attendance.filter((a) => a.isPresent).length;

      // Leave
      const leaveData = await Dbaccess.getdata(
        "EmpLeave",
        {
          empId: empId,
          fromDate: { $lte: endDate },
          toDate: { $gte: startDate },
          status: "approved",
        },
        {},
        {}
      );

      const leave = leaveData.map((l) => ({
        leaveType: l.leaveType,
        from: l.fromDate.toISOString().split("T")[0],
        to: l.toDate.toISOString().split("T")[0],
        noOfDays: l.noOfDays,
      }));

      const totalLeave = leave.reduce((sum, l) => sum + l.noOfDays, 0);

      // Permission
      const permissionData = await Dbaccess.getdata(
        "EmpPermission",
        {
          empId: empId,
          date: { $gte: startDate, $lte: endDate },
          status: "approved",
        },
        {},
        {}
      );

      const permission = permissionData.map((p) => ({
        date: p.date.toISOString().split("T")[0],
        hours: p.permHours,
      }));
      const totalPermHours = permission.reduce((sum, p) => sum + p.hours, 0);

      // Total Working Days (Mon–Sat)
      let totalWorkingDays = 0;
      let d = new Date(startDate);
      while (d <= endDate) {
        const day = d.getDay();
        if (day !== 0 && day !== 7) totalWorkingDays++;
        d.setDate(d.getDate() + 1);
      }

      res.status(200).json({
        status: 200,
        message: "Record Found",
        employee: {
          empId: empData.LoginID,
          EmployeeName: empData.name,
          role: empData.role,
        },
        summary: {
          monthYear,
          totalWorkingDays,
          totalPresent,
          totalLeave,
          totalPermHours,
        },
        attendance,
        leave,
        permission,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
  }
);

module.exports = routes;
