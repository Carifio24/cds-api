import type { Sequelize } from "sequelize";
import { RomanFirstImagesData, initializeRomanFirstImagesDataModel } from "./roman_first_images_data";

export {
  RomanFirstImagesData,
};

export function initializeModels(db: Sequelize) {
  initializeRomanFirstImagesDataModel(db);
}
