import type { Sequelize } from "sequelize";
import { RomanFirstLookData, initializeRomanFirstLookDataModel } from "./roman_first_look_data";

export {
  RomanFirstLookData,
};

export function initializeModels(db: Sequelize) {
  initializeRomanFirstLookDataModel(db);
}
