import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { Express } from "express";
import { Sequelize } from "sequelize";

import { initializeModels } from "./models";

import { storyRouter } from "../../story_router";

export const router = storyRouter("solar-eclipse-2026");

export function setup(_app: Express, db: Sequelize) {
    initializeModels(db);
}
