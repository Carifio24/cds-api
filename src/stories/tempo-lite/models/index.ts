import { Sequelize } from "sequelize";
import { TempoLiteData, initializeTempoLiteDataModel } from "./tempo_lite_data";

export {
  TempoLiteData,
};

export function initializeModels(db: Sequelize) {
  initializeTempoLiteDataModel(db);
}
