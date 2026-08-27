import type { Sequelize } from "sequelize";
import type { Express } from "express";
import { storyRouter } from "../../story_router";
import { WhyRomanData, initializeModels } from "./models";
import { WhyRomanUpdate, WhyRomanUpdateT } from "./database";
import { getWhyRomanData, submitWhyRomanData, updateWhyRomanData } from "./database";

export function setup(_app: Express, db: Sequelize) {
  initializeModels(db);
}

export const router = storyRouter<WhyRomanData, WhyRomanUpdateT>({
  storyName: "why-roman",
  userExperience: true,
  dataTracking: {
    model: WhyRomanData,
    updateSchema: WhyRomanUpdate,
    getter: getWhyRomanData,
    updater: updateWhyRomanData,
    submitter: submitWhyRomanData,
  },
});
