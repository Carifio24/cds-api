import {
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
} from "./database";

import { getAPIKey } from "./authorization";

import {
  CreateClassResult,
  LoginResult,
  SignUpResult,
  VerificationResult,
} from "./request_results";

import { CosmicDSSession } from "./models";

import { ParsedQs } from "qs";
import express, { Express, Request, Response as ExpressResponse } from "express";
import { Response } from "express-serve-static-core";
import session from "express-session";
import jwt from "jsonwebtoken";
import { Sequelize } from "sequelize";

import { isStudentOption } from "./models/student_options";
import { isNumberArray, isStringArray } from "./utils";
import { setupApp } from "./app";

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

function _sendUserIdCookie(userId: number, res: ExpressResponse, production=true): void {
  const expirationTime = 24 * 60 * 60; // one day
  console.log("Sending cookie");
  res.cookie("userId", userId,
    {
      maxAge: expirationTime ,
      httpOnly: production,
      secure: production, 
    });
}

function _sendLoginCookie(userId: number, res: ExpressResponse, secret: string): void {
  const expirationTime = 24 * 60 * 60; // one day
  const token = jwt.sign({
    data: {
      "userId": userId
    }
  }, secret, {
    expiresIn: expirationTime
  });
  res.cookie("login", token);
}

export function createApp(db: Sequelize): Express {

  const app = express();
  setupApp(app, db);

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
      res.status(400);
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
      res.status(400);
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
    res.status(401);
    if (sess.user_id && sess.user_type) {
      result = LoginResult.Ok;
      res.status(200);
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
    const status = loginResponse.success ? 200 : 401;
    res.status(status).json(loginResponse);
  });
  
  app.put("/educator-login", async (req, res) => {
    const loginResponse = await handleLogin(req, checkEducatorLogin);
    if (loginResponse.success && loginResponse.id) {
      const sess = req.session as CDSSession;
      sess.user_id = loginResponse.id;
      sess.user_type = UserType.Educator;
    }
    const status = loginResponse.success ? 200 : 401;
    res.status(status).json(loginResponse);
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
      res.status(400);
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
  
  
  app.get("/students", async (_req, res) => {
    const queryResponse = await getAllStudents();
    res.json(queryResponse);
  });
  
  app.get("/educators", async (_req, res) => {
    const queryResponse = await getAllEducators();
    res.json(queryResponse);
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
  
  app.get("/student/:identifier", async (req, res) => {
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
      student: student
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
  
    const tag = req.params.tag;
    const text = req.body.text;
    const shorthand = req.body.shorthand;
    const story_name = req.body.story_name;
    const answers_text = req.body.answers_text;
    const correct_answers = req.body.correct_answers;
    const neutral_answers = req.body.neutral_answers;
  
    const valid = typeof tag === "string" &&
                  typeof text === "string" &&
                  typeof shorthand === "string" &&
                  typeof story_name === "string" &&
                  (answers_text === undefined || isStringArray(answers_text)) &&
                  (correct_answers === undefined || isNumberArray(correct_answers)) &&
                  (neutral_answers === undefined || isNumberArray(neutral_answers));
    if (!valid) {
      res.statusCode = 400;
      res.json({
        error: "One of your fields is missing or of the incorrect type"
      });
      return;
    }
  
    const currentQuestion = await findQuestion(tag);
    const version = currentQuestion !== null ? currentQuestion.version + 1 : 1;
    const addedQuestion = await addQuestion({tag, text, shorthand, story_name, answers_text, correct_answers, neutral_answers, version});
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

  return app;
}
