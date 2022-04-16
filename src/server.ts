import {
  cosmicdsDB,
  checkEducatorLogin,
  checkStudentLogin,
  createClass,
  signUpEducator,
  signUpStudent,
  verifyEducator,
  verifyStudent,
  submitHubbleMeasurement,
  getStudentHubbleMeasurements,
  getAllEducators,
  getAllGalaxies,
  getAllStudents,
  getHubbleMeasurement,
  getStoryState,
  LoginResponse,
  getClassesForEducator,
  findClassByCode,
  newDummyStudent,
  updateStoryState,
} from "./database";

import {
  CreateClassResult,
  LoginResult,
  SignUpResult,
  VerificationResult,
  SubmitHubbleMeasurementResult
} from "./request_results";

import { ParsedQs } from "qs";
import express, { Response } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import sequelizeStore from "connect-session-sequelize";
import { v4 } from "uuid";
import cors from "cors";
const app = express();

// eslint-disable-next-line @typescript-eslint/ban-types
type GenericRequest = express.Request<{}, any, any, ParsedQs, Record<string, any>>;
type VerificationRequest = express.Request<{verificationCode: string}, any, any, ParsedQs, Record<string, any>>;

const corsOptions = {
    //origin: "http://localhost:8081"
};

const PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_MAX_AGE = 24 * 60 * 60;

app.use(cors(corsOptions));
app.use(cookieParser());
const SequelizeStore = sequelizeStore(session.Store);
const store = new SequelizeStore({
  db: cosmicdsDB,
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds
  expiration: 24 * 60 * 60 * 1000 // The maximum age (in milliseconds) of a valid session
});

app.use(session({
  secret: "ADD_REAL_SECRET",
  genid: (_req) => v4(),
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: "/",
    maxAge: SESSION_MAX_AGE,
    httpOnly: false,
    secure: PRODUCTION
  }
}));
store.sync();

// parse requests of content-type - application/json
app.use(bodyParser.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the CosmicDS server." });
});

function sendUserIdCookie(userId: number, res: Response) : void {
  const expirationTime = 24 * 60 * 60; // one day
  console.log("Sending cookie");
  res.cookie("userId", userId,
    {
      maxAge: expirationTime ,
      httpOnly: false,
      secure: PRODUCTION
    });
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
    ((typeof data.institution === "string") || (data.institution === null)) &&
    typeof data.email === "string" &&
    ((typeof data.age === "number") || (data.age === null)) &&
    ((typeof data.gender === "string") || data.gender === null)
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
    ((typeof data.institution === "string") || (data.institution === null)) &&
    typeof data.email === "string" &&
    ((typeof data.age === "number") || (data.age === null)) &&
    ((typeof data.gender === "string") || (data.gender === null)) &&
    ((typeof data.classroomCode === "string") || (data.classroomCode === null))
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
  let response: LoginResponse;
  if (valid) {
    response = await checker(data.email, data.password);
  } else {
    response = { result: LoginResult.BadRequest, success: false };
  }
  return response;
}

app.put("/student-login", async (req, res) => {
  const response = await handleLogin(req, checkStudentLogin);
  if (response.success && response.id) {
    sendUserIdCookie(response.id, res);
  }
  res.json(response);
});

app.put("/educator-login", async (req, res) => {
  const response = await handleLogin(req, checkEducatorLogin);
  if (response.success && response.id) {
    sendUserIdCookie(response.id, res);
  }
  res.json(response);
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
    const response = await createClass(data.educatorID, data.name);
    result = response.result;
    cls = response.class;
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
  const response = await verify(req, verifyStudent);
  res.json({
    code: req.params.verificationCode,
    status: response
  });
});

app.post("/verify-educator/:verificationCode", async (req, res) => {
  const response = await verify(req, verifyEducator);
  res.json({
    code: req.params.verificationCode,
    status: response
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

app.put("/submit-measurement", async (req, res) => {
  const data = req.body;
  const valid = (
    typeof data.student_id === "number" &&
    typeof data.galaxy_id === "number" &&
    (!data.rest_wave_value || typeof data.rest_wave_value === "number") &&
    (!data.rest_wave_unit || typeof data.rest_wave_unit === "string") &&
    (!data.obs_wave_value || typeof data.obs_wave_value === "number") &&
    (!data.obs_wave_unit || typeof data.obs_wave_unit === "string") &&
    (!data.velocity_value || typeof data.velocity_value === "number") &&
    (!data.velocity_unit || typeof data.velocity_unit === "string") &&
    (!data.ang_size_value || typeof data.ang_size_value === "number") &&
    (!data.ang_size_unit || typeof data.ang_size_unit === "string") &&
    (!data.est_dist_value || typeof data.est_dist_value === "number") &&
    (!data.est_dist_unit || typeof data.est_dist_unit === "string")
  );

  let result: SubmitHubbleMeasurementResult;
  if (valid) {
    result = await submitHubbleMeasurement(data);
  } else {
    result = SubmitHubbleMeasurementResult.BadRequest;
  }
  res.json({
    measurement: data,
    status: result,
    success: SubmitHubbleMeasurementResult.success(result)
  });
});

app.get("/galaxies", async (_req, res) => {
  const response = await getAllGalaxies();
  res.json(response);
});

app.get("/students", async (_req, res) => {
  const response = await getAllStudents();
  res.json(response);
});

app.get("/educators", async (_req, res) => {
  const response = await getAllEducators();
  res.json(response);
});

app.get("/measurements/:studentID", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const measurements = await getStudentHubbleMeasurements(studentID);
  res.json({
    student_id: studentID,
    measurements: measurements
  });
});

app.get("/measurements/:studentID/:galaxyID", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const galaxyID = parseInt(params.galaxyID);
  const measurement = await getHubbleMeasurement(studentID, galaxyID);
  res.json({
    student_id: studentID,
    galaxy_id: galaxyID,
    measurement: measurement
  });
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
  const newState = req.body.storyState;
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
  const classes = await getClassesForEducator(studentID);
  res.json({
    student_id: studentID,
    classes: classes
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(console.log);
  res.send({
    "logout": true
  });
});


/** Testing Endpoints
 * 
 * These endpoints are intended for internal testing use only
 * and will not be in the final version of the API
 */

app.get("/new-dummy-student", async (_req, res) => {
  const student = await newDummyStudent();
  res.json({
    student: student
  });
});
