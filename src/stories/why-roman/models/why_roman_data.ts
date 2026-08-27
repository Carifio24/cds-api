import { CreationOptional, DataTypes, Sequelize } from "sequelize";
import { BaseTrackingData } from "../../../models/base_tracking_data";

export class WhyRomanData extends BaseTrackingData<WhyRomanData> {
  declare max_andromeda_step: CreationOptional<number>;
  declare zoom_to_pixel_scale_count: CreationOptional<number>;
  declare tour_restarted_count: CreationOptional<number>;
  declare side_controls_opened_count: CreationOptional<number>;
  declare about_roman_time_ms: CreationOptional<number>;
  declare user_guide_time_ms: CreationOptional<number>;
  declare control_time_open_ms: CreationOptional<number>;
  declare slider_min_press_count: CreationOptional<number>;
  declare slider_max_press_count: CreationOptional<number>;
  declare slider_label_press_count: CreationOptional<number>;
  declare slider_move_count: CreationOptional<number>;
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
    },
    side_controls_opened_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    about_roman_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    user_guide_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    control_time_open_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    slider_min_press_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    slider_max_press_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    slider_label_press_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    slider_move_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
  });
}
