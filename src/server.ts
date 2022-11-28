import {
  cosmicdsDB,
  checkEducatorLogin,
  checkStudentLogin,
  createClass,
  signUpEducator,
  signUpStudent,
  verifyEducator,
  verifyStudent,
  getAllEducators,
  getAllStudents,
  getStoryState,
  LoginResponse,
  getClassesForEducator,
  findClassByCode,
  newDummyStudent,
  updateStoryState,
  getClassesForStudent,
  getRosterInfo,
  getRosterInfoForStory,
  findStudentById,
  findStudentByUsername,
  classForStudentStory,
  
} from "./database";

import {
  CreateClassResult,
  LoginResult,
  SignUpResult,
  VerificationResult,
} from "./request_results";

import { CosmicDSSession } from "./models";

import { ParsedQs } from "qs";
import express, { Request, Response as ExpressResponse } from "express";
import { Response } from "express-serve-static-core";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import sequelizeStore from "connect-session-sequelize";
import { v4 } from "uuid";
import cors from "cors";
import jwt from "jsonwebtoken";
export const app = express();

// TODO: Clean up these type definitions

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type GenericRequest = Request<{}, any, any, ParsedQs, Record<string, any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericResponse = Response<any, Record<string, any>, number>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VerificationRequest = Request<{verificationCode: string}, any, any, ParsedQs, Record<string, any>>;

type CDSSession = session.Session & Partial<session.SessionData> & CosmicDSSession;

export enum UserType {
  None = 0, // Not logged in
  Student,
  Educator,
  Admin
}

const ALLOWED_ORIGINS = [
  "http://192.168.99.136:8081",
  "https://cosmicds.github.io"
];

const corsOptions: cors.CorsOptions = {
    origin: "*",
    credentials: true,
    preflightContinue: true,
    exposedHeaders: ["set-cookie"]
};

const PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_MAX_AGE = 24 * 60 * 60; // in seconds

app.use(cors(corsOptions));
app.use(cookieParser());
const SequelizeStore = sequelizeStore(session.Store);
const store = new SequelizeStore({
  db: cosmicdsDB,
  table: "CosmicDSSession", // We need to use the model name instead of the table name (here they are different)
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds
  expiration: SESSION_MAX_AGE * 1000, // The maximum age (in milliseconds) of a valid session
  extendDefaultFields: function (defaults, sess) {
    return {
      data: defaults.data,
      expires: defaults.expires,
      user_id: sess.user_id,
      username: sess.username,
      email: sess.email
    };
  }
});

const SECRET = "ADD_REAL_SECRET";
const SESSION_NAME = "cosmicds";

app.set("trust proxy", 1);
app.use(session({
  secret: SECRET,
  genid: (_req) => v4(),
  store: store,
  name: SESSION_NAME,
  saveUninitialized: false,
  resave: true,
  cookie: {
    path: "/",
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: PRODUCTION
  }
}));
store.sync();

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {

  const origin = req.get("origin");
  console.log(origin);
  if (origin !== undefined && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  next();
});

app.all("*", (req, _res, next) => {
  console.log(req.session.id);
  next();
});

// simple route
app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the CosmicDS server." });
});

function _sendUserIdCookie(userId: number, res: ExpressResponse): void {
  const expirationTime = 24 * 60 * 60; // one day
  console.log("Sending cookie");
  res.cookie("userId", userId,
    {
      maxAge: expirationTime ,
      httpOnly: PRODUCTION,
      secure: PRODUCTION
    });
}

function _sendLoginCookie(userId: number, res: ExpressResponse): void {
  const expirationTime = 24 * 60 * 60; // one day
  const token = jwt.sign({
    data: {
      "userId": userId
    }
  }, SECRET, {
    expiresIn: expirationTime
  });
  res.cookie("login", token);
}

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Educator sign-up
app.post("/educator-sign-up", async (req, res) => {
  const data = req.body;
  const valid = (
    typeof data.firstName === "string" &&
    typeof data.lastName === "string" &&
    typeof data.password === "string" &&
    ((typeof data.institution === "string") || (data.institution == null)) &&
    typeof data.email === "string" &&
    ((typeof data.age === "number") || (data.age == null)) &&
    ((typeof data.gender === "string") || data.gender == null)
  );

  let result: SignUpResult;
  if (valid) {
    result = await signUpEducator(data.firstName, data.lastName, data.password, data.institution, data.email, data.age, data.gender);
  } else {
    result = SignUpResult.BadRequest;
  }
  res.json({
    educator_info: data,
    status: result,
    success: SignUpResult.success(result)
  });
});

// Student sign-up
app.post("/student-sign-up", async (req, res) => {
  const data = req.body;
  const valid = (
    typeof data.username === "string" &&
    typeof data.password === "string" &&
    ((typeof data.institution === "string") || (data.institution == null)) &&
    typeof data.email === "string" &&
    ((typeof data.age === "number") || (data.age == null)) &&
    ((typeof data.gender === "string") || (data.gender == null)) &&
    ((typeof data.classroomCode === "string") || (data.classroomCode == null))
  );

  let result: SignUpResult;
  if (valid) {
    result = await signUpStudent(data.username, data.password, data.institution, data.email, data.age, data.gender, data.classroomCode);
  } else {
    result = SignUpResult.BadRequest;
  }
  res.json({
    student_info: data,
    status: result,
    success: SignUpResult.success(result)
  });
});

async function handleLogin(request: GenericRequest, checker: (email: string, pw: string) => Promise<LoginResponse>): Promise<LoginResponse> {
  const data = request.body;
  const valid = typeof data.email === "string" && typeof data.password === "string";
  let res: LoginResponse;
  if (valid) {
    res = await checker(data.email, data.password);
  } else {
    res = { result: LoginResult.BadRequest, success: false };
  }
  return res;
}

