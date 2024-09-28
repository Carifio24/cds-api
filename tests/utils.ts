import type { Express } from "express";
import type { Server } from "http";
import type { Test } from "supertest";
import { Sequelize } from "sequelize";

import { setUpAssociations } from "../src/associations";
import { initializeModels } from "../src/models";
import { createApp } from "../src/server";
import { APIKey } from "../src/models/api_key";
import { config } from "dotenv";
import { getDatabaseConnection } from "../src/database";
import { createConnection, Connection } from "mysql2/promise";

export function authorize(request: Test): Test {
  return request.set({ Authorization: process.env.CDS_API_KEY });
}

export async function createMySQLConnection(): Promise<Connection> {
  return createConnection({
    host: process.env.DB_HOSTNAME as string,
    user: process.env.DB_USERNAME as string,
    password: process.env.DB_PASSWORD as string,
  });
}

export async function setupTestDatabase(): Promise<Sequelize> {
  config();
  const username = process.env.DB_USERNAME as string;
  const password = process.env.DB_PASSWORD as string;
  const connection = await createMySQLConnection();
  await connection.query("CREATE DATABASE IF NOT EXISTS test;");
  const db = getDatabaseConnection({
    dbName: "test",
    username,
    password,
  });
  await db.query("USE test;");
  initializeModels(db);
  setUpAssociations();

  // We need to close when the connection terminates!
  // See https://github.com/sequelize/sequelize/issues/7953
  // and https://stackoverflow.com/a/45114507
  // db.sync({ force: true, match: /test/ }).finally(() => db.close());
  await addTestData();

  return db;
}

export async function addAPIKey(): Promise<APIKey | void> {
  // Set up some basic data that we're going to want
  await APIKey.sync({ force: true });
  return APIKey.create({
    hashed_key: process.env.HASHED_API_KEY as string,
    client: "Tests",
  });
}

export async function addTestData() {
  await addAPIKey();
}

export function createTestApp(db: Sequelize): Express {
  return createApp(db);
}

export function runApp(app: Express, port=8080, callback?: () => void): Server {
  return app.listen(port, callback);
}
