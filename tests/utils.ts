/* eslint-disable @typescript-eslint/no-floating-promises */

import fs from "fs";
import { join } from "path";
import type { Express } from "express";
import type { Server } from "http";
import type { Response, Test } from "supertest";
import { InferAttributes, CreationAttributes, Model, Sequelize, UniqueConstraintError } from "sequelize";

import { setUpAssociations } from "../src/associations";
import {
  APIKeyRole,
  ClassStories,
  Educator,
  IgnoreClass,
  IgnoreStudent,
  Permission,
  Role,
  RolePermission,
  StageState,
  Story,
  StoryState,
  StudentsClasses,
  initializeModels
} from "../src/models";
import { createApp } from "../src/server";
import { Class, Student } from "../src/models";
import { APIKey } from "../src/models/api_key";
import { config } from "dotenv";
import { v4 } from "uuid";
import { getDatabaseConnection } from "../src/database";
import { createConnection, Connection } from "mysql2/promise";
import { hashAPIKey } from "../src/authorization";
import { setupSwaggerDocs } from "../src/openapi/utils";

export function authorize(request: Test): Test {
  return request.set({ Authorization: process.env.CDS_API_KEY });
}

export async function createTestMySQLConnection(): Promise<Connection> {
  return createConnection({
    host: process.env.DB_TEST_HOSTNAME as string,
    user: process.env.DB_TEST_USERNAME as string,
    password: process.env.DB_TEST_PASSWORD as string,
  });
}

export async function getTestDatabaseConnection(): Promise<Sequelize> {
  const username = process.env.DB_TEST_USERNAME as string;
  const password = process.env.DB_TEST_PASSWORD as string;
  const host = process.env.DB_TEST_HOSTNAME as string;
  const envTestLogging = process.env.DB_TEST_LOGGING;
  const logging = envTestLogging === "false" ? false : console.log;
  const db = getDatabaseConnection({
    dbName: "test", 
    username,
    password,
    host,
    logging,
  });

  await db.query("USE test;");
  initializeModels(db);
  setUpAssociations();

  return db;
}

export async function setupTestDatabase(): Promise<Sequelize> {
  config();
  const connection = await createTestMySQLConnection();
  await connection.query("CREATE DATABASE IF NOT EXISTS test;");
  const db = await getTestDatabaseConnection();

  // We need to close when the connection terminates!
  // See https://github.com/sequelize/sequelize/issues/7953
  // and https://stackoverflow.com/a/45114507
  // db.sync({ force: true, match: /test/ }).finally(() => db.close());
  await syncTables(db);

  return db;
}

export async function teardownTestDatabase(): Promise<void> {
  const connection = await createTestMySQLConnection();
  await connection.query("DROP DATABASE test;");
}

export async function syncTables(db: Sequelize, force=false): Promise<void> {
  const options = { force, alter: false };
  await APIKey.sync(options);
  await Student.sync(options);
  await Educator.sync(options);
  await Class.sync(options);
  await Permission.sync(options);
  await Role.sync(options);
  await RolePermission.sync(options);
  await APIKeyRole.sync(options);
  await StudentsClasses.sync(options);
  await Story.sync(options);
  await ClassStories.sync(options);
  await StoryState.sync(options);
  await StageState.sync(options);
  await IgnoreStudent.sync(options);
  await IgnoreClass.sync(options);

  // ActiveClasses is a view, which Sequelize is not great at handling
  // so we just create it ourselves here
  await db.query(`
    CREATE VIEW ActiveClasses AS
    SELECT *
    FROM Classes
    WHERE active = 1;
  `);
}

export async function addAdminAPIKey(): Promise<APIKey | void> {
  // Set up some basic data that we're going to want
  const hashedKey = hashAPIKey(process.env.CDS_API_KEY as string);
  const key = await APIKey.create({
    hashed_key: hashedKey,
    client: "Tests",
  });

  const admin = await Role.create({
    name: "admin",
  });

  const globalRead = await Permission.create({ name: "global-read", action: "read", resource_pattern: "/" });
  const globalWrite = await Permission.create({ name: "global-write", action: "write", resource_pattern: "/" });
  const globalDelete = await Permission.create({ name: "global-delete", action: "delete", resource_pattern: "/" });

  const globalPermissions: Permission[] = [globalRead, globalWrite, globalDelete];
  for (const permission of globalPermissions) {
    await RolePermission.create({
      role_id: admin.id,
      permission_id: permission.id,
    });
  }

  await APIKeyRole.create({
    api_key_id: key.id,
    role_id: admin.id,
  });

  return key;
}

