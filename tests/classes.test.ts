/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import type { Sequelize } from "sequelize";
import type { Express } from "express";

import { authorize, expectToMatchModel, getTestDatabaseConnection, randomClassForEducator, randomEducator, randomStudent, setupStudentInClasses } from "./utils";
import { setupApp } from "../src/app";
import { createApp } from "../src/server";

import { v4 } from "uuid";
import { Student, StudentsClasses } from "../src/models";

async function setupClassesForEducator() {
  const educator = await randomEducator();
  const class1 = await randomClassForEducator(educator.id, { expected_size: 4 });
  const class2 = await randomClassForEducator(educator.id, { expected_size: 19 });

  const cleanup = () => {
    educator?.destroy();
    class1?.destroy();
    class2?.destroy();
  };

  return { educator, class1, class2, cleanup };
}

describe("Test class routes", () => {

  let testDB: Sequelize;
  let testApp: Express;
  beforeAll(async () => {
    testDB = await getTestDatabaseConnection();
    testApp = createApp(testDB);
    setupApp(testApp, testDB);
  });
  
  afterAll(async () => {
    testDB.close();
  });


  it("Should return the correct classes by code", async () => {
    const { class1, class2, cleanup } = await setupClassesForEducator();
    for (const cls of [class1, class2]) {
      await authorize(request(testApp).get(`/classes/${cls.code}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then((res) => {
          const resCls = res.body.class;
          expectToMatchModel(resCls, cls);
        });
    }
    cleanup();
  });

  it("Should return the correct classes by ID", async () => {
    const { class1, class2, cleanup } = await setupClassesForEducator();
    for (const cls of [class1, class2]) {
      await authorize(request(testApp).get(`/classes/${cls.id}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then((res) => {
          const resCls = res.body.class;
          expectToMatchModel(resCls, cls);
        });
    }
    cleanup();
  });

  it("Should not find a class", async () => {
    const badID = v4();
    await authorize(request(testApp).get(`/classes/${badID}`))
      .expect(404)
      .expect("Content-Type", /json/)
      .then((res) => {
        expect(res.body.class).toBeNull();
      });
  });

  it("Should properly delete the classes by code", async () => {
    const { class1, class2, cleanup } = await setupClassesForEducator();
    for (const cls of [class1, class2]) {
      await authorize(request(testApp).delete(`/classes/${cls.code}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toEqual("Class deleted");
        });
    }
    cleanup();
  });

  it("Should not find a class to delete", async () => {
    const badID = v4();
    await authorize(request(testApp).delete(`/classes/${badID}`))
      .expect(404)
      .expect("Content-Type", /json/)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error).toEqual(`Could not find class with code ${badID}`);
      });
  });

  it("Should return the correct class sizes", async () => {
    const { class1, class2, cleanup } = await setupClassesForEducator();
    const classes = [class1, class2];
    const sizes = [5, 20];
    for (let index = 0; index < 1; index++) {
      const cls = classes[index];
      const size = sizes[index];
      const students: Student[] = [];
      const studentsClasses: StudentsClasses[] = [];
      for (let count = 0; count < size; count++) {
        const student = await randomStudent();
        students.push(student);
        studentsClasses.push(await StudentsClasses.create({ student_id: student.id, class_id: cls.id }));
      }
      await authorize(request(testApp).get(`/classes/size/${cls.id}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then((res) => {
          expect(res.body.class_id).toBe(cls.id);
          expect(res.body.size).toEqual(size);
        });
        for (const sc of studentsClasses) {
          await sc.destroy();
        }
    }
    cleanup();
  });

  it("Should not find a class to get the size of", async () => {
    const badID = v4();
    await authorize(request(testApp).get(`/classes/size/${badID}`))
      .expect(404)
      .expect("Content-Type", /json/)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error).toEqual(`No class found with ID ${badID}`);
      });
  });

  it("Should return the correct expected class sizes", async () => {
    const { class1, class2, cleanup } = await setupClassesForEducator();
    for (const cls of [class1, class2]) {
      await authorize(request(testApp).get(`/classes/size/${cls.id}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then((res) => {
          expect(res.body.class_id).toBe(cls.id);
          expect(res.body.expected_size).toEqual(cls.expected_size);
        });
    }
    cleanup();
  });


  it("Should not find a class to get the expected size of", async () => {
    const badID = v4();
    await authorize(request(testApp).get(`/classes/expected-size/${badID}`))
      .expect(404)
      .expect("Content-Type", /json/)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error).toEqual(`No class found with ID ${badID}`);
      });
  });

  it("Should return the correct class rosters", async () => {
    const { class1, class2, cleanup } = await setupClassesForEducator();
    const classes = [class1, class2];
    const sizes = [5, 20];
    for (let index = 0; index < 1; index++) {
      const cls = classes[index];
      const size = sizes[index];
      const students: Student[] = [];
      const studentsClasses: StudentsClasses[] = [];
      for (let count = 0; count < size; count++) {
        const student = await randomStudent();
        students.push(student);
        studentsClasses.push(await StudentsClasses.create({ student_id: student.id, class_id: cls.id }));
      }
      await authorize(request(testApp).get(`/classes/roster/${cls.id}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then((res) => {
          const resStudents = res.body.students;
          expect(resStudents.length).toBe(size);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          resStudents.forEach((student, index) => {
            expectToMatchModel(student, students[index]);
          });
        });
        for (const sc of studentsClasses) {
          await sc.destroy();
        }
    }
    cleanup();
  });


  it("Should not find a class to get the roster for", async () => {
    const badID = v4();
    await authorize(request(testApp).get(`/classes/roster/${badID}`))
      .expect(404)
      .expect("Content-Type", /json/)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.error).toEqual(`No class found with ID ${badID}`);
      });
  });

});
