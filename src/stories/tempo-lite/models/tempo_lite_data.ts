import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class TempoLiteData extends Model<InferAttributes<TempoLiteData>, InferCreationAttributes<TempoLiteData>> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare user_selected_calendar_dates: CreationOptional<number[]>;
  declare user_selected_calendar_dates_count: CreationOptional<number>;
  declare user_selected_timezones: CreationOptional<string[]>;
  declare user_selected_timezones_count: CreationOptional<number>;
  declare user_selected_locations: CreationOptional<string[]>;
  declare user_selected_locations_count: CreationOptional<number>;
  declare user_selected_notable_events: CreationOptional<[string, string][]>;
  declare user_selected_notable_events_count: CreationOptional<number>;
  declare whats_new_opened_count: CreationOptional<number>;
  declare whats_new_open_time_ms: CreationOptional<number>;
  declare introduction_opened_count: CreationOptional<number>;
  declare introduction_open_time_ms: CreationOptional<number>;
  declare user_guide_opened_count: CreationOptional<number>;
  declare user_guide_open_time_ms: CreationOptional<number>;
  declare about_data_opened_count: CreationOptional<number>;
  declare about_data_open_time_ms: CreationOptional<number>;
  declare credits_opened_count: CreationOptional<number>;
  declare credits_open_time_ms: CreationOptional<number>;
  declare share_button_clicked_count: CreationOptional<number>;
  declare last_updated: CreationOptional<Date>;
}

export function initializeTempoLiteDataModel(sequelize: Sequelize) {
  TempoLiteData.init({
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
    user_selected_calendar_dates: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    user_selected_calendar_dates_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    user_selected_timezones: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    user_selected_timezones_count: {
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
    user_selected_notable_events: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    user_selected_notable_events_count: {
      type: DataTypes.JSON,
      defaultValue: 0,
    },
    whats_new_opened_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    whats_new_open_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    introduction_opened_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    introduction_open_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    user_guide_opened_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    user_guide_open_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    about_data_opened_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    about_data_open_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    credits_opened_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    credits_open_time_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    share_button_clicked_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
  }, {
    sequelize,
  });
}
