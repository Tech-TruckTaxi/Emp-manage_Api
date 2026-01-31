var jwt = require("jsonwebtoken");
var config = require("../config");
const uri =
  "mongodb://admin:05ilLXxLQO@node163402-trucktaxi-db.in1.justcloudify.net:27017/";
// @ts-ignore
const MongoClient = require("mongodb").MongoClient;

async function getdata(tablename, find, projects, sort, limit = 0, skip = 0) {
  const client = await MongoClient.connect(uri);
  const db = client.db("trucktaxi");
  let items;
  if (limit != 0 && skip == 0)
    items = await db
      .collection(tablename)
      .find(find)
      .project(projects)
      .sort(sort)
      .limit(limit)
      .toArray();
  else if (limit != 0 && skip != 0)
    items = await db
      .collection(tablename)
      .find(find)
      .project(projects)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .toArray();
  else if (limit == 0 && skip != 0)
    items = await db
      .collection(tablename)
      .find(find)
      .project(projects)
      .sort(sort)
      .skip(skip)
      .toArray();
  else
    items = await db
      .collection(tablename)
      .find(find)
      .project(projects)
      .sort(sort)
      .toArray();
  client.close();
  if (!items) items = [];
  return items;
}

exports.getdata = getdata;

async function insertone(tablename, data) {
  try {
    const client = await MongoClient.connect(uri);
    const db = client.db("trucktaxi");
    await db.collection(tablename).insertOne(data);
    client.close();
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

exports.insertone = insertone;

async function updateone(tablename, data, key) {
  try {
    const client = await MongoClient.connect(uri);
    const db = client.db("trucktaxi");
    await db.collection(tablename).updateOne(key, { $set: data });
    client.close();
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

exports.updateone = updateone;

function authenticateToken(req, res, next) {
  // Gather the jwt access token from the request header
  var token = req.headers["x-access-token"];
  if (token == null)
    return res.status(401).send({ auth: false, message: "No token provided." }); // if there isn't any token
  jwt.verify(token, config.secret, (err, user) => {
    if (err)
      res
        .status(401)
        .json({ status: 401, message: "Invalid Token or Token expired!" });
    req.user = user;
    next(); // pass the execution off to whatever request the client intended
  });
}

exports.authenticateToken = authenticateToken;

function verifyToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    // @ts-ignore
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    req.token = bearerToken;
    if (bearerToken == null)
      return res
        .status(401)
        .send({ auth: false, message: "No token provided." }); // if there isn't any token
    jwt.verify(bearerToken, config.secret, (err, user) => {
      if (err)
        res
          .status(401)
          .json({ status: 401, message: "Invalid Token or Token expired!" });
      req.user = user;
      next(); // pass the execution off to whatever request the client intended
    });
  } else {
    res.status(401).json({ status: 401, message: "No token provided." });
  }
}

exports.verifyToken = verifyToken;

async function getdatacount(tablename, find) {
  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db("trucktaxi");
  let count;
  count = await db.collection(tablename).find(find).count();
  client.close();
  if (!count) count = 0;
  return count;
}

exports.getdatacount = getdatacount;

async function updatemany(tablename, data, key) {
  try {
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db('trucktaxi');
    var response = await db.collection(tablename).updateMany(key, { $set: data })
    client.close();
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

exports.updatemany = updatemany;

exports.uri = uri;
