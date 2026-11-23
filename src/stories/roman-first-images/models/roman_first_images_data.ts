import { Sequelize } from "sequelize";
import { BaseTrackingData } from "../../../models/base_tracking_data";

export class RomanFirstImagesData extends BaseTrackingData<RomanFirstImagesData> {}

export function initializeRomanFirstImagesDataModel(sequelize: Sequelize) {
  RomanFirstImagesData.init({
    ...BaseTrackingData.ATTRIBUTES,
  }, {
    sequelize,
  });
}
