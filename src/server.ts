import {
  cosmicdsDB,
  checkEducatorLogin,
  checkStudentLogin,
  createClass,
  signUpEducator,
  SignUpStudentSchema,
  signUpStudent,
  SignUpEducatorSchema,
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
  getStudentOptions,
  setStudentOption,
  classSize,
  findQuestion,
  addQuestion,
  currentVersionForQuestion,
  getQuestionsForStory,
  getDashboardGroupClasses,
  getStudentStageState,
  updateStageState,
  deleteStageState,
  findClassById,
  getStages,
  getStory,
  getStageStates,
  StageStateQuery,
  CreateClassResponse,
  UserType,
  findEducatorByUsername,
  findEducatorById,
  CreateClassSchema,
  QuestionInfoSchema,
} from "./database";

import { getAPIKey, hasPermission } from "./authorization";

import {
  CreateClassResult,
  LoginResult,
  SignUpResult,
  VerificationResult,
} from "./request_results";

import { CosmicDSSession, StudentsClasses } from "./models";

import { ParsedQs } from "qs";
import express, { Request, Response as ExpressResponse, NextFunction } from "express";
import { Response } from "express-serve-static-core";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import sequelizeStore from "connect-session-sequelize";
import { v4 } from "uuid";
import cors from "cors";
import jwt from "jsonwebtoken";

import { isStudentOption } from "./models/student_options";

import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";

export const app = express();

// TODO: Clean up these type definitions

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type GenericRequest = Request<{}, any, any, ParsedQs, Record<string, any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericResponse = Response<any, Record<string, any>, number>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VerificationRequest = Request<{verificationCode: string}, any, any, ParsedQs, Record<string, any>>;

type CDSSession = session.Session & Partial<session.SessionData> & CosmicDSSession;



const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];

const corsOptions: cors.CorsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204
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


async function apiKeyMiddleware(req: Request, res: ExpressResponse, next: NextFunction): Promise<void> {

  if (req.originalUrl === "/") {
    next();
    return;
  }

  // The whitelisting of hosts is temporary!
  const host = req.headers.origin;
  const validOrigin = host && ALLOWED_ORIGINS.includes(host);
  const key = req.get("Authorization");
  const apiKey = key ? await getAPIKey(key) : null;
  const apiKeyExists = apiKey !== null;
  if (validOrigin || (apiKeyExists && hasPermission(apiKey, req))) {
    next();
  } else {
    res.statusCode = apiKeyExists ? 403 : 401;
    const message = apiKeyExists ?
      "Your API key does not provide permission to access this endpoint!" :
      "You must provide a valid CosmicDS API key!";
    res.json({ message });
    res.end();
  }
}

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

