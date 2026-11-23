import { Sequelize } from "sequelize";
import { BaseTrackingData } from "../../../models/base_tracking_data";

export class RomanFirstLookData extends BaseTrackingData<RomanFirstLookData> {}

export function initializeRomanFirstLookDataModel(sequelize: Sequelize) {
  RomanFirstLookData.init({
    ...BaseTrackingData.ATTRIBUTES,
  }, {
    sequelize,
  });
}
