import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class SolarEclipse2024Data extends Model<InferAttributes<SolarEclipse2024Data>, InferCreationAttributes<SolarEclipse2024Data>> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare user_selected_locations: [number, number][];
  declare user_selected_locations_count: number;
  declare cloud_cover_selected_locations: [number, number][];
  declare cloud_cover_selected_locations_count: number;
  declare text_search_selected_locations: [number, number][];
  declare text_search_selected_locations_count: number;
  declare advanced_weather_selected_locations_count: number;
  declare info_time_ms: CreationOptional<number>;
  declare app_time_ms: CreationOptional<number>;
  declare advanced_weather_time_ms: CreationOptional<number>;
  declare weather_info_time_ms: CreationOptional<number>;
  declare user_guide_time_ms: CreationOptional<number>;
  declare eclipse_timer_time_ms: CreationOptional<number>;
  declare forecast_info_time_ms: CreationOptional<number>;
  declare timestamp: CreationOptional<Date>;
}

export function initializeSolarEclipse2024DataModel(sequelize: Sequelize) {
  SolarEclipse2024Data.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    user_uuid: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    user_selected_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    user_selected_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cloud_cover_selected_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    cloud_cover_selected_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text_search_selected_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    text_search_selected_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    advanced_weather_selected_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    info_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    app_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    advanced_weather_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    weather_info_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    user_guide_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    eclipse_timer_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    forecast_info_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    sequelize,
  });
}
