import { Model, Op, QueryTypes, Sequelize, WhereOptions } from "sequelize";
import dotenv from "dotenv";

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
} from "./models";

import {
  createClassCode,
  createVerificationCode,
  encryptPassword,
  isNumberArray,
  Either,
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

type SequelizeError = { parent: { code: string } };

export type LoginResponse = {
  result: LoginResult;
  id?: number;
  success: boolean;
};

export type CreateClassResponse = {
  result: CreateClassResult;
  class?: object | undefined;
}

// Grab any environment variables
// Currently, just the DB password
dotenv.config();

const dbName = "cosmicds_db";
const username = "cdsadmin";
const password = process.env.DB_PASSWORD;
//const username = "jon";
//const password = "Testp@ss123";
export const cosmicdsDB = new Sequelize(dbName, username, password, {
    host: "cosmicds-db.cupwuw3jvfpc.us-east-1.rds.amazonaws.com",
    dialect: "mysql",
    define: {
      timestamps: false
    }
});

// Initialize our models with our database connection
initializeModels(cosmicdsDB);
// (async () => {
//   await CosmicDSSession.sync({}).catch(console.log);
//   console.log("Done sync!");
// })();

// Create any associations that we need
setUpAssociations();

// For now, this just distinguishes between duplicate account creation and other errors
// We can flesh this out layer
function signupResultFromError(error: SequelizeError): SignUpResult {
  const code = error.parent.code;
  switch (code) {
    case "ER_DUP_ENTRY":
      return SignUpResult.EmailExists;
    default:
      return SignUpResult.Error;
  }
}

function createClassResultFromError(error: SequelizeError): CreateClassResult {
  const code = error.parent.code;
  switch (code) {
    case "ER_DUP_ENTRY":
      return CreateClassResult.AlreadyExists;
    default:
      return CreateClassResult.Error;
  }
}

async function findEducatorByEmail(email: string): Promise<Educator | null> {
  return Educator.findOne({
    where: { email: { [Op.like] : email } }
  });
}

async function findStudentByEmail(email: string): Promise<Student | null> {
  return Student.findOne({
    where: { email: { [Op.like] : email } }
  });
}

export async function findStudentByUsername(username: string): Promise<Student | null> {
  return Student.findOne({
    where: { username: username }
  });
}

export async function findStudentById(id: number): Promise<Student | null> {
  return Student.findOne({
    where: { id : id }
  });
}

export async function findEducatorById(id: number): Promise<Educator | null> {
  return Educator.findOne({
    where: { id: id }
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
    student.update({ verified: 1 }, {
      where: { id: student.id }
    });
    return VerificationResult.Ok;
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
    educator.update({ verified: 1 }, {
      where: { id: educator.id }
    });
    return VerificationResult.Ok;
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

export async function signUpEducator(firstName: string, lastName: string,
                              password: string, institution: string | null,
                              email: string, age: number | null, gender: string): Promise<SignUpResult> {
                         
  const encryptedPassword = encryptPassword(password);

  let validCode;
  let verificationCode: string;
  do {
    verificationCode = createVerificationCode();
    validCode = !(await educatorVerificationCodeExists(verificationCode) || await studentVerificationCodeExists(verificationCode));
  } while (!validCode);

  let result = SignUpResult.Ok;
  await Educator.create({
      first_name: firstName,
      last_name: lastName,
      verified: 0,
      verification_code: verificationCode,
      password: encryptedPassword,
      institution: institution,
      email: email,
      age: age,
      gender: gender,
    })
    .catch(error => {
      result = signupResultFromError(error);
    });
    return result;
}

export async function signUpStudent(username: string,
                             password: string, institution: string | null,
                             email: string, age: number, gender: string,
                             classroomCode: string | null): Promise<SignUpResult> {
  
  const encryptedPassword = encryptPassword(password);

  let validCode;
  let verificationCode: string;
  do {
    verificationCode = createVerificationCode();
    validCode = !(await educatorVerificationCodeExists(verificationCode) || await studentVerificationCodeExists(verificationCode));
  } while (!validCode);
  
  let result = SignUpResult.Ok;
  const student = await Student.create({
    username: username,
    verified: 0,
    verification_code: verificationCode,
    password: encryptedPassword,
    institution: institution,
    email: email,
    age: age,
    gender: gender,
  })
  .catch(error => {
    result = signupResultFromError(error);
  });

  // If the student has a valid classroom code,
  // add them to the class
  if (student && classroomCode) {
    const cls = await findClassByCode(classroomCode);
    if (cls !== null) {
      StudentsClasses.create({
        student_id: student.id,
        class_id: cls.id
      });
    }
  }

  return result;
}

export async function createClass(educatorID: number, name: string): Promise<CreateClassResponse> {
  
  let result = CreateClassResult.Ok;
  const code = createClassCode(educatorID, name);
  const creationInfo = {
    educator_id: educatorID,
    name: name,
    code: code,
  };
  const cls = await Class.create(creationInfo)
  .catch(error => {
    result = createClassResultFromError(error);
  });

  const info = result === CreateClassResult.Ok ? creationInfo : undefined;

  // For the pilot, the Hubble Data Story will be the only option,
  // so we'll automatically associate that with the class
  if (cls) {
    ClassStories.create({
      story_name: "hubbles_law",
      class_id: cls.id
    });
  }

  return { result: result, class: info };
}

export async function addStudentToClass(studentID: number, classID: number): Promise<StudentsClasses> {
  return StudentsClasses.create({
    student_id: studentID,
    class_id: classID
  });
}

async function checkLogin<T extends Model & User>(email: string, password: string, emailFinder: (email: string)
  => Promise<T | null>): Promise<LoginResponse> {

  const encryptedPassword = encryptPassword(password);
  const user = await emailFinder(email);
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
    });
  }
  return {
    result: result,
    id: user?.id ?? 0,
    success: LoginResult.success(result)
  };
}

export async function checkStudentLogin(email: string, password: string): Promise<LoginResponse> {
  return checkLogin(email, password, findStudentByEmail);
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
    result?.update(storyData);
  } else {
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
    result?.update(data);
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
    where: { id: id }
  });
}

