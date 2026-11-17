import type { Sequelize } from "sequelize";
import { VoyagerLightDayData, initializeVoyagerLightDayDataModel } from "./voyager_light_day_data";

export {
  VoyagerLightDayData,
};

export function initializeModels(db: Sequelize) {
  initializeVoyagerLightDayDataModel(db);
}
