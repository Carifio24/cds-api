/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, beforeEach, describe, it, expect } from "@jest/globals";
import type { Express } from "express";
import type { Sequelize } from "sequelize";
import request, { Response } from "supertest";
import { authorize, createRandomClassWithStudents, createTestApp, getTestDatabaseConnection, loadOpenAPISpec, randomBetween, randomClassForEducator, randomStudent } from "../../../../tests/utils";

import { Class, Educator, Student } from "../../../models";
import { createRandomGalaxies, createRandomHubbleMeasurementForStudent, createRandomHubbleDataForStudent, globalRoutePath } from "./utils";
import { addStudentToClass } from "../../../database";
import { HubbleMeasurement } from "../models";
import { BASE_PATH } from "../router";

describe("Test student IDs query parameter for class data", () => {
  let testDB: Sequelize;
  let testApp: Express;
  const classSize = 20;
  const nGalaxies = 30;
  const otherStudentsCount = 7;
  let classStudents: Student[];
  let otherStudents: Student[];
  let cls: Class;
  let educator: Educator;

  beforeAll(async() => {
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
    const results = await createRandomClassWithStudents(classSize);
    classStudents = results.students;
    educator = results.educator;
    cls = results.class;

    if (educator === null) {
      throw new Error("Educator should not be null");
    }

    const otherClass = await randomClassForEducator(educator.id);
    otherStudents = [];
    for (let i = 0; i < otherStudentsCount; i++) {
      const student = await randomStudent();
      await addStudentToClass(student.id, otherClass.id);
      otherStudents.push(student);
    }

    const galaxies = await createRandomGalaxies(nGalaxies);
    for (const arr of [classStudents, otherStudents]) {
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

  it("Should give the correct measurements when student IDs are or are not specified", async () => {
    const student = classStudents[0];
    const routes = [
      `/class-measurements/${student.id}`,
      `/class-measurements/${student.id}/${cls.id}`,
      `/stage-3-measurements/${student.id}`,
      `/stage-3-data/${student.id}/${cls.id}`,
    ].map(rt => globalRoutePath(rt));

    const studentIDsCount = 10;
    const allStudents = classStudents.concat(otherStudents);
    const indices = new Set<number>();
    while (indices.size < studentIDsCount) {
      const maybeNew = Math.floor(randomBetween(0, allStudents.length - 1));
      indices.add(maybeNew);
    }

    const studentIDs = [...indices].map(idx => allStudents[idx].id);
    const studentIDsQueryString = studentIDs.join(",");

    for (const route of routes) {

      await authorize(request(testApp).get(route))
        .expect(200)
        .expect("Content-Type", /json/)
        .then(async (res: Response) => {
          const body = res.body;

          const measurements = body.measurements as HubbleMeasurement[];
          expect(measurements.length).toEqual(5 * classStudents.length);

          const measurementIDs = new Set(measurements.map(meas => meas.student_id));
          expect(measurementIDs).toEqual(new Set(classStudents.map(student => student.id)));
        });

      await authorize(request(testApp).get(`${route}?student_ids=${studentIDsQueryString}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then(async (res) => {
          const body = res.body;

          const measurements = body.measurements as HubbleMeasurement[];
          expect(measurements.length).toEqual(5 * studentIDsCount);

          const measurementIDs = new Set(measurements.map(meas => meas.student_id));
          expect(measurementIDs).toEqual(new Set(studentIDs));
        });
    }
  });
});