app.put("/login", async (req, res) => {
  const sess = req.session as CDSSession;
  let result = LoginResult.BadSession;
  if (sess.user_id && sess.user_type) {
    result = LoginResult.Ok;
  }
  res.json({
    result: result,
    id: sess.user_id,
    success: LoginResult.success(result)
  });
});

app.put("/student-login", async (req, res) => {
  const loginResponse = await handleLogin(req, checkStudentLogin);
  if (loginResponse.success && loginResponse.id) {
    const sess = req.session as CDSSession;
    sess.user_id = loginResponse.id;
    sess.user_type = UserType.Student;
  }
  res.json(loginResponse);
});

app.put("/educator-login", async (req, res) => {
  const loginResponse = await handleLogin(req, checkEducatorLogin);
  if (loginResponse.success && loginResponse.id) {
    const sess = req.session as CDSSession;
    sess.user_id = loginResponse.id;
    sess.user_type = UserType.Educator;
  }
  res.json(loginResponse);
});

app.post("/create-class", async (req, res) => {
  const data = req.body;
  const valid = (
    typeof data.educatorID === "number" &&
    typeof data.name === "string"
  );

  let result: CreateClassResult;
  let cls: object | undefined = undefined;
  if (valid) {
    const createClassResponse = await createClass(data.educatorID, data.name);
    result = createClassResponse.result;
    cls = createClassResponse.class;
  } else {
    result = CreateClassResult.BadRequest;
  }
  res.json({
    class: cls,
    status: result
  });
});

async function verify(request: VerificationRequest, verifier: (code: string) => Promise<VerificationResult>): Promise<{ code: string; status: VerificationResult }> {
  const params = request.params;
  const verificationCode = params.verificationCode;
  const valid = typeof verificationCode === "string";

  let result;
  if (valid) {
    result = await verifier(verificationCode);
  } else {
    result = VerificationResult.BadRequest;
  }
  return {
    code: verificationCode,
    status: result
  };
}

app.post("/verify-student/:verificationCode", async (req, res) => {
  const verificationResponse = await verify(req, verifyStudent);
  res.json({
    code: req.params.verificationCode,
    status: verificationResponse
  });
});

app.post("/verify-educator/:verificationCode", async (req, res) => {
  const verificationResponse = await verify(req, verifyEducator);
  res.json({
    code: req.params.verificationCode,
    status: verificationResponse
  });
});

app.get("/validate-classroom-code/:code", async (req, res) => {
  const code = req.params.code;
  const cls = await findClassByCode(code);
  res.json({
    code: code,
    valid: cls !== null
  });
});


app.get("/students", async (_req, res) => {
  const queryResponse = await getAllStudents();
  res.json(queryResponse);
});

app.get("/educators", async (_req, res) => {
  const queryResponse = await getAllEducators();
  res.json(queryResponse);
});

app.get("/story-state/:studentID/:storyName", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const storyName = params.storyName;
  const state = await getStoryState(studentID, storyName);
  res.json({
    student_id: studentID,
    story_name: storyName,
    state: state
  });
});

app.put("/story-state/:studentID/:storyName", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const storyName = params.storyName;
  const newState = req.body;
  const state = await updateStoryState(studentID, storyName, newState);
  res.json({
    student_id: studentID,
    story_name: storyName,
    state: state
  });
});

app.get("/educator-classes/:educatorID", async (req, res) => {
  const params = req.params;
  const educatorID = parseInt(params.educatorID);
  const classes = await getClassesForEducator(educatorID);
  res.json({
    educator_id: educatorID,
    classes: classes
  });
});

app.get("/student-classes/:studentID", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const classes = await getClassesForStudent(studentID);
  res.json({
    student_id: studentID,
    classes: classes
  });
});

app.get("/roster-info/:classID", async (req, res) => {
  const params = req.params;
  const classID = parseInt(params.classID);
  const info = await getRosterInfo(classID);
  res.json(info);
});

app.get("/roster-info/:classID/:storyName", async (req, res) => {
  const params = req.params;
  const classID = parseInt(params.classID);
  const storyName = params.storyName;
  const info = await getRosterInfoForStory(classID, storyName);
  res.json(info);
});

app.get("/logout", (req, res) => {
  req.session.destroy(console.log);
  res.send({
    "logout": true
  });
});

app.get("/student/:identifier", async (req, res) => {
  const params = req.params;
  const id = parseInt(params.identifier);

  let student;
  if (isNaN(id)) {
    student = await findStudentByUsername(params.identifier);
  } else {
    student = await findStudentById(id);
  }
  if (student == null) {
    res.statusCode = 404;
  }
  res.json({
    student: student
  });
});

/** Testing Endpoints
 * 
 * These endpoints are intended for internal use only
 */

app.get("/new-dummy-student", async (_req, res) => {
  const student = await newDummyStudent();
  res.json({
    student: student
  });
});

app.post("/new-dummy-student", async (req, res) => {
  const seed = req.body.seed || false;
  const teamMember = req.body.team_member;
  const storyName = req.body.story_name;
  const student = await newDummyStudent(seed, teamMember, storyName);
  res.json({
    student: student
  });
});

app.get("/class-for-student-story/:studentID/:storyName", async (req, res) => {
  const studentID = parseInt(req.params.studentID);
  const storyName = req.params.storyName;
  const cls = isNaN(studentID) ? null : await classForStudentStory(studentID, storyName);
  res.json({
    class: cls
  });
  if (cls == null) {
    res.statusCode = 404;
  }
});
