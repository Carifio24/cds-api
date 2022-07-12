import { Model, Op, Sequelize } from "sequelize";
import dotenv from "dotenv";

import {
  Class,
  Educator,
  ClassStories,
  StoryState,
  Story,
  StudentsClasses,
  Student
} from "./models";

import {
  createClassCode,
  createVerificationCode,
  encryptPassword,
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

type SequelizeError = { parent: { code: string } };

export type LoginResponse = {
  result: LoginResult;
  id?: number;
  success: boolean;
};

export type CreateClassResponse = {
  result: CreateClassResult;
  class?: object;
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
    id: user?.id,
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
  return result?.story_state || null;
}

export async function updateStoryState(studentID: number, storyName: string, newState: JSON): Promise<JSON | null> {
  let result = await StoryState.findOne({
    where: {
      student_id: studentID,
      story_name: storyName
    }
  })
  .catch(error => {
    console.log(error);
    return null;
  });

  const storyData = {
    student_id: studentID,
    story_name: storyName,
    story_state: newState
  };
  if (result !== null) {
    result?.update(storyData);
  } else {
    result = await StoryState.create(storyData).catch(error => {
      console.log(error);
      return null;
    });
  }
  return result?.story_state || null;
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

/** For testing purposes */
export async function newDummyStudent(seed = false, teamMember: string | null = null): Promise<Student> {
  const students = await Student.findAll();
  const ids: number[] = students.map(student => {
    if (!student) { return 0; }
    return typeof student.id === "number" ? student.id : 0;
  });
  const newID = Math.max(...ids) + 1;
  return Student.create({
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
}
