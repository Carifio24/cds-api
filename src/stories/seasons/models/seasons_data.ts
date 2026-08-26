import { Sequelize, DataTypes, CreationOptional } from "sequelize";
import { ModelBase } from "../../../utils";

export class SeasonsData extends ModelBase<SeasonsData> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare user_selected_dates: CreationOptional<string[]>;
  declare user_selected_dates_count: CreationOptional<number>;
  declare user_selected_locations: CreationOptional<[number, number][]>;
  declare user_selected_locations_count: CreationOptional<number>;
  declare how_to_use_time_ms: CreationOptional<number>;
  declare what_to_explore_time_ms: CreationOptional<number>;
  declare aha_moment_responses: CreationOptional<string[]>;
  declare last_updated: CreationOptional<Date>;
  declare app_time_ms: CreationOptional<number>;
  declare wwt_time_reset_count: CreationOptional<number>;
  declare wwt_reverse_count: CreationOptional<number>;
  declare wwt_play_pause_count: CreationOptional<number>;
  declare wwt_speedups: CreationOptional<number[]>;
  declare wwt_slowdowns: CreationOptional<number[]>;
  declare wwt_start_stop_times: CreationOptional<[number, number][]>;
  declare time_slider_used_count: CreationOptional<number>;
  declare created: CreationOptional<Date>;
  declare events: CreationOptional<string[]>;
}

export function initializeSeasonsDataModel(sequelize: Sequelize) {
  SeasonsData.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_uuid: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    app_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    user_selected_dates: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    user_selected_dates_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    user_selected_locations: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    user_selected_locations_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    how_to_use_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    what_to_explore_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    aha_moment_responses: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    time_slider_used_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      allowNull: false,
    },
    wwt_time_reset_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    wwt_reverse_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    wwt_play_pause_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    wwt_speedups: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    wwt_slowdowns: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    wwt_start_stop_times: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    events: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  }, {
    sequelize,
  });
}
