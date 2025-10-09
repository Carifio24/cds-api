import { BaseError, Options, Model, Op, QueryTypes, Sequelize, UniqueConstraintError, WhereOptions, CreationAttributes } from "sequelize";
import dotenv from "dotenv";
import { createNamespace } from "cls-hooked";

import * as S from "@effect/schema/Schema";

import {
  Class,
  Educator,
  ClassStories,
  StoryState,
  Story,
  StudentsClasses,
  Student,
  DummyClass,
  DashboardClassGroup,
  StageState,
  StoryVisitInfo,
} from "./models";

import {
  createClassCode,
  createVerificationCode,
  encryptPassword,
  isNumberArray,
  Either,
  Mutable,
  creationToUpdateAttributes,
} from "./utils";


import {
  CreateClassResult,
  LoginResult,
  SignUpResult,
  VerificationResult,
} from "./request_results";

import { User } from "./user";

import { setUpAssociations } from "./associations";
import { initializeModels } from "./models";
import { StudentOption, StudentOptions } from "./models/student_options";
import { Question } from "./models/question";
import { logger } from "./logger";
import { Stage } from "./models/stage";
import { classSetupRegistry } from "./registries";
import { UserExperienceRating } from "./models/user_experience";

export type LoginResponse = {
  type: "none" | "student" | "educator" | "admin",
  result: LoginResult;
  user?: User;
  id?: number;
  success: boolean;
};

export type CreateClassResponse = {
  result: CreateClassResult;
  class?: object | undefined;
}

export enum UserType {
  None = 0, // Not logged in
  Student,
  Educator,
  Admin
}

export interface DBConnectionOptions {
  dbName?: string;
  username?: string;
  password?: string;
  host?: string;
  logging?: Options["logging"];
}

export function getDatabaseConnection(options?: DBConnectionOptions) {
// Grab any environment variables
  dotenv.config();

  const dbName = options?.dbName ?? process.env.DB_NAME as string;
  const username = options?.username ?? process.env.DB_USERNAME as string;
  const password = options?.password ?? process.env.DB_PASSWORD as string;
  const host = options?.host ?? process.env.DB_HOSTNAME as string;
  const logging = options?.logging ?? console.log;
  const database = new Sequelize(dbName, username, password, {
      host,
      logging,
      dialect: "mysql",
      define: {
        timestamps: false,
        engine: "InnoDB",
      }
  });

  // Initialize our models with our database connection
  initializeModels(database);

  // Create any associations that we need
  setUpAssociations();

  const namespace = createNamespace("cds-api-namespace");
  Sequelize.useCLS(namespace);

  return database; 
}

// For now, this just distinguishes between duplicate account creation and other errors
// We can flesh this out layer
function signupResultFromError(error: BaseError): SignUpResult {
  if (error instanceof UniqueConstraintError) {
    return SignUpResult.EmailExists;
  } else {
    return SignUpResult.Error;
  }
}

function createClassResultFromError(error: BaseError): CreateClassResult {
  if (error instanceof UniqueConstraintError) {
    return CreateClassResult.AlreadyExists;
  } else {
    return CreateClassResult.Error;
  }
}

async function findEducatorByEmail(email: string): Promise<Educator | null> {
  return Educator.findOne({
    where: { email: { [Op.like] : email } }
  });
}

async function _findStudentByEmail(email: string): Promise<Student | null> {
  return Student.findOne({
    where: { email: { [Op.like] : email } }
  });
}

export async function findStudentByUsername(username: string): Promise<Student | null> {
  return Student.findOne({
    where: { username }
  });
}

export async function findStudentById(id: number): Promise<Student | null> {
  return Student.findOne({
    where: { id }
  });
}

// This is a very common operation, so we create a utility method for it
export async function findStudentByIdOrUsername(identifier: string): Promise<Student | null> {
  const id = Number(identifier);
  if (isNaN(id)) {
    return findStudentByUsername(identifier);
  } else {
    return findStudentById(id);
  }
}

