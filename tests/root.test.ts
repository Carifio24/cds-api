/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import type { Express } from "express";
import type { Sequelize } from "sequelize";

import { authorize, createTestApp, getTestDatabaseConnection, loadOpenAPISpec } from "./utils";

let testDB: Sequelize;
let testApp: Express;
beforeAll(async () => {
  testDB = await getTestDatabaseConnection();
  testApp = await createTestApp(testDB);
  await loadOpenAPISpec(testApp); 
});

afterAll(() => {
  testDB.close();
});

describe("Test root route", () => {

  it("Should show a welcome message + warning", async () => {
    authorize(request(testApp).get("/"))
      .expect(200)
      .expect("Content-Type", /json/)
      .expect({ message: "Welcome to the CosmicDS server! You'll need to include a valid API key with your requests in order to access other endpoints." })
      .then(res => expect(res).toSatisfyApiSpec());
  });

  it("Should show a welcome message", async () => {
    authorize(request(testApp).get("/"))
      .expect(200)
      .expect("Content-Type", /json/)
      .expect({ message: "Welcome to the CosmicDS server!" })
      .then(res => expect(res).toSatisfyApiSpec());
  }, 10_000);
});
