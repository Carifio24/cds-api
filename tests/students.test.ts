/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import type { InferAttributes, Sequelize } from "sequelize";
import type { Express } from "express";

import { authorize, createTestApp, getTestDatabaseConnection, randomStory, randomStudent, setupStudentInClasses } from "./utils";
import { Class, IgnoreStudent, Student, StudentsClasses } from "../src/models";
import { v4 } from "uuid";

let testDB: Sequelize;
let testApp: Express;
beforeAll(async () => {
  testDB = await getTestDatabaseConnection();
  testApp = createTestApp(testDB);
});

afterAll(() => {
  testDB.close();
});

describe("Test student routes", () => {

  it("Should sign up a student", async () => {
    const data = {
      email: v4(),
      username: v4(),
      password: v4(),
      verification_code: v4(),
    };

    await authorize(request(testApp).post("/students/create"))
      .send(data)
      .expect(201)
      .expect("Content-Type", /json/)
      .expect({
        success: true,
        status: "ok",
        student_info: data,
      });

    const student = await Student.findOne({ where: { username: data.username } });
    expect(student).not.toBeNull();

    await student?.destroy();

  });

  it("Should return the correct student by ID", async () => {
    const student = await Student.create({
      email: v4(),
      username: v4(),
      password: v4(),
      verification_code: v4(),
      verified: 0,
    });

    const json: Partial<InferAttributes<Student>> = student.toJSON();
    // The Sequelize object will return the `CURRENT_TIMESTAMP` literals,
    // not the actual date values
    delete json.profile_created;
    delete json.last_visit;
    await authorize(request(testApp).get(`/students/${student.id}`))
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        const resStudent = res.body.student;
        expect(resStudent).toMatchObject(json);

        // Check that the timestamp fields are present
        expect(resStudent).toHaveProperty("profile_created");
        expect(typeof resStudent.profile_created).toBe("string");
        expect(resStudent).toHaveProperty("last_visit");
        expect(typeof resStudent.last_visit).toBe("string");
      });

    await student.destroy();
  });

  it("Should return the correct student by username", async () => {
    const student = await Student.create({
      email: v4(),
      username: v4(),
      password: v4(),
      verification_code: v4(),
      verified: 0,
    });

    const json: Partial<InferAttributes<Student>> = student.toJSON();
    // The Sequelize object will return the `CURRENT_TIMESTAMP` literals,
    // not the actual date values
    delete json.profile_created;
    delete json.last_visit;
    await authorize(request(testApp).get(`/students/${student.username}`))
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        const resStudent = res.body.student;
        expect(resStudent).toMatchObject(json);

        // Check that the timestamp fields are present
        expect(resStudent).toHaveProperty("profile_created");
        expect(typeof resStudent.profile_created).toBe("string");
        expect(resStudent).toHaveProperty("last_visit");
        expect(typeof resStudent.last_visit).toBe("string");
      });

    await student.destroy();
  });

  it("Should return the correct classes", async () => {

    const { student, educator, class1, class2, cleanup } = await setupStudentInClasses();

    await authorize(request(testApp).get(`/students/${student.id}/classes`))
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        expect(res.body.student_id).toBe(student.id);
        const classes = res.body.classes;
        expect(classes.length).toBe(2);

        expect(classes.map((cls: Class) => cls.id)).toEqual([class1.id, class2.id]);
        expect(classes.map((cls: Class) => cls.name)).toEqual([class1.name, class2.name]);
        expect(classes.every((cls: Class) => cls.educator_id === educator.id));
      });

    await cleanup();
  });

  it("Should properly delete student-class associations", async () => {
    const { student, class1, class2, cleanup } = await setupStudentInClasses();

    await authorize(request(testApp).delete(`/students/${student.id}/classes/${class1.id}`))
      .expect(204);
    
    expect(await StudentsClasses.findOne({ where: { student_id: student.id, class_id: class1.id } })).toBeNull();

    await authorize(request(testApp).delete(`/students/${student.id}/classes/${class2.id}`))
      .expect(204);

    expect(await StudentsClasses.findOne({ where: { student_id: student.id, class_id: class2.id } })).toBeNull();

    await authorize(request(testApp).delete(`/students/${student.id}/classes/-1`))
      .expect(404);

    await cleanup();

  });

  it("Should properly ignore and un-ignore a student", async () => {
    const student = await randomStudent();
    const story = await randomStory();

    async function getIgnore() {
      return IgnoreStudent.findOne({
        where: {
          student_id: student.id,
          story_name: story.name,
        }
      });
    }

    function setIgnored(ignore: boolean) {
      return authorize(request(testApp).put(`/students/ignore/${student.id}/${story.name}`))
        .send({ ignore });
    }

    await setIgnored(true)
      .expect(200)
      .expect({
        message: `Successfully ignored student ${student.id} for story ${story.name}`,
      });

    expect(await getIgnore()).not.toBeNull();

    await setIgnored(true)
      .expect(200)
      .expect({
        message: `Student ${student.id} was already ignored for story ${story.name}`,
      });

    expect(await getIgnore()).not.toBeNull();

    await setIgnored(false)
      .expect(200)
      .expect({
        message: `Successfully unignored student ${student.id} for story ${story.name}`,
      });

    expect(await getIgnore()).toBeNull();

    await setIgnored(false)
      .expect(200)
      .expect({
        message: `Student ${student.id} was already not ignored for story ${story.name}`,
      });

    expect(await getIgnore()).toBeNull();
  });

  it("Should properly handle invalid ignore student requests", async () => {

    const badID = -1;
    const badStory = v4();
    await authorize(request(testApp).put(`/students/ignore/${badID}/${badStory}`))
      .expect(404)
      .expect({
        error: `No student found for identifier ${badID}`,
      });

    const student = await randomStudent();
    await authorize(request(testApp).put(`/students/ignore/${student.username}/${badStory}`))
      .expect(404)
      .expect({
        error: `No story found with name ${badStory}`,
      });

    const story = await randomStory();
    await authorize(request(testApp).put(`/students/ignore/${student.username}/${story.name}`))
      .send({ bogusKey: true })
      .expect(400)
      .expect({
        error: "Invalid request body; should have form { ignore: <boolean> }",
      });

    await student.destroy();
    await story.destroy();
  });

});