export async function findEducatorById(id: number): Promise<Educator | null> {
  return Educator.findOne({
    where: { id }
  });
}

export async function findEducatorByUsername(username: string): Promise<Educator | null> {
  return Educator.findOne({
    where: { username },
  });
}

export async function verifyStudent(verificationCode: string): Promise<VerificationResult> {
  const result = await Student.findAll({
    where: {
      verification_code: verificationCode
    }
  });
  if (result.length > 0) {
    const student = result[0];
    if (student.verified === 1) {
      return VerificationResult.AlreadyVerified;
    }
    const update = await student.update({ verified: 1 }, {
      where: { id: student.id }
    })
    .catch(_error => null);
    return update !== null ? VerificationResult.Ok : VerificationResult.Error;
  }
  return VerificationResult.InvalidCode;
}

export async function verifyEducator(verificationCode: string): Promise<VerificationResult> {
  const result = await Educator.findAll({
    where: {
      verification_code: verificationCode
    }
  });
  if (result.length > 0) {
    const educator = result[0];
    if (educator.verified === 1) {
      return VerificationResult.AlreadyVerified;
    }
    const update = await educator.update({ verified: 1 }, {
      where: { id: educator.id }
    })
    .catch(_error => null);
    return update !== null ? VerificationResult.Ok : VerificationResult.Error;
  }
  return VerificationResult.InvalidCode;
}

async function studentVerificationCodeExists(code: string): Promise<boolean> {
  const result = await Student.findAll({
    where: { verification_code: code }
  });
  return result.length > 0;
}

async function educatorVerificationCodeExists(code: string): Promise<boolean> {
  const result = await Educator.findAll({
    where: { verification_code: code }
  });
  return result.length > 0;
}

export const SignUpEducatorSchema = S.struct({
  first_name: S.string,
  last_name: S.string,
  password: S.string,
  email: S.string,
  username: S.string,
  institution: S.optional(S.string),
  age: S.optional(S.number),
  gender: S.optional(S.string),
});

export type SignUpEducatorOptions = S.Schema.To<typeof SignUpEducatorSchema>;

export async function signUpEducator(options: SignUpEducatorOptions): Promise<SignUpResult> {
                         
  const encryptedPassword = encryptPassword(options.password);

  let validCode;
  let verificationCode: string;
  do {
    verificationCode = createVerificationCode();
    validCode = !(await educatorVerificationCodeExists(verificationCode) || await studentVerificationCodeExists(verificationCode));
  } while (!validCode);

  let result = SignUpResult.Ok;
  await Educator.create({
      ...options,
      verified: 0,
      verification_code: verificationCode,
      password: encryptedPassword,
    })
    .catch(error => {
      result = signupResultFromError(error);
    });
    return result;
}

export const SignUpStudentSchema = S.struct({
  username: S.string,
  password: S.string,
  email: S.optional(S.string),
  age: S.optional(S.number),
  gender: S.optional(S.string),
  institution: S.optional(S.string),
  classroom_code: S.optional(S.string),
});

export type SignUpStudentOptions = S.Schema.To<typeof SignUpStudentSchema>;

export async function signUpStudent(options: SignUpStudentOptions): Promise<SignUpResult> {

  const encryptedPassword = encryptPassword(options.password);

  let validCode;
  let verificationCode: string;
  do {
    verificationCode = createVerificationCode();
    validCode = !(await educatorVerificationCodeExists(verificationCode) || await studentVerificationCodeExists(verificationCode));
  } while (!validCode);
  
  let result = SignUpResult.Ok;
  const db = Student.sequelize;
  if (db === undefined) {
    return SignUpResult.Error;
  }

  try {
    const transactionResult = db.transaction(async transaction => {

      const student = await Student.create({
        username: options.username,
        verified: 0,
        verification_code: verificationCode,
        password: encryptedPassword,
        institution: options.institution,
        email: options.email,
        age: options.age,
        gender: options.gender,
      })
      .catch(error => {
        result = signupResultFromError(error);
      });

      // If the student has a valid classroom code,
      // add them to the class
      if (student && options.classroom_code) {
        const cls = await findClassByCode(options.classroom_code);
        if (cls !== null) {
          await StudentsClasses.create({
            student_id: student.id,
            class_id: cls.id
          }, { transaction });
        }
      }

      return result;
    });

    return transactionResult;
  } catch (error) {
    console.log(error);
    return SignUpResult.Error;
  }
}

