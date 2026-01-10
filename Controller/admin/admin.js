const routes = require("../employee/employee");
var Dbaccess = require("../../Model/dbaccess");

// Leave Action (Approve/Reject)
routes.post("/addleaveAction", Dbaccess.authenticateToken, async (req, res) => {
  try {
    const { leaveId, action } = req.body;

    if (!leaveId || !action) {
      return res.status(400).json({
        message: "leaveId and action are required"
      });
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
        message: "Leave request not found"
      });
    }

    // Update status
    const updatedStatus = action === "approve" ? "approved" : "rejected";

    await Dbaccess.updateone(
      "EmpLeave",
      {status: updatedStatus ,updatedAt: new Date() },
      { leaveId: Number(leaveId) },
      
    );

    return res.status(200).json({
      message:
        updatedStatus === "approved"
          ? "Leave approved successfully"
          : "Leave rejected successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
});

module.exports = routes;