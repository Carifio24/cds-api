import type { Sequelize } from "sequelize";
import type { Express } from "express";
import { storyRouter } from "../../story_router";
import { getAllWhyRomanData, getWhyRomanData, updateWhyRomanData  } from "./database";

export function setup(_app: Express, db: Sequelize) {
}

export const router = storyRouter({
  storyName: "why-roman",
  userExperience: true,
  dataTracking: {
  },
});l