app.use(apiKeyMiddleware);

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
app.get("/", async (req, res) => {
  const key = req.get("Authorization");
  const apiKey = key ? await getAPIKey(key) : null;
  const apiKeyExists = apiKey !== null;
  let message = "Welcome to the CosmicDS server!";
  if (!apiKeyExists) {
    message += " You'll need to include a valid API key with your requests in order to access other endpoints.";
  }
  res.json({ message: message });
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
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Educator sign-up
app.post([
  "/educators/create",
  "/educator-sign-up", // Old
], async (req, res) => {
  const data = req.body;
  const maybe = S.decodeUnknownEither(SignUpEducatorSchema)(data);

  let result: SignUpResult;
  if (Either.isRight(maybe)) {
    result = await signUpEducator(maybe.right);
  } else {
    result = SignUpResult.BadRequest;
  }
  const statusCode = SignUpResult.statusCode(result);
  res.status(statusCode).json({
    educator_info: data,
    status: result,
    success: SignUpResult.success(result)
  });
});

// Student sign-up
app.post([
  "/students/create",
  "/student-sign-up", // Old
], async (req, res) => {
  const data = req.body;
  const maybe = S.decodeUnknownEither(SignUpStudentSchema)(data);

  let result: SignUpResult;
  if (Either.isRight(maybe)) {
    result = await signUpStudent(maybe.right);
  } else {
    result = SignUpResult.BadRequest;
  }
  const statusCode = SignUpResult.statusCode(result);
  res.status(statusCode).json({
    student_info: data,
    status: result,
    success: SignUpResult.success(result)
  });
});

async function handleLogin(request: GenericRequest, identifierField: string, checker: (identifier: string, pw: string) => Promise<LoginResponse>): Promise<LoginResponse> {
  const data = request.body;
  const schema = S.struct({
    [identifierField]: S.string,
    password: S.string,
  });
  const maybe = S.decodeUnknownEither(schema)(data);
  let res: LoginResponse;
  if (Either.isRight(maybe)) {
    res = await checker(maybe.right[identifierField], maybe.right.password);
  } else {
    res = { result: LoginResult.BadRequest, success: false, type: "none" };
  }
  return res;
}

// app.put("/login", async (req, res) => {
//   const sess = req.session as CDSSession;
//   let result = LoginResult.BadSession;
//   res.status(401);
//   if (sess.user_id && sess.user_type) {
//     result = LoginResult.Ok;
//     res.status(200);
//   }
//   res.json({
//     result: result,
//     id: sess.user_id,
//     success: LoginResult.success(result)
//   });
// });

app.put("/login", async (req, res) => {
  let response = await handleLogin(req, "username", checkStudentLogin);
  let type = UserType.Student;
  if (!(response.success && response.user)) {
    response = await handleLogin(req, "username", checkEducatorLogin);
    type = UserType.Educator;
  }

  if (response.success && response.user) {
    const sess = req.session as CDSSession;
    if (sess) {
      sess.user_id = response.user.id;
      sess.user_type = type;
    }
  }

  const status = response.success ? 200 : 401;
  res.status(status).json(response);
});

app.put("/student-login", async (req, res) => {
  const loginResponse = await handleLogin(req, "username", checkStudentLogin);
  if (loginResponse.success && loginResponse.user) {
    const sess = req.session as CDSSession;
    sess.user_id = loginResponse.user.id;
    sess.user_type = UserType.Student;
  }
  const status = loginResponse.success ? 200 : 401;
  res.status(status).json(loginResponse);
});

app.put("/educator-login", async (req, res) => {
  const loginResponse = await handleLogin(req, "email", checkEducatorLogin);
  if (loginResponse.success && loginResponse.user) {
    const sess = req.session as CDSSession;
    sess.user_id = loginResponse.user.id;
    sess.user_type = UserType.Educator;
  }
  const status = loginResponse.success ? 200 : 401;
  res.status(status).json(loginResponse);
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

function statusCodeForVericationResult(result: VerificationResult): number {
  switch (result) {
    case VerificationResult.Ok:
      return 200;
    case VerificationResult.BadRequest:
      return 400;
    case VerificationResult.InvalidCode:
      return 401;
    case VerificationResult.AlreadyVerified:
      return 409;
  }
}

app.post("/verify-student/:verificationCode", async (req, res) => {
  const verificationResponse = await verify(req, verifyStudent);
  const statusCode = statusCodeForVericationResult(verificationResponse.status);
  res.status(statusCode).json({
    code: req.params.verificationCode,
    status: verificationResponse
  });
});

app.post("/verify-educator/:verificationCode", async (req, res) => {
  const verificationResponse = await verify(req, verifyEducator);
  const statusCode = statusCodeForVericationResult(verificationResponse.status);
  res.status(statusCode).json({
    code: req.params.verificationCode,
    status: verificationResponse
  });
});

app.get("/validate-classroom-code/:code", async (req, res) => {
  const code = req.params.code;
  const cls = await findClassByCode(code);
  const valid = cls !== null;
  const status = valid ? 200 : 404;
  res.status(status).json({
    code: code,
    valid: cls !== null
  });
});


/* Users (students and educators) */

app.get("/students", async (_req, res) => {
  const queryResponse = await getAllStudents();
  res.json(queryResponse);
});

app.get("/educators", async (_req, res) => {
  const queryResponse = await getAllEducators();
  res.json(queryResponse);
});

app.get("/users", async (_req, res) => {
  const students = await getAllStudents();
  const educators = await getAllEducators();
  res.json({ students, educators });
});

app.get([
  "/students/:identifier",
  "/student/:identifier", // Backwards compatibility
], async (req, res) => {
  const params = req.params;
  const id = Number(params.identifier);

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
    student,
  });
});

app.get("/students/:identifier/classes", async (req, res) => {
  const id = Number(req.params.identifier);

  let student;
  if (isNaN(id)) {
    student = await findStudentByUsername(req.params.identifier);
  } else {
    student = await findStudentById(id);
  }

  if (student === null) {
    res.statusCode = 404;
    res.json({
      student_id: null,
      classes: []
    });
    return;
  }

  const classes = await getClassesForStudent(student.id);
  res.json({
    student_id: student.id,
    classes: classes
  });

});

app.get("/educators/:identifier", async (req, res) => {
  const params = req.params;
  const id = Number(params.identifier);

  let educator;
  if (isNaN(id)) {
    educator = await findEducatorByUsername(params.identifier);
  } else {
    educator = await findEducatorById(id);
  }
  if (educator == null) {
    res.statusCode = 404;
  }
  res.json({
    educator,
  });
});

app.post("/classes/join", async (req, res) => {
  const username = req.body.username as string;
  const classCode = req.body.class_code as string;
  const student = await findStudentByUsername(username);
  const cls = await findClassByCode(classCode);
  const isStudent = student !== null;
  const isClass = cls !== null;

  if (!(isStudent && isClass)) {
    let message = "The following were invalid:";
    const invalid: string[] = [];
    if (!isStudent) {
      invalid.push("username");
    }
    if (!isClass) {
      invalid.push("class_code");
    }
    message += invalid.join(", ");
    res.statusCode = 404;
    res.json({
      success: false,
      message: message
    });
    return;
  }

  const [join, created] = await StudentsClasses.upsert({
    class_id: cls.id,
    student_id: student.id
  });
  const success = join !== null;
  res.statusCode = success ? 200 : 404;
  let message: string;
  if (!success) {
    message = "Error adding student to class";
  } else if (!created) {
    message = "Student was already enrolled in class";
  } else {
    message = "Student added to class successfully";
  }

  res.json({ success, message });
});

/* Classes */
app.post([
  "/classes/create",
  "/create-class",
], async (req, res) => {
  const data = req.body;
  const maybe = S.decodeUnknownEither(CreateClassSchema)(data);
  let response: CreateClassResponse;
  if (Either.isRight(maybe)) {
    response = await createClass(maybe.right);
  } else {
    response = {
      result: CreateClassResult.BadRequest,
    };
    res.status(400);
  }
  res.json({
    class_info: response.class,
    status: response.result,
    success: CreateClassResult.success(response.result)
  });
});

app.delete("/classes/:code", async (req, res) => {
  const cls = await findClassByCode(req.params.code);
  const success = cls !== null;
  if (!success) {
    res.status(400);
  }
  cls?.destroy();
  const message = success ?
    "Class deleted" :
    "No class with the given code exists";
  res.json({
    success,
    message
  });
});
    
app.get("/classes/size/:classID", async (req, res) => {
  const classID = Number(req.params.classID);
  const cls = await findClassById(classID);
  if (cls === null) {
    res.status(404).json({
      message: `Class ${classID} not found`,
    });
    return;
  }
  const size = classSize(classID);
  res.json({
    class_id: classID,
    size
  });
});

app.get("/story-state/:studentID/:storyName", async (req, res) => {
  const params = req.params;
  const studentID = Number(params.studentID);
  const storyName = params.storyName;
  const state = await getStoryState(studentID, storyName);
  const status = state !== null ? 200 : 404;
  res.status(status).json({
    student_id: studentID,
    story_name: storyName,
    state
  });
});

app.put("/story-state/:studentID/:storyName", async (req, res) => {
  const params = req.params;
  const studentID = Number(params.studentID);
  const storyName = params.storyName;
  const newState = req.body;
  const state = await updateStoryState(studentID, storyName, newState);
  const status = state !== null ? 200 : 404;
  res.status(status).json({
    student_id: studentID,
    story_name: storyName,
    state
  });
});

app.get("/stages/:storyName", async (req, res) => {
  const storyName = req.params.storyName;
  const story = await getStory(storyName);

  if (story === null) {
    res.status(404).json({
      error: `No story found with name ${storyName}`
    });
    return;
  }

  const stages = await getStages(req.params.storyName);
  res.json({
    stages,
  });
});

// Use query parameters `student_id`, `class_id`, and `stage_name` to filter output
// `stage_name` is optional. If not specified, return value will be an object of the form
// { stage1: [<states>], stage2: [<states>], ... }
// If specified, this returns an object of the form [<states>]
// At least one of `student_id` and `class_id` must be specified.
// If both are specified, only `student_id` is used
app.get("/stage-states/:storyName", async (req, res) => {
  const storyName = req.params.storyName;
  const story = await getStory(storyName);

  if (story === null) {
    res.status(404).json({
      error: `No story found with name ${storyName}`
    });
    return;
  }

  let query: StageStateQuery;
  const studentID = Number(req.query.student_id);
  const classID = Number(req.query.class_id);
  if (!isNaN(studentID)) {
    const student = await findStudentById(studentID);
    if (student === null) {
      res.status(404).json({
        error: `No student found with ID ${studentID}`
      });
      return;
    }
    query = { storyName, studentID };
  } else if (!isNaN(classID)) {
    const cls = await findClassById(classID);
    if (cls === null) {
      res.status(404).json({
        error: `No class found with ID ${classID}`
      });
      return;
    }
    query = { storyName, classID };
  } else {
    res.status(400).json({
      error: "Must specify either a student or a class ID"
    });
    return;
  }
  
  const stageName = req.query.stage_name as string;
  if (stageName != undefined) {
    query.stageName = stageName;
  }
  const stageStates = await getStageStates(query);
  const results = (stageName != undefined) ? stageStates[stageName] : stageStates;
  res.json(results);
});

app.get("/stage-state/:studentID/:storyName/:stageName", async (req, res) => {
  const params = req.params;
  const studentID = Number(params.studentID);
  const storyName = params.storyName;
  const stageName = params.stageName;
  const state = await getStudentStageState(studentID, storyName, stageName);
  const status = state !== null ? 200 : 404;
  res.status(status).json({
    student_id: studentID,
    story_name: storyName,
    stage_name: stageName,
    state
  });
});

app.put("/stage-state/:studentID/:storyName/:stageName", async (req, res) => {
  const params = req.params;
  const studentID = Number(params.studentID);
  const storyName = params.storyName;
  const stageName = params.stageName;
  const newState = req.body;
  const state = await updateStageState(studentID, storyName, stageName, newState);
  const status = state !== null ? 200 : 404;
  res.status(status).json({
    student_id: studentID,
    story_name: storyName,
    stage_name: stageName,
    state
  });
});

app.delete("/stage-state/:studentID/:storyName/:stageName", async (req, res) => {
  const params = req.params;
  const studentID = Number(params.studentID);
  const storyName = params.storyName;
  const stageName = params.stageName;
  const state = await getStudentStageState(studentID, storyName, stageName);
  if (state != null) {
    res.status(200);
    const count = await deleteStageState(studentID, storyName, stageName);
    const success = count > 0;
    res.json({
      success,
    });
  } else {
    res.status(400);
    const message = "No such (student, story, stage) combination found";
    res.statusMessage = message;
    res.json({
      message,
    });
  }
});

app.get("/educator-classes/:educatorID", async (req, res) => {
  const params = req.params;
  const educatorID = Number(params.educatorID);
  const classes = await getClassesForEducator(educatorID);
  res.json({
    educator_id: educatorID,
    classes: classes
  });
});

app.get("/student-classes/:studentID", async (req, res) => {
  const params = req.params;
  const studentID = Number(params.studentID);
  const classes = await getClassesForStudent(studentID);
  res.json({
    student_id: studentID,
    classes: classes
  });
});

app.get("/roster-info/:classID", async (req, res) => {
  const params = req.params;
  const classID = Number(params.classID);
  const info = await getRosterInfo(classID);
  res.json(info);
});

app.get("/roster-info/:classID/:storyName", async (req, res) => {
  const params = req.params;
  const classID = Number(params.classID);
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



// Question information
app.get("/question/:tag", async (req, res) => {
  const tag = req.params.tag;
  let version = parseInt(req.query.version as string);
  let hasVersion = true;
  let mightExist = true;
  if (isNaN(version)) {
    hasVersion = false;
    const currentVersion = await currentVersionForQuestion(tag) || 1;
    if (currentVersion === null) {
      mightExist = false;
    } else {
      version = currentVersion;
    }
  }
  const question = mightExist ? await findQuestion(tag, version) : null;
  if (question === null) {
    res.statusCode = 404;
    let error = "Could not find question with specified ";
    if (hasVersion) {
      error += "tag/version combination";
    } else {
      error += "tag";
    }
    res.json({
      error
    });
    return;
  }

  res.json({
    question
  });
});


app.post("/question/:tag", async (req, res) => {

  const data = { ...req.body, tag: req.params.tag };
  const maybe = S.decodeUnknownEither(QuestionInfoSchema)(data);

  if (Either.isLeft(maybe)) {
    res.statusCode = 400;
    res.json({
      error: "One of your fields is missing or of the incorrect type"
    });
    return;
  }

  const currentQuestion = await findQuestion(req.params.tag);
  const version = currentQuestion !== null ? currentQuestion.version + 1 : 1;
  const questionInfo = { ...maybe.right, version };
  const addedQuestion = await addQuestion(questionInfo);
  if (addedQuestion === null) {
    res.statusCode = 500;
    res.json({
      error: "There was an error creating the question entry."
    });
    return;
  }

  res.json({
    question: addedQuestion
  });
});


app.get("/questions/:storyName", async (req, res) => {
  const storyName = req.params.storyName;
  const newestOnlyString = req.query.newest_only as string;
  const newestOnly = newestOnlyString?.toLowerCase() !== "false";
  const questions = await getQuestionsForStory(storyName, newestOnly);
  res.json({
    questions
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
  const studentID = Number(req.params.studentID);
  const storyName = req.params.storyName;
  const cls = isNaN(studentID) ? null : await classForStudentStory(studentID, storyName);
  const size = cls != null ? await classSize(cls.id) : 0;
  if (cls == null) {
    res.statusCode = 404;
  }
  res.json({
    class: cls,
    size
  });
});

app.get("/options/:studentID", async (req, res) => {
  const studentID = Number(req.params.studentID);
  const options = await getStudentOptions(studentID);
  res.json(options);
  if (options == null) {
    res.statusCode = 404;
  }
});

app.put("/options/:studentID", async (req, res) => {
  const studentID = Number(req.params.studentID);
  const option = req.body.option;
  const value = req.body.value;
  if (!isStudentOption(option)) {
    res.statusCode = 404;
    res.statusMessage = `${option} is not a valid option`;
    res.send();
    return;
  }
  const updatedOptions = await setStudentOption(studentID, option, value);
  if (updatedOptions === null) {
    res.statusCode = 404;
    res.statusMessage = "Invalid student ID";
    res.send();
    return;
  }
  res.json(updatedOptions);
});

app.get("/dashboard-group-classes/:code", async (req, res) => {
  const classes= await getDashboardGroupClasses(req.params.code);
  if (classes === null) {
    res.statusCode = 404;
    res.json({
      error: `Could not find a dashboard group for code ${req.params.code}`
    });
  } else {
    res.json({
      classes
    });
  }
});