export const CreateClassSchema = S.struct({
  educator_id: S.number,
  name: S.string,
  expected_size: S.number.pipe(S.int()),
  asynchronous: S.optional(S.boolean),
  story_name: S.optional(S.string),
});

export type CreateClassOptions = S.Schema.To<typeof CreateClassSchema>;

export async function createClass(options: CreateClassOptions): Promise<CreateClassResponse> {
  
  let result = CreateClassResult.Ok;
  const code = await createClassCode();
  const creationInfo = { ...options, code };

  const db = Class.sequelize;
  if (db === undefined) {
    return { result: CreateClassResult.Error };
  }

  try {
    await db.transaction(async _transaction => {

      const cls = await Class.create(creationInfo);

      const storyName = options.story_name;
      if (storyName) {
        await ClassStories.create({
          story_name: storyName,
          class_id: cls.id,
        });

        const setupFunctions = classSetupRegistry.setupFunctions(storyName);
        if (setupFunctions) {
          for (const setupFunc of setupFunctions) {
            await setupFunc(cls, storyName);
          }
        }
      }

      return cls;
    });

    return { result: result, class: creationInfo };
  } catch (error) {
    result = (error instanceof BaseError) ? createClassResultFromError(error) : CreateClassResult.Error;
    console.log(error);
    return { result: CreateClassResult.Error };
  }
}

export async function addStudentToClass(studentID: number, classID: number): Promise<StudentsClasses> {
  return StudentsClasses.create({
    student_id: studentID,
    class_id: classID
  });
}

async function checkLogin<T extends Model & User>(identifier: string, password: string, identifierFinder: (identifier: string)
  => Promise<T | null>): Promise<LoginResponse> {

  const encryptedPassword = encryptPassword(password);
  const user = await identifierFinder(identifier);
  let result: LoginResult;
  if (user === null) {
    result = LoginResult.EmailNotExist;
  } else if (user.password !== encryptedPassword) {
    result = LoginResult.IncorrectPassword;
  } else if (user.verified !== 1) {
    result = LoginResult.NotVerified;
  } else {
    result = LoginResult.Ok;
    user.update({
      visits: user.visits + 1,
      last_visit: Date.now()
    }, {
      where: { id: user.id }
    })
    // TODO: We don't want to fail the login if we have an error updating the visit count and time
    // But should we do anything else?
    .catch(_error => null);
  }
  
  let type: LoginResponse["type"] = "none";
  if (user instanceof Student) {
    type = "student";
  } else if (user instanceof Educator) {
    type = "educator";
  }

  const response: LoginResponse = {
    result: result,
    success: LoginResult.success(result),
    type,
    id: user?.id ?? 0,
  };
  if (user) {
    response.user = user;
  }
  return response;
}

export async function checkStudentLogin(username: string, password: string): Promise<LoginResponse> {
  return checkLogin(username, password, findStudentByUsername);
}

export async function checkEducatorLogin(email: string, password: string): Promise<LoginResponse> {
  return checkLogin(email, password, findEducatorByEmail);
}

export async function getAllStudents(): Promise<Student[]> {
  return Student.findAll();
}

export async function getAllEducators(): Promise<Educator[]> {
  return Educator.findAll();
}

export async function getStory(storyName: string): Promise<Story | null> {
  return Story.findOne({ where: { name: storyName } });
}

