import { Express } from "express";
import request from "supertest";
import { Sequelize } from "sequelize";

import { setUpAssociations } from "../src/associations";
import { initializeModels } from "../src/models";
import { createApp } from "../src/server";

export function authorizedRequest(app: Express) {
  return request(app)
    .set("Authorization", process.env.CDS_API_KEY);
}

// Just a pass-through for now
// Maybe we'll add more in the future
export function unauthorizedRequest(app: Express) {
  return request(app);
}

function createTestDatabase(): Sequelize {
  const db = new Sequelize({ dialect: "mysql" });
  db.query("CREATE DATABASE IF NOT EXISTS test");

  initializeModels(db);
  setUpAssociations();
  return db;
}

export function runApp(app: Express, port=8080) {
  app.listen(port);
}

const testDB = createTestDatabase();
console.log(testDB);
const app = createApp(testDB);

export default app;
