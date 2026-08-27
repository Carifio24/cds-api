import { CreationOptional, DataTypes, Sequelize } from "sequelize";
import { BaseTrackingData } from "../../../models/base_tracking_data";

export class WhyRomanData extends BaseTrackingData<WhyRomanData> {
  declare max_andromeda_step: CreationOptional<number>;
  declare zoom_to_pixel_scale_count: CreationOptional<number>;
  declare tour_restarted_count: CreationOptional<number>;
  declare footprints_toggle_count: CreationOptional<JSON>;
}

export function initializeWhyRomanDataModel(sequelize: Sequelize) {
  WhyRomanData.init({
    ...BaseTrackingData.ATTRIBUTES,
    max_andromeda_step: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    footprints_toggle_count: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    zoom_to_pixel_scale_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    tour_restarted_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    }
  }, {
    sequelize,
  });
}
