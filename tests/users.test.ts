/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import type { Sequelize } from "sequelize";
import type { Express } from "express";

import { authorize, createTestApp, getTestDatabaseConnection, loadOpenAPISpec } from "./utils";

let testDB: Sequelize;
let testApp: Express;
beforeAll(async () => {
  testDB = await getTestDatabaseConnection();
  testApp = await createTestApp(testDB);
  loadOpenAPISpec(testApp);
});

afterAll(() => {
  testDB.close();
});

describe("Test user routes", () => {

  it("Should return all of the users (students + educators)", async () => {
    await authorize(request(testApp).get("/users"))
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        const educators = res.body.educators;
        const students = res.body.students;
        expect(Array.isArray(educators)).toBe(true);
        expect(Array.isArray(students)).toBe(true);
        expect(res).toSatisfyApiSpec();
      });
  });

});
