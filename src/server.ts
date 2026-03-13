import {
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
  getClassRoster,
  isClassStoryActive,
  setClassStoryActive,
  findClassByIdOrCode,
  findStudentByIdOrUsername,
  addVisitForStory,
  patchStoryState,
  getUserExperienceForStory,
  setExperienceInfoForStory,
} from "./database";

import {
  CreateClassResult,
  LoginResult,
  SignUpResult,
  VerificationResult,
} from "./request_results";

import { CosmicDSSession, StudentsClasses, Class, IgnoreStudent } from "./models";

import { ParsedQs } from "qs";
import express, { Express, Request, Response as ExpressResponse } from "express";
import { Response } from "express-serve-static-core";
import session from "express-session";
import jwt from "jsonwebtoken";

import { isStudentOption } from "./models/student_options";
import { ExperienceRating } from "./models/user_experience";

import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { JSONSchema } from "@effect/schema";

import { setupApp } from "./app";
import { getAPIKey, hasPermission } from "./authorization";
import { Sequelize } from "sequelize";
import { sendEmail } from "./email";
import { logger } from "./logger";

// TODO: Clean up these type definitions

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type GenericRequest = Request<{}, any, any, ParsedQs, Record<string, any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericResponse = Response<any, Record<string, any>, number>;



// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VerificationRequest = Request<{ verificationCode: string }, any, any, ParsedQs, Record<string, any>>;

type CDSSession = session.Session & Partial<session.SessionData> & CosmicDSSession;


