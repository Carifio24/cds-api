/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import type { InferAttributes, Sequelize } from "sequelize";
import type { Express } from "express";

import { authorize, createTestApp, getTestDatabaseConnection, loadOpenAPISpec, randomEducator } from "./utils";
import { Educator } from "../src/models";
import { v4 } from "uuid";

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

describe("Test educator routes", () => {

  it("Should sign up an educator (minimal info)", async () => {
    const data = {
      first_name: v4(), 
      last_name: v4(),
      password: v4(),
      email: v4(),
      username: v4(),
    };
  
    await authorize(request(testApp).post("/educators/create"))
      .send(data)
      .expect(201)
      .expect("Content-Type", /json/)
      .expect({
        success: true,
        status: "ok",
        educator_info: data,
      })
      .then(res => {
        expect(res).toSatisfyApiSpec();
      });

    const educator = await Educator.findOne({ where: { email: data.email } });
    expect(educator).not.toBeNull();

    await educator?.destroy();
    
  });

  it("Should sign up an educator (full info)", async () => {
    const data = {
      first_name: v4(), 
      last_name: v4(),
      password: v4(),
      email: v4(),
      username: v4(),
      institution: "Test School",
      age: 5,
      gender: "Male",
    };
  
    await authorize(request(testApp).post("/educators/create"))
      .send(data)
      .expect(201)
      .expect("Content-Type", /json/)
      .expect({
        success: true,
        status: "ok",
        educator_info: data,
      })
      .then(res => expect(res).toSatisfyApiSpec());

    const educator = await Educator.findOne({ where: { email: data.email } });
    expect(educator).not.toBeNull();

    await educator?.destroy();
    
  });

  it("Should return the correct educator by ID", async () => {
    const educator = await Educator.create({
      first_name: v4(), 
      last_name: v4(),
      password: v4(),
      email: v4(),
      username: v4(),
      verified: 1,
      verification_code: "abcde",
    });

    const json: Partial<InferAttributes<Educator>> = educator.toJSON();
    // The Sequelize object will return the `CURRENT_TIMESTAMP` literals,
    // not the actual date values
    delete json.profile_created;
    delete json.last_visit;

    await authorize(request(testApp).get(`/educators/${educator.id}`))
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        const resEducator = res.body.educator;
        expect(resEducator).toMatchObject(json);

        // Check that the timestamp fields are present
        expect(resEducator).toHaveProperty("profile_created");
        expect(typeof resEducator.profile_created).toBe("string");
        expect(resEducator).toHaveProperty("last_visit");
        expect(typeof resEducator.last_visit).toBe("string");

        expect(res).toSatisfyApiSpec();
      });

    await educator.destroy();

  });

  it("Should return the correct educator by username", async () => {
    const educator = await randomEducator();

    const json: Partial<InferAttributes<Educator>> = educator.toJSON();
    // The Sequelize object will return the `CURRENT_TIMESTAMP` literals,
    // not the actual date values
    delete json.profile_created;
    delete json.last_visit;

    await authorize(request(testApp).get(`/educators/${educator.username}`))
      .expect(200)
      .expect("Content-Type", /json/)
      .then((res) => {
        const resEducator = res.body.educator;
        expect(resEducator).toMatchObject(json);

        // Check that the timestamp fields are present
        expect(resEducator).toHaveProperty("profile_created");
        expect(typeof resEducator.profile_created).toBe("string");
        expect(resEducator).toHaveProperty("last_visit");
        expect(typeof resEducator.last_visit).toBe("string");

        expect(res).toSatisfyApiSpec();
      });

    await educator.destroy();

  });

});
