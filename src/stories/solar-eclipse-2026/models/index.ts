import { Sequelize } from "sequelize";
import { SolarEclipse2026Data, initializeSolarEclipse2026DataModel } from "./eclipse_data";

export {
  SolarEclipse2026Data,
};

export function initializeModels(db: Sequelize) {
  initializeSolarEclipse2026DataModel(db);
}