export async function getStages(storyName: string): Promise<Stage[]> {
  return Stage.findAll({
    where: {
      story_name: storyName,
    },
    order: [["stage_index", "ASC"]],
  });
}

export async function getStoryState(studentID: number, storyName: string): Promise<JSON | null> {
  const result = await StoryState.findOne({
    where: {
      student_id: studentID,
      story_name: storyName
    }
  })
  .catch(error => {
    console.log(error);
    return null;
  });
  return result?.story_state ?? null;
}

export async function updateStoryState(studentID: number, storyName: string, newState: JSON): Promise<JSON | null> {
  const query = {
    student_id: studentID,
    story_name: storyName,
  };
  let result = await StoryState.findOne({
    where: query
  })
  .catch(error => {
    console.log(error);
    return null;
  });

  const storyData = { ...query, story_state: newState };
  if (result !== null) {
    result?.update(storyData).catch(error => {
      console.log(error);
      return null;
    });
  } else {
    result = await StoryState.create(storyData).catch(error => {
      console.log(error);
      return null;
    });
  }
  return result?.story_state ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchState(state: Record<string,any>, patch: Record<string,any>) {
  Object.entries(patch).forEach(([key, value]) => {
    const isObject = typeof value === "object" && !Array.isArray(value) && value !== null;
    if (isObject) {
      if (!(key in state)) {
        state[key] = value;
      } else {
        patchState(state[key], value);
      }
    } else {
      state[key] = value;
    }
  });
}

export async function patchStoryState(studentID: number, storyName: string, patch: JSON): Promise<JSON | null> {
  const query = {
    student_id: studentID,
    story_name: storyName,
  };
  let result = await StoryState.findOne({
    where: query
  })
  .catch(error => {
    console.log(error);
    return null;
  });

  if (result !== null) {
    const state = result.story_state;
    patchState(state, patch);
    // TODO: For some reason, doing a regular `await result.update({ story_state: state })...`
    // did not produce an update to the database. Something about how JSON-type fields are handled?
    // Until we figure this out, just force-update
    result.story_state = state;
    result.changed("story_state", true);
    await result.save();
  } else {
    const storyData = { ...query, story_state: patch };
    result = await StoryState.create(storyData).catch(error => {
      console.log(error);
      return null;
    });
  }
  return result?.story_state ?? null;
}

export async function getStudentStageState(studentID: number, storyName: string, stageName: string): Promise<JSON | null> {
  const result = await StageState.findOne({
    where: {
      student_id: studentID,
      story_name: storyName,
      stage_name: stageName,
    }
  })
  .catch(error => {
    console.log(error);
    return null;
  });
  return result?.state ?? null;
}

export type StageStateQuery = { storyName: string, stageName?: string } & Either<{studentID: number}, {classID: number}>;

export async function getStageStates(query: StageStateQuery): Promise<Record<string, JSON[]>> {
  const where: WhereOptions = { story_name: query.storyName };
  if (query.stageName != undefined) {
    where.stage_name = query.stageName;
  }
  
  if (query.classID != undefined) {
    const students = await StudentsClasses.findAll({
      where: { class_id: query.classID }
    });
    const studentIDs = students.map(sc => sc.student_id);
    where.student_id = {
      [Op.in]: studentIDs
    };
  } else {
    where.student_id = query.studentID;
  }

  const results = await StageState.findAll({ where })
    .catch(error => {
      console.log(error);
      return null;
    });

  const stageStates: Record<string, JSON[]> = {};
  if (results !== null) {
    results.forEach(result => {
      const states = stageStates[result.stage_name] ?? [];
      states.push(result.state);
      stageStates[result.stage_name] = states;
    });
  }

  return stageStates;

}

export async function updateStageState(studentID: number, storyName: string, stageName: string, newState: JSON): Promise<JSON | null> {
  const query = {
    student_id: studentID,
    story_name: storyName,
    stage_name: stageName,
  };
  let result = await StageState.findOne({
    where: query
  })
  .catch(error => {
    console.log(error);
    return null;
  });

  const data = { ...query, state: newState };
  if (result !== null) {
    result.update(data)
    .catch(error => {
      console.log(error);
      // TODO: Anything to do here?
    });
  } else {
    result = await StageState.create(data).catch(error => {
      console.log(error);
      return null;
    });
  }
  return result?.state ?? null;
}

export async function deleteStageState(studentID: number, storyName: string, stageName: string): Promise<number> {
  return StageState.destroy({
    where: {
      student_id: studentID,
      story_name: storyName,
      stage_name: stageName,
    }
  });
}

export async function getClassesForEducator(educatorID: number): Promise<Class[]> {
  return Class.findAll({
    where: {
      educator_id: educatorID
    }
  });
}

export async function getClassesForStudent(studentID: number): Promise<Class[]> {
  return Class.findAll({
    include: [{
      model: Student,
      where: {
        id: studentID
      }
    }]
  });
}

export async function getStudentsForClass(classID: number): Promise<Student[]> {
  return Student.findAll({
    include: [{
      model: Class,
      where: {
        id: classID
      }
    }]
  });
}

export async function deleteClass(id: number): Promise<number> {
  return Class.destroy({
    where: { id }
  });
}

export async function findClassByCode(code: string): Promise<Class | null> {
  return Class.findOne({
    where: { code }
  });
}

export async function findClassById(id: number): Promise<Class | null> {
  return Class.findOne({
    where: { id }
  });
}

export async function findClassByIdOrCode(identifier: string): Promise<Class | null> {
  const id = Number(identifier);
  if (isNaN(id)) {
    return findClassByCode(identifier);
  } else {
    return findClassById(id);
  }
}

export async function getRosterInfoForStory(classID: number, name: string): Promise<StoryState[]> {
  return StudentsClasses.findAll({
    where: { class_id: classID }
  }).then(entries => {
    const studentIDs = entries.map(entry => entry.student_id);
    return StoryState.findAll({
      include: [
        {
          model: Student,
          required: false, // We also want access to the student data
          attributes: ["username", "email"],
          as: "student"
        },
      ],
      where: {
        student_id: {
          [Op.in]: studentIDs
        },
        story_name: name
      }
    });
  });
}

export async function getRosterInfo(classID: number, useDisplayNames = true): Promise<Record<string,StoryState[]|undefined>> {
  type Joined = ClassStories & {story: Story};
  const mapper: (entry: Joined) => string = useDisplayNames ? entry => entry.story.display_name : entry => entry.story_name;
  const activeStories = await ClassStories.findAll({
    include: [{
      model: Story,
      required: false,
      attributes: ["display_name"],
      as: "story"
    }],
    where: { class_id: classID }
  }) as Joined[];

  return activeStories.reduce(async (obj, entry) => {
    const mappedName = mapper(entry);
    Object.assign(obj, { [mappedName]: await getRosterInfoForStory(classID, entry.story_name) });
    return obj;
  }, {});
}

export async function getClassRoster(classID: number): Promise<Student[]> {
  return Student.findAll({
    include: [{
      model: StudentsClasses,
      required: true,
      attributes: [],
      where: {
        class_id: classID,
      },
    }]
  });
}

/** These functions are for testing purposes only */
export async function newDummyClassForStory(storyName: string): Promise<{cls: Class, dummy: DummyClass}> {
  const ct = await Class.count({
    where: {
      educator_id: 0,
      name: {
        [Op.like]: `DummyClass_${storyName}_`
      }
    },
  });
  const cls = await Class.create({
    educator_id: 0,
    name: `DummyClass_${storyName}_${ct+1}`,
    code: "xxxxxx"
  });
  let dc = await DummyClass.findOne({
    where: { story_name: storyName },
  });
  if (dc !== null) {
    dc.update({ class_id: cls.id })
      .catch(error => {
        console.log(error);
        // TODO: Anything to do here?
      });
  } else {
    dc = await DummyClass.create({
      class_id: cls.id,
      story_name: storyName,
    });
  }
  return { cls: cls, dummy: dc };
}

export async function newDummyStudent(seed = false,
                                      teamMember: string | null = null,
                                      storyName: string | null = null): Promise<Student | null> {
  const students = await Student.findAll();
  const ids: number[] = students.map(student => {
    if (!student) { return 0; }
    return typeof student.id === "number" ? student.id : 0;
  });
  const newID = Math.max(...ids) + 1;

  const db = Student.sequelize;
  if (db === undefined) {
    return null;
  }

  try {
    const transactionResult = await db.transaction(async _transaction => {
      const student = await Student.create({
        username: `dummy_student_${newID}`,
        verified: 1,
        verification_code: `verification_${newID}`,
        password: "dummypass",
        institution: "Dummy",
        email: `dummy_student_${newID}@dummy.school`,
        age: null,
        gender: null,
        seed: seed ? 1 : 0,
        team_member: teamMember,
        dummy: true
      });

      // If we have a story name, and are creating a seed student, we want to add this student to the current "dummy class" for that story
      if (seed && storyName !== null) {
        let cls: Class | null = null;
        let dummyClass = await DummyClass.findOne({
          where: { story_name: storyName },
        });
        let clsSize: number;
        if (dummyClass === null) {
          const res = await newDummyClassForStory(storyName);
          dummyClass = res.dummy;
          cls = res.cls;
          clsSize = 0;
        } else {
          clsSize = await StudentsClasses.count({
            where: { class_id: dummyClass.class_id },
          });
        }
        
        const ct = Math.floor(Math.random() * 11) + 20;
        if (clsSize > ct) {
          const res = await newDummyClassForStory(storyName);
          cls = res.cls;
        } else {
          cls = await Class.findOne({
            where: { id: dummyClass.class_id },
          });
        }
        if (cls !== null) {
          await StudentsClasses.create({
            class_id: cls.id,
            student_id: student.id
          });
        }
      }
      return student;
    });
    return transactionResult;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function classForStudentStory(studentID: number, storyName: string): Promise<Class | null> {
  return Class.findOne({
    include: [
      {
        model: ClassStories,
        required: true,
        attributes: [],
        where: {
          story_name: storyName
        }
      },
      {
        model: StudentsClasses,
        required: true,
        attributes: [],
        where: {
          student_id: studentID
        }
      }
    ]
  });
}

export async function classSize(classID: number): Promise<number> {
  return StudentsClasses.count({
    where: {
      class_id: classID
    }
  });
}

export async function isClassStoryActive(classID: number, storyName: string): Promise<boolean | null> {
  const classStory = await ClassStories.findOne({
    where: {
      class_id: classID,
      story_name: storyName,
    },
  });
  
  return classStory?.active ?? null;
}

export async function setClassStoryActive(classID: number, storyName: string, active: boolean): Promise<boolean> {
  const result = await ClassStories.update(
    { active  },
    {
      where: {
        class_id: classID,
        story_name: storyName,
      }
    }
  );
  return result[0] > 0;
}

export async function getStudentOptions(studentID: number): Promise<StudentOptions | null> {
  return StudentOptions.findOne({ where: { student_id: studentID } }).catch((_error) => null);
}

async function createStudentOptions(studentID: number): Promise<StudentOptions | null> {
  return StudentOptions.create({student_id: studentID}).catch((_error) => null);
}

// Change the typing of value as we add more student options
export async function setStudentOption(studentID: number, option: StudentOption, value: number | string): Promise<StudentOptions | null> {
  let options = await getStudentOptions(studentID);
  if (options === null) {
    options = await createStudentOptions(studentID);
  }
  if (options !== null) {
    options.update({ [option]: value })
      .catch(error => {
        console.log(error);
        // TODO: Anything to do here?
      });
  }
  return options;
}

export async function findQuestion(tag: string, version?: number): Promise<Question | null> {
  if (version !== undefined) {
    return Question.findOne({ where: { tag, version } });
  } else {
    const questions = await Question.findAll({
      where: { tag },
      order: [["version", "DESC"]],
      limit: 1
    });
    return questions[0] ?? null;
  }
}

export const QuestionInfoSchema = S.struct({
  tag: S.string,
  text: S.string,
  shorthand: S.string,
  story_name: S.string,
  answers_text: S.optional(S.mutable(S.array(S.string))),
  correct_answers: S.optional(S.mutable(S.array(S.number))),
  neutral_answers: S.optional(S.mutable(S.array(S.number))),
  version: S.optional(S.number),
});

export type QuestionInfo = S.Schema.To<typeof QuestionInfoSchema>;

export async function addQuestion(info: QuestionInfo): Promise<Question | null> {

  const infoToUse: Mutable<QuestionInfo> = { ...info };

  if (!infoToUse.version) {
    const currentVersion = await currentVersionForQuestion(infoToUse.tag);
    infoToUse.version = currentVersion || 1;
  }
  return Question.create(infoToUse).catch((error) => {
    logger.error(error);
    logger.error(`Question info: ${JSON.stringify(infoToUse)}`);
    return null;
  });
}

export async function currentVersionForQuestion(tag: string): Promise<number | null> {
  return Question.max("version", { where: { tag } });
}

export async function getQuestionsForStory(storyName: string, newestOnly=true): Promise<Question[]> {
  if (!newestOnly) {
    return Question.findAll({ where: { story_name: storyName } });

  }
  const sequelize = Question.sequelize;
  if (sequelize === undefined) {
    return [];
  }
  
  // Is there a good way to do this (i.e. join on a subquery) using the ORM?
  // It seemed simpler to just write out the query.
  // We can at least specify the model and the query type
  return sequelize.query(`SELECT * FROM (SELECT tag, max(version) AS version FROM Questions GROUP BY tag) t1
                         INNER JOIN Questions ON Questions.tag = t1.tag AND Questions.version = t1.version
                         WHERE story_name = '${storyName}'`,
                         {
                           model: Question,
                           type: QueryTypes.SELECT
                         });
}

export async function getDashboardGroupClasses(code: string): Promise<Class[] | null> {
  const group = await DashboardClassGroup.findOne({ where: { code } });
  if (group === null) {
    return null;
  }
  const classIDs = group.class_ids;
  if (!isNumberArray(classIDs)) {
    return [];
  }
  return Class.findAll({
    where: {
      id: {
        [Op.in]: classIDs
      }
    }
  });

}

export async function addVisitForStory(storyName: string, info: object): Promise<StoryVisitInfo | null> {
  return StoryVisitInfo.create({
    story_name: storyName,
    info: info as JSON,
  }).catch(error => {
    logger.error(error);
    return null;
  });
}

export async function setExperienceInfoForStory(info: CreationAttributes<UserExperienceRating>): Promise<UserExperienceRating | null> {
  const rating = await UserExperienceRating.findOne({
    where: {
      uuid: info.uuid,
      story_name: info.story_name,
      question: info.question,
    }
  });
  if (rating === null) {
    return UserExperienceRating.create(info)
      .catch(error => {
        logger.error(error);
        return null;
    });
  } else {
    const update = creationToUpdateAttributes(info);
    rating.update(update)
      .catch(error => {
        logger.error(error);
        return null;
      });
    return rating;
  }
}

export async function getUserExperienceForStory(uuid: string, storyName: string): Promise<UserExperienceRating[]> {
  return UserExperienceRating.findAll({
    where: {
      uuid,
      story_name: storyName,
    }
  });
}