export async function findClassByCode(code: string): Promise<Class | null> {
  return Class.findOne({
    where: { code: code }
  });
}

export async function findClassById(id: number): Promise<Class | null> {
  return Class.findOne({
    where: { id: id }
  });
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

/** These functions are for testing purposes only */
export async function newDummyClassForStory(storyName: string): Promise<{cls: Class, dummy: DummyClass}> {
  const ct = await Class.count({
    where: {
      educator_id: 0,
      name: {
        [Op.like]: `DummyClass_${storyName}_`
      }
    }
  });
  const cls = await Class.create({
    educator_id: 0,
    name: `DummyClass_${storyName}_${ct+1}`,
    code: "xxxxxx"
  });
  let dc = await DummyClass.findOne({ where: { story_name: storyName }} );
  if (dc !== null) {
    dc.update({ class_id: cls.id });
  } else {
    dc = await DummyClass.create({
      class_id: cls.id,
      story_name: storyName
    });
  }
  return { cls: cls, dummy: dc };
}

export async function newDummyStudent(seed = false,
                                      teamMember: string | null = null,
                                      storyName: string | null = null): Promise<Student> {
  const students = await Student.findAll();
  const ids: number[] = students.map(student => {
    if (!student) { return 0; }
    return typeof student.id === "number" ? student.id : 0;
  });
  const newID = Math.max(...ids) + 1;
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
    let dummyClass = await DummyClass.findOne({ where: { story_name: storyName } });
    let clsSize: number;
    if (dummyClass === null) {
      const res = await newDummyClassForStory(storyName);
      dummyClass = res.dummy;
      cls = res.cls;
      clsSize = 0;
    } else {
      clsSize = await StudentsClasses.count({ where: { class_id: dummyClass.class_id } });
    }
    
    const ct = Math.floor(Math.random() * 11) + 20;
    if (clsSize > ct) {
      const res = await newDummyClassForStory(storyName);
      cls = res.cls;
    } else {
      cls = await Class.findOne({ where: { id: dummyClass.class_id } });
    }
    if (cls !== null) {
      StudentsClasses.create({
        class_id: cls.id,
        student_id: student.id
      });
    }
  }

  return student;
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
    options.update({ [option]: value });
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

interface QuestionInfo {
  tag: string;
  text: string;
  shorthand: string;
  story_name: string;
  answers_text?: string[];
  correct_answers?: number[];
  neutral_answers?: number[];
  version?: number;
}
export async function addQuestion(info: QuestionInfo): Promise<Question | null> {
  if (!info.version) {
    const currentVersion = await currentVersionForQuestion(info.tag);
    info.version = currentVersion || 1;
  }
  return Question.create(info).catch((error) => {
    logger.error(error);
    logger.error(`Question info: ${JSON.stringify(info)}`);
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