function _sendUserIdCookie(userId: number, res: ExpressResponse, production = true): void {
  const expirationTime = 24 * 60 * 60; // one day
  console.log("Sending cookie");
  res.cookie("userId", userId,
    {
      maxAge: expirationTime,
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

export interface AppOptions {
  sendEmails?: boolean;
}

export function createApp(db: Sequelize, options?: AppOptions): Express {

  const sendEmails = options?.sendEmails ?? true;

  const app = express();
  setupApp(app, db);

  app.all("*", (req, _res, next) => {
    console.log(req.session.id);
    next();
  });

  /**
   * @openapi
   * /:
   *   get:
   *    description: Welcome to the CosmicDS API server!
   *    responses:
   *      200:
   *        description: Returns a welcome message, with an extra bit of text if no valid API key is present in the `Authorization` header
   *        content:
   *          application/json:
   *            schema:
   *             type: object
   *             properties:
   *               message: 
   *                 type: string
   */
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

  /**
   * @openapi
   * /permission:
   *   get:
   *     description: Used for determining whether an API key has permission to perform a given action on a given resource path
   *     parameters:
   *       - in: query
   *         name: api_key
   *         schema:
   *           type: string
   *       - in: query
   *         name: action 
   *         schema:
   *           type: string
   *           enum:
   *             - read
   *             - write
   *             - delete
   *       - in: query
   *         name: path 
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: The request had all of necessary query items (API key, action, resource path)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 permission:
   *                   type: boolean
   *       400:
   *         description: At least query parameter was invalid/missing
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 permission:
   *                   type: boolean
   *                 error:
   *                   type: string
   *       404:
   *         description: The requested API key does not exist
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 permission:
   *                   type: boolean
   *                 error:
   *                   type: string
   *
   */
  app.get("/permission", async (req, res) => {
    const key = req.query.api_key;
    const action = req.query.action;
    const path = req.query.path;
    const schema = S.struct({
      key: S.string,
      action: S.literal("read", "write", "delete"),
      path: S.string,
    });
    const maybe = S.decodeUnknownEither(schema)({ key, action, path });
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        permission: false,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error The generated schema has a properties field
        error: `Invalid request parameters, should have the following schema: ${JSON.stringify(JSONSchema.make(schema).properties)}`,
      });
      return;
    }

    const apiKey = await getAPIKey(maybe.right.key);
    if (apiKey === null) {
      res.status(404).json({
        permission: false,
        message: "The provided API key does not exist",
      });
      return;
    }
    const permission = await hasPermission({
      key: apiKey,
      action: maybe.right.action,
      resourcePath: maybe.right.path,
    });

    res.json({ permission });

  });

  /**
   *  @openapi
   *  /educators/create:
   *    post:
   *      description: Create a new educator account
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/EducatorCreationInfo"
   *      responses:
   *        201:
   *          description: A new educator was successfully created
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/EducatorCreated"
   *        409:
   *          description: An educator with the given email address already exists
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/EducatorCreated"
   *        400:
   *          description: The request body was ill-formed
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/EducatorCreated"
   */
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
    const success = SignUpResult.success(result);

    if (success && sendEmails) {
      sendEmail({
        to: "cosmicds@cfa.harvard.edu",
        subject: "Educator account created",
        text: `
          Educator account created at ${Date()}:
          Name: ${data.first_name} ${data.last_name}
          Email: ${data.email}
        `,
      })
      .catch(error => console.log(error));
    }
    res.status(statusCode).json({
      educator_info: data,
      status: result,
      success,
    });
  });

  /**
   *  @openapi
   *  /students/create:
   *    post:
   *      description: Create a new student account
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/StudentCreationInfo"
   *      responses:
   *        201:
   *          description: A new student was successfully created
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/StudentCreated"
   *        409:
   *          description: A student with the given email address already exists
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/StudentCreated"
   *        400:
   *          description: The request body was ill-formed
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/StudentCreated"
   */
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
      case VerificationResult.Error:
        return 500;
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

  /**
   *  @openapi
   *  /students:
   *    get:
   *      description: Return information about all existing students
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/Student"
  */
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
    const student = await findStudentByIdOrUsername(req.params.identifier);
    if (student == null) {
      res.statusCode = 404;
    }
    res.json({
      student,
    });
  });

  app.get("/students/:identifier/classes", async (req, res) => {
    const student = await findStudentByIdOrUsername(req.params.identifier);
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

  app.delete("/students/:identifier/classes/:classID", async (req, res) => {

    const identifier = req.params.identifier;
    const student = await findStudentByIdOrUsername(identifier);
    if (student === null) {
      res.statusCode = 404;
      res.json({
        message: `No student found for identifier ${identifier}`,
        success: false,
      });
      return;
    }

    const classID = Number(req.params.classID);
    const cls = findClassById(classID);
    if (cls === null) {
      res.statusCode = 404;
      res.json({
        message: `No class found with ID ${classID}`,
        success: false,
      });
      return;
    }

    const join = await StudentsClasses.findOne({
      where: {
        student_id: student.id,
        class_id: classID,
      }
    });

    if (join === null) {
      res.statusCode = 404;
      res.json({
        success: false,
        message: `Student with identifier ${identifier} not found in class ${classID}`,
      });
      return;
    }

    join.destroy()
      .then(() => {
        res.statusCode = 204;
        res.end();
      })
      .catch(error => {
        console.log(error);
        res.statusCode = 500;
        res.json({
          error: "Operation failed. There was an internal server error while removing the student from the class."
        });
      });

  });

  app.put("/students/ignore/:identifier/:storyName", async (req, res) => {
    const identifier = req.params.identifier;
    const student = await findStudentByIdOrUsername(identifier);
    if (student === null) {
      res.status(404).json({
        success: false,
        error: `No student found for identifier ${identifier}`,
      });
      return;
    }

    const storyName = req.params.storyName;
    const story = await getStory(storyName);
    if (story === null) {
      res.status(404).json({
        success: false,
        error: `No story found with name ${storyName}`,
      });
      return;
    }

    const schema = S.struct({
      ignore: S.boolean
    });
    const maybe = S.decodeUnknownEither(schema)(req.body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        success: false,
        error: "Invalid request body; should have form { ignore: <boolean> }",
      });
      return;
    }

    const ignore = maybe.right.ignore;
    let success = false;
    let message: string;
    
    if (ignore) {

      const [ignored, created] = await IgnoreStudent.upsert({
        student_id: student.id,
        story_name: story.name,
      });
      success = ignored !== null;
      res.statusCode = success ? 200 : 500;
      if (!success) {
        message = `Error ignoring student ${student.id} in story ${story.name}`;
      } else if (!created) {
        message = `Student ${student.id} was already ignored for story ${story.name}`;
      } else {
        message = `Successfully ignored student ${student.id} for story ${story.name}`;
      }
    } else {
      const modified = await IgnoreStudent.destroy({
        where: {
          student_id: student.id,
          story_name: story.name,
        }
      })
      .then((count) => {
        success = true;
        return count;
      })
      .catch((error: Error) => {
        logger.error(error);
        success = false;
        return 0;
      });

      if (!success) {
        message = `Error unignoring student ${student.id} for story ${story.name}`;
      } else if (modified === 0) {
        message = `Student ${student.id} was already not ignored for story ${story.name}`;
      } else {
        message = `Successfully unignored student ${student.id} for story ${story.name}`;
      }
    }

    res.json({ success, message });
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

  app.get("/classes/:identifier", async (req, res) => {
    const params = req.params;
    const id = Number(params.identifier);

    let cls: Class | null;
    if (isNaN(id)) {
      cls = await findClassByCode(params.identifier);
    } else {
      cls = await findClassById(id);
    }

    const size = cls != null ? await classSize(cls.id) : 0;
    if (cls === null) {
      res.statusCode = 404;
    }
    res.json({
      class: cls,
      size,
    });
  });

  app.delete("/classes/:identifier", async (req, res) => {
    const params = req.params;
    const id = Number(params.identifier);

    let cls: Class | null;
    let identifier: string;
    if (isNaN(id)) {
      cls = await findClassByCode(params.identifier);
      identifier = "code";
    } else {
      cls = await findClassById(id);
      identifier = "ID";
    }
    if (cls === null) {
      res.status(404).json({
        success: false,
        error: `Could not find class with ${identifier} ${params.identifier}`,
      });
      return;
    }
    const success = await cls.destroy()
      .then(() => true)
      .catch(error => {
        console.log(error);
        return false;
      });

    if (!success) {
      res.status(500).json({
        success: false,
        error: `Server error deleting class with ${identifier} ${params.identifier}`,
      });
      return;
    }

    res.json({
      success: true,
      message: "Class deleted",
    });
  });

  app.get("/classes/size/:classID", async (req, res) => {
    const classID = Number(req.params.classID);
    const cls = await findClassById(classID);
    if (cls === null) {
      res.status(404).json({
        error: `No class found with ID ${classID}`,
      });
      return;
    }
    const size = await classSize(classID);
    res.json({
      class_id: classID,
      size
    });
  });

  app.get("/classes/expected-size/:classID", async (req, res) => {
    const classID = Number(req.params.classID);
    const cls = await findClassById(classID);
    if (cls === null) {
      res.status(404).json({
        error: `No class found with ID ${classID}`,
      });
      return;
    }
    const size = cls.expected_size;
    res.json({
      class_id: classID,
      expected_size: size,
    });
  });

  app.get("/classes/roster/:classID", async (req, res) => {
    const classID = Number(req.params.classID);
    const cls = await findClassById(classID);
    if (cls === null) {
      res.status(404).json({
        error: `No class found with ID ${classID}`,
      });
      return;
    }

    const students = await getClassRoster(classID);
    res.json(students);
  });

  app.get("/classes/active/:classIdentifier/:storyName", async (req, res) => {
    const classIdentifier = req.params.classIdentifier;
    const cls = await findClassByIdOrCode(classIdentifier);
    if (cls === null) {
      res.status(404).json({
        error: `No class found: ${classIdentifier}`,
      });
      return;
    }
    const storyName = req.params.storyName;
    const story = await getStory(storyName);
    if (story === null) {
      res.status(404).json({
        error: `No story found with name ${storyName}`,
      });
      return;
    }

    const active = await isClassStoryActive(cls.id, storyName);
    if (active === null) {
      res.status(404).json({
        error: `It seems that class ${classIdentifier} is not signed up for story ${storyName}`,
      });
      return;
    }

    res.json({
      active,
    });

  });

  app.post("/classes/active/:classIdentifier/:storyName", async (req, res) => {
    const classIdentifier = req.params.classIdentifier;
    const cls = await findClassByIdOrCode(classIdentifier);
    if (cls === null) {
      res.status(404).json({
        error: `No class found: ${classIdentifier}`,
      });
      return;
    }
    const storyName = req.params.storyName;
    const story = await getStory(storyName);
    if (story === null) {
      res.status(404).json({
        error: `No story found with name ${storyName}`,
      });
      return;
    }

    const schema = S.struct({
      active: S.boolean,
    });
    const maybe = S.decodeUnknownEither(schema)(req.body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: "Invalid request body; should have form { active: <boolean> }",
      });
      return;
    }

    const active = maybe.right.active;
    let error = false;
    const success = setClassStoryActive(cls.id, storyName, active)
      .catch(_err => {
        error = true;
      });

    if (error) {
      res.status(500).json({
        error: `There was an error updating the active status for ${classIdentifier}, story ${storyName}`,
      });
      return;
    }
    if (!success) {
      res.status(404).json({
        error: `It seems that class ${classIdentifier} is not signed up for story ${storyName}`,
      });
      return;
    }

    res.json({
      class_id: cls.id,
      class_code: cls.code,
      story_name: storyName,
      active,
      success: true,
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

  app.patch("/story-state/:studentID/:storyName", async (req, res) => {
    const params = req.params;
    const studentID = Number(params.studentID);
    const storyName = params.storyName;
    const patch = req.body;
    const state = await patchStoryState(studentID, storyName, patch);
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
      res.status(404);
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
    const classes = await getDashboardGroupClasses(req.params.code);
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

  app.post("/stories/visit", async (req, res) => {
    const schema = S.struct({
      story_name: S.string,
      info: S.object,
    });
    const body = req.body;
    const maybe = S.decodeUnknownEither(schema)(body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        success: false,
        error: "Invalid request body; should have form { story_name: <string>, info: <object> }",
      });
      return;
    }

    const data = maybe.right;
    const storyVisitInfo = await addVisitForStory(data.story_name, data.info);
    if (storyVisitInfo !== null) {
      res.json({
        success: true,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error creating story visit info entry",
      });
    }
    
  });

  app.put("/stories/user-experience/:storyName", async (req, res) => {
    const storyName = req.params.storyName as string;
    const schema = S.struct({
      story_name: S.string,
      comments: S.optional(S.string),
      uuid: S.string,
      question: S.string,
      rating: S.optional(S.enums(ExperienceRating)),
    });
    const body = {
      ...req.body,
      story_name: storyName,
    };
    const maybe = S.decodeUnknownEither(schema)(body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        success: false,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error The generated schema has a properties field
        error: `Invalid request body; should have the following schema: ${JSON.stringify(JSONSchema.make(schema).properties)}`,
      });
      return;
    }

    const data = maybe.right;
    const experienceInfo = await setExperienceInfoForStory(data);
    if (experienceInfo !== null) {
      res.json({
        success: true,
        rating: experienceInfo.toJSON(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error creating user experience info",
      });
    }
  });

  app.get("/stories/user-experience/:storyName/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
    const storyName = req.params.storyName as string;
    const ratings = await getUserExperienceForStory(uuid, storyName)
      .catch(error => {
        logger.error(error);
        return null;
      });

    if (ratings === null) {
      res.status(500).json({
        error: `There was an error creating a user experience rating for used ${uuid}, story ${storyName}`,
      });
      return;
    }

    if (ratings.length === 0) {
      res.status(404).json({
        error: `User ${uuid} does not have any user experience ratings for story ${storyName}`,
      });
      return;
    }

    res.json({ ratings });
  });

  return app;
}
