import { CreationOptional, DataTypes, Sequelize } from "sequelize";
import { BaseTrackingData } from "../../../models/base_tracking_data";

export class WhyRomanData extends BaseTrackingData<WhyRomanData> {
  declare max_andromeda_step: CreationOptional<number>;
  declare scales_selected: CreationOptional<[string, number][]>;
  declare tour_restarted_count: CreationOptional<number>;
}

export function initializeWhyRomanDataModel(sequelize: Sequelize) {
  WhyRomanData.init({
    ...BaseTrackingData.ATTRIBUTES,
    max_andromeda_step: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    scales_selected: {
      type: DataTypes.JSON,
      defaultValue: [],
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
