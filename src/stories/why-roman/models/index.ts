import type { Sequelize } from "sequelize";
import { WhyRomanData, initializeWhyRomanDataModel } from "./why_roman_data";

export {
  WhyRomanData,
};

export function initializeModels(db: Sequelize) {
  initializeWhyRomanDataModel(db);
}
