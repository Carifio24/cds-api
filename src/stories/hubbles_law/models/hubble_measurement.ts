import { Galaxy } from "./galaxy";
import { Student } from "../../../models";
import { Sequelize, DataTypes, CreationOptional } from "sequelize";
import { ModelBase } from "../../../utils";

export class HubbleMeasurement extends ModelBase<HubbleMeasurement> {
  declare student_id: number;
  declare galaxy_id: number;

  declare rest_wave_value: CreationOptional<number | null>;
  declare rest_wave_unit: CreationOptional<string | null>;
  declare obs_wave_value: CreationOptional<number | null>;
  declare obs_wave_unit: CreationOptional<string | null>;
  declare velocity_value: CreationOptional<number | null>;
  declare velocity_unit: CreationOptional<string | null>;
  declare ang_size_value: CreationOptional<number | null>;
  declare ang_size_unit: CreationOptional<string | null>;
  declare est_dist_value: CreationOptional<number | null>;
  declare est_dist_unit: CreationOptional<string | null>;
  declare brightness: CreationOptional<number>;
  declare last_modified: CreationOptional<Date>;
}

export function initializeHubbleMeasurementModel(sequelize: Sequelize) {
  HubbleMeasurement.init({
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Student,
        key: "id"
      },
    },
    galaxy_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Galaxy,
        key: "id"
      }
    },
    rest_wave_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    rest_wave_unit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    obs_wave_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    obs_wave_unit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    velocity_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    velocity_unit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    ang_size_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    ang_size_unit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    est_dist_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    est_dist_unit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    brightness: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1
    },
    last_modified: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    sequelize,
    indexes: [
      {
        fields: ["student_id"],
      },
      {
        fields: ["galaxy_id"],
      },
    ]
  });
}