export async function addTestData() {
  // In case multiple processes somehow try to add the same API key,
  // we don't want to throw an error
  try {
    await addAdminAPIKey();
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) {
      console.error(error);
    }
  }
}

export async function createTestApp(db: Sequelize): Promise<Express> {
  const app = createApp(db, { sendEmails : false });

  const storiesDir = join(__dirname, "..", "src", "stories");
  const entries = fs.readdirSync(storiesDir, { withFileTypes: true });
  entries.forEach(entry => {
    if (entry.isDirectory()) {
      const file = join(storiesDir, entry.name, "main.ts");
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const data = require(file);
      data.setup(app, db);
      app.use(data.path, data.router);
    }
  });

  for (const model of Object.values(db.models)) {
    // Avoid issues like https://github.com/sequelize/sequelize/issues/12889
    try {
      await model.sync();
    } catch (error) {
      console.error(error);
    }
  }

  setupSwaggerDocs(app);

  return app;
}

export function runApp(app: Express, port = 8080, callback?: () => void): Server {
  return app.listen(port, callback);
}

export async function randomStudent(options?: Partial<CreationAttributes<Student>>): Promise<Student> {
  const studentData: CreationAttributes<Student> = {
    email: v4(),
    username: v4(),
    password: v4(),
    verification_code: v4(),
    verified: 0,
    ...options,
  };
  return Student.create(studentData);
}

export async function randomEducator(options?: Partial<CreationAttributes<Educator>>): Promise<Educator> {
  const educatorData: CreationAttributes<Educator> = {
    first_name: v4(),
    last_name: v4(),
    password: v4(),
    email: v4(),
    verified: 1,
    verification_code: v4(),
    username: v4(),
    ...options,
  };
  return Educator.create(educatorData);
}

export async function randomClassForEducator(educatorID: number, options?: Partial<CreationAttributes<Class>>): Promise<Class> {
  const classData: CreationAttributes<Class> = {
    name: v4(),
    educator_id: educatorID,
    code: v4(),
    expected_size: 1,
    ...options,
  };
  return Class.create(classData);
}

export async function randomStory(): Promise<Story> {
  return Story.create({
    name: v4(),
    display_name: v4(),
    description: v4(),
  });
}

export async function setupStudentInClasses() {
  const educator = await randomEducator(); 
  const class1 = await randomClassForEducator(educator.id);
  const class2 = await randomClassForEducator(educator.id);
  const student = await randomStudent();
  const sc1 = await StudentsClasses.create({
    student_id: student.id,
    class_id: class1.id,
  });
  const sc2 = await StudentsClasses.create({
    student_id: student.id,
    class_id: class2.id,
  });

  const cleanup = async () => {
    // Sometimes we want to remove the class-student associations during the test
    // In which case we can check whether it exists first
    (await StudentsClasses.findOne({ where: { student_id: student.id, class_id: class1.id } }))?.destroy();
    (await StudentsClasses.findOne({ where: { student_id: student.id, class_id: class2.id } }))?.destroy();
    await class1?.destroy();
    await class2?.destroy();
    await educator?.destroy();
    await student?.destroy();
  };

  return { student, educator, class1, class2, sc1, sc2, cleanup };
}

export async function createRandomClassWithStudents(count: number, educator: Educator | null = null) {
  const nStudents = Math.round(count);

  const edu = educator ?? await randomEducator();
  const cls = await randomClassForEducator(edu.id);

  const students: Student[] = [];
  for (let i = 0; i < nStudents; i++) {
    const student = await randomStudent();
    students.push(student);
    await StudentsClasses.create({ class_id: cls.id, student_id: student.id });
  }

  return { educator: edu, students, class: cls };
}

type ModelKey<T extends Model> = (keyof InferAttributes<T>)[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectToMatchModel<T extends Model>(object: any, expected: T, exclude?: ModelKey<T>): void {
  const json: Partial<InferAttributes<T>> = expected.toJSON();
  exclude?.forEach(key => delete json[key]);

  // We don't import this from @jest/globals because Jest will throw an error if we try to import a Jest global
  // outside of the testing environment
  // But the globals will still be available, so this works

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  expect(object).toMatchObject(json);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expectBodyToMatch(response: Response, expected: any) {
  // We don't import this from @jest/globals because Jest will throw an error if we try to import a Jest global
  // outside of the testing environment
  // But the globals will still be available, so this works

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  expect(response.body).toMatchObject(expected);
}

export function randomBetween(low: number, high: number) {
  return low + Math.random() * (high - low);
}

export function setIntersection<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const element of setA) {
    if (setB.has(element)) {
      result.add(element);
    }
  }
  return result;
}
