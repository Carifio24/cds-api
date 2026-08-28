import type { Sequelize } from "sequelize";
import type { Express } from "express";
import { storyRouter } from "../../story_router";
import { WhyRomanData, initializeModels } from "./models";
import { getWhyRomanData, submitWhyRomanData, updateWhyRomanData } from "./database";

export function setup(_app: Express, db: Sequelize) {
  initializeModels(db);
}

export function router() {
 return storyRouter<WhyRomanData>({
    storyName: "why-roman",
    userExperience: true,
    dataTracking: {
      model: WhyRomanData,
      getter: getWhyRomanData,
      updater: updateWhyRomanData,
      submitter: submitWhyRomanData,
    },
  });
}
