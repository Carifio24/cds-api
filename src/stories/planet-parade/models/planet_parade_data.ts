import { Sequelize, DataTypes, CreationOptional } from "sequelize";
import { ModelBase } from "../../../utils";

export class PlanetParadeData extends ModelBase<PlanetParadeData> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare user_selected_search_locations: [number, number][];
  declare user_selected_search_locations_count: number;
  declare user_selected_map_locations: [number, number][];
  declare user_selected_map_locations_count: number;
  declare app_time_ms: CreationOptional<number>;
  declare info_time_ms: CreationOptional<number>;
  declare video_time_ms: CreationOptional<number>;
  declare video_opened: CreationOptional<boolean>;
  declare video_played: CreationOptional<boolean>;
  declare created: CreationOptional<Date>;
  declare last_updated: CreationOptional<Date>;
  declare wwt_time_reset_count: CreationOptional<number>;
  declare wwt_reverse_count: CreationOptional<number>;
  declare wwt_play_pause_count: CreationOptional<number>;
  declare wwt_speedups: CreationOptional<number[]>;
  declare wwt_slowdowns: CreationOptional<number[]>;
  declare wwt_rate_selections: CreationOptional<number[]>;
  declare wwt_start_stop_times: CreationOptional<[number, number][]>;
}

export function initializePlanetParadeDataModel(sequelize: Sequelize) {
  PlanetParadeData.init({
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
    user_selected_search_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    user_selected_search_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_selected_map_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    user_selected_map_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    app_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    info_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    video_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    video_opened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    video_played: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
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
      defaultValue: "[]",
    },
    wwt_slowdowns: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: "[]",
    },
    wwt_rate_selections: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: "[]",
    },
    wwt_start_stop_times: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: "[]",
    },
  }, {
    sequelize,
  });
}
