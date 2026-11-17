import { CreationOptional, DataTypes, Sequelize } from "sequelize";
import { BaseTrackingData } from "../../../models/base_tracking_data";

export class VoyagerLightDayData extends BaseTrackingData<VoyagerLightDayData> {
  declare user_guide_time_ms: CreationOptional<number>;
  declare tour_time_ms: CreationOptional<number>;
  declare countdown_time_ms: CreationOptional<number>;
  declare mission_slider_use_count: CreationOptional<number>;
  declare play_clicked_count: CreationOptional<number>;
  declare max_tour_step: CreationOptional<number>;
}

export function initializeVoyagerLightDayDataModel(sequelize: Sequelize) {
  VoyagerLightDayData.init({
    ...BaseTrackingData.ATTRIBUTES,
    user_guide_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    tour_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    countdown_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    mission_slider_use_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    play_clicked_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    max_tour_step: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
  });
}
