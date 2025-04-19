import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class TempoLiteData extends Model<InferAttributes<TempoLiteData>, InferCreationAttributes<TempoLiteData>> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare selected_calendar_dates: CreationOptional<Date[]>;
  declare selected_timezones: CreationOptional<string[]>;
  declare user_selected_locations: CreationOptional<string[]>;
  declare user_selected_locations_count: CreationOptional<number>;
  declare notable_events_selected: CreationOptional<[string, string][]>;
  declare notable_events_selected_count: CreationOptional<number>;
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
    selected_calendar_dates: {
      type: DataTypes.JSON,
      defaultValue: "[]",
    },
    selected_timezones: {
      type: DataTypes.JSON,
      defaultValue: "[]",
    },
    user_selected_locations: {
      type: DataTypes.JSON,
      defaultValue: "[]",
    },
    user_selected_locations_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    notable_events_selected: {
      type: DataTypes.JSON,
      defaultValue: "[]",
    },
    notable_events_selected_count: {
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
  }, {
    sequelize,
  });
}
