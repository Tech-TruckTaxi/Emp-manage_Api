const express = require("express");
const auth = require("./Controller/user/auth");
const employee = require("./Controller/employee/employee");
const admin = require("./Controller/admin/admin");
const fileUpload = require("express-fileupload");
var bodyParser = require("body-parser");

const app = express();
var http = require("http").Server(app);
const port = 1212;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(express.json());
app.use(fileUpload());
app.use("/auth", auth);
app.use("/employee", employee);
app.use("/admin", admin);

http.listen(port, () =>
  console.log("server Start running at localhost:" + port)
);
