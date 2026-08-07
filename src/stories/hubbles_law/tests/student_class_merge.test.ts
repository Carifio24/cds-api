/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, beforeEach, describe, it, expect } from "@jest/globals";
import request, { Response } from "supertest";
import type { Express } from "express";
import { Op, type Sequelize } from "sequelize";

import { authorize, createTestApp, getTestDatabaseConnection, createRandomClassWithStudents, loadOpenAPISpec, randomStudent, randomBetween, randomClassForEducator, expectToMatchModel } from "../../../../tests/utils";
import { HubbleClassStudentMerge } from "../models/hubble_class_student_merges";
import { globalRoutePath, createRandomHubbleDataForStudent, createRandomHubbleMeasurementForStudent, createRandomGalaxies } from "./utils";
import { Class, ClassStories, Educator, IgnoreStudent, Student } from "../../../models";
import { HubbleMeasurement, HubbleStudentData } from "../models";
import { addStudentToClass, findClassByIdOrCode } from "../../../database";
import { mergeStudentIntoClass } from "../database";
import { CreateClassResult } from "../../../request_results";
import { BASE_PATH } from "../router";


describe("Test student/class merge functionality", () => {
  let testDB: Sequelize;
  let testApp: Express;
  const nGalaxies = 30;
  const classSize = 20;
  const mergedCount = 12;
  const nonMergedCount = 3;
  const totalStudentCount = classSize + mergedCount + nonMergedCount;
  let students: Student[];
  let studentsToMerge: Student[];
  let studentsToNotMerge: Student[];
  let cls: Class;
  let educator: Educator;

  beforeAll(async () => {
    testDB = await getTestDatabaseConnection();
    testApp = await createTestApp(testDB);
    for (const model of Object.values(testDB.models)) {
      await model.sync();
    }
    loadOpenAPISpec(testApp, `${BASE_PATH}/docs.json`);
  });
  
  afterAll(async () => {
    await testDB.close();
  });


  beforeEach(async () => {
    // const { educator, students: createdStudents, class: cls } = await createRandomClassWithStudents(classSize);
    const results = await createRandomClassWithStudents(classSize);
    students = results.students;
    educator = results.educator;
    cls = results.class;

    if (educator == null) {
      throw new Error("Educator should not be null");
    }

    const otherClass = await randomClassForEducator(educator.id);

    // Sign the classes up for the Hubble's Law story
    await ClassStories.create({ class_id: cls.id, story_name: "hubbles_law" });
    await ClassStories.create({ class_id: otherClass.id, story_name: "hubbles_law" });

    studentsToMerge = [];
    studentsToNotMerge = [];
    for (let i = 0; i < mergedCount + nonMergedCount; i++) {
      const student = await randomStudent();
      await addStudentToClass(student.id, otherClass.id);
      const merge = i < mergedCount;
      const arr = merge ? studentsToMerge : studentsToNotMerge;
      arr.push(student);
      if (merge) {
        await mergeStudentIntoClass(student.id, cls.id);
      }
    }
    const galaxies = await createRandomGalaxies(nGalaxies);

    for (const arr of [students, studentsToMerge, studentsToNotMerge]) {
      for (const student of arr) {
        const measuredIDs = new Set<number>();
        for (let i = 0; i < 5; i++) {
          let idx = -1;
          do {
            idx = Math.floor(randomBetween(0, nGalaxies));
          } while (measuredIDs.has(idx));
          measuredIDs.add(idx);
          await createRandomHubbleMeasurementForStudent(student.id, galaxies[idx].id);
        }
        await createRandomHubbleDataForStudent(student.id).catch(err => console.error(err));
      }
    }
  });

  it("Should test the 'all data' results", async () => {
    const route = globalRoutePath("/all-data");
    await authorize(request(testApp).get(route))
      .expect(200)
      .expect("Content-Type", /json/)
      .then(async (res) => {
        const body = res.body;

        const measurements = body.measurements as HubbleMeasurement[];
        expect(measurements.length).toEqual(5 * totalStudentCount);

        const allStudents = students.concat(studentsToMerge).concat(studentsToNotMerge);

        const measurementIDs = new Set(measurements.map(meas => meas.student_id));
        expect(measurementIDs).toEqual(new Set(allStudents.map(student => student.id)));

        const studentData = body.studentData as HubbleStudentData[];

        // We need to include the merged students twice each
        expect(studentData.length).toEqual(totalStudentCount + mergedCount);

        expect(res).toSatisfyApiSpec();
      });
  });

  it("Should test a student's class measurements", async () => {
    const student = students[0];
    const ignore = await IgnoreStudent.create({
      student_id: student.id,
      story_name: "hubbles_law",
    });
    const route = globalRoutePath(`/class-measurements/${student.id}/${cls.id}`);
    await authorize(request(testApp).get(route))
      .expect(200)
      .expect("Content-Type", /json/)
      .then(async (res: Response) => {
        const body = res.body;
        expect(body.class_id).toEqual(cls.id);

        const measurements = body.measurements as HubbleMeasurement[];
        expect(measurements.length).toEqual(5 * (mergedCount + classSize - 1));

        const measurementIDs = new Set(measurements.map(meas => meas.student_id));

        const expectedStudents = students.concat(studentsToMerge);
        const index = expectedStudents.findIndex(stu => stu.id == student.id);
        expect(index).toBeGreaterThan(-1);
        expectedStudents.splice(index, 1);
        const expectedIDs = new Set(expectedStudents.map(student => student.id));
        expect(measurementIDs).toEqual(expectedIDs);

        expect(res).toSatisfyApiSpec();
      });

    ignore.destroy();
  });

  it("Should correctly set up a class for Hubble, with and without padding", async () => {
    const route = "/classes/create";

    const baseClassData = {
      educator_id: educator.id,
      name: "Hubble Setup Test Class",
      expected_size: 10,
      asynchronous: false,
      story_name: "hubbles_law",
      options: { pad: true },
    };

    for (const pad of [true, false]) {
      const classData = { ...baseClassData, options: { pad } };

      let classCode: string = "";
      await authorize(request(testApp).post(route))
        .send(classData)
        .expect(201)
        .expect("Content-Type", /json/)
        .then(async (res) => {
          const body = res.body;
          expect(body.success).toEqual(true),
          expect(body.status).toEqual(CreateClassResult.Ok);

          const classInfo = body.class_info;
          expect(classInfo.options.pad).toEqual(pad);
          expect(typeof classInfo.code).toBe("string");
          
          classCode = classInfo.code;

          expect(res).toSatisfyApiSpec();
        });

      const testClass = await findClassByIdOrCode(classCode);
      expect(testClass).not.toBeNull();

      const mergedStudentsForClass = await HubbleClassStudentMerge.findAll({ where: { class_id: testClass!.id } }); 
      const expectedCount = pad ? 12 : 0;
      expect(mergedStudentsForClass.length).toEqual(expectedCount);
    }
  });

  it("Should correctly pad a class with the correct number of students", async () => {
    // Create some new students for padding purposes
    const students = [];
    for (let i = 0; i < 10; i++) {
      const student = await randomStudent();
      students.push(student);
    }
    const studentIDs = students.map(stu => stu.id);

    const desiredMergeCount = 17;
    const route = globalRoutePath("/merge-students");
    const data = {
      class_id: cls.id,
      desired_merge_count: desiredMergeCount,
    };
    await authorize(request(testApp).put(route))
      .send(data)
      .expect(200)
      .expect("Content-Type", /json/)
      .then(res => expect(res).toSatisfyApiSpec());

    let updatedMergeCount = await HubbleClassStudentMerge.count({ where: { class_id: cls.id } });
    expect(updatedMergeCount).toBe(desiredMergeCount);

    // If we do this again, things should remain the same
    await authorize(request(testApp).put(route))
      .send(data)
      .expect(200)
      .expect("Content-Type", /json/)
      .then(res => expect(res).toSatisfyApiSpec());

    updatedMergeCount = await HubbleClassStudentMerge.count({ where: { class_id: cls.id } });
    expect(updatedMergeCount).toBe(desiredMergeCount);

    await HubbleClassStudentMerge.destroy({ where: { student_id: { [Op.in]: studentIDs } } });
  });

  it("Should return the list of student IDs merged into a given class", async () => {
    const route = globalRoutePath(`/merge-students/${cls.id}`);

    await authorize(request(testApp).get(route))
      .expect(200)
      .expect("Content-Type", /json/)
      .then(async res => {
        const body = res.body;
        const mergedStudentIDs = body.students;
        expect(Array.isArray(mergedStudentIDs)).toEqual(true);
        expect(mergedStudentIDs.length).toEqual(mergedCount);

        expect(mergedStudentIDs.sort()).toEqual(studentsToMerge.map(student => student.id).sort());

        expect(res).toSatisfyApiSpec();
      });
  });

  it("Should return the list of student JSON merged into a given class", async () => {

    const route = globalRoutePath(`/merge-students/${cls.id}?full=true`);
    await authorize(request(testApp).get(route))
      .expect(200)
      .expect("Content-Type", /json/)
      .then(async res => {
        const body = res.body;
        const mergedStudents = body.students;
        expect(Array.isArray(mergedStudents)).toEqual(true);
        expect(mergedStudents.length).toEqual(mergedCount);

        const studentsComparator = (s1: Student, s2: Student) => s1.id - s2.id;
        mergedStudents.sort(studentsComparator);
        for (let i = 0; i < mergedCount; i++) {
          expectToMatchModel(mergedStudents[i], studentsToMerge[i], ["profile_created", "last_visit"]);
        }

        expect(res).toSatisfyApiSpec();
      });
  });

  it("Should return a 404 if requesting merge students or a class that doesn't exist", async () => {
    const badID = -1;
    const route = globalRoutePath(`/merge-students/${badID}`);
    await authorize(request(testApp).get(route))
      .expect(404)
      .expect("Content-Type", /json/)
      .then(res => {
        const error = res.body.error;
        expect(typeof error).toEqual("string");
        expect(error).toEqual(`No class exists with ID ${badID}`);

        expect(res).toSatisfyApiSpec();
      });
  });

  it("Should return a 422 if the class hasn't been signed up for Hubble's Law", async () => {
    const data = await createRandomClassWithStudents(classSize);
    const cls = data.class;
    const route = globalRoutePath(`/merge-students/${cls.id}`);
    await authorize(request(testApp).get(route))
      .expect(422)
      .expect("Content-Type", /json/)
      .then(res => {
        const error = res.body.error;
        expect(typeof error).toEqual("string");
        expect(error).toEqual(`The class with ID ${cls.id} is not signed up for Hubble's Law`);

        expect(res).toSatisfyApiSpec();
      });

  });

});
