import { Galaxy } from "./galaxy";
import { Student } from "../../../models";
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class HubbleMeasurement extends Model<InferAttributes<HubbleMeasurement>, InferCreationAttributes<HubbleMeasurement>> {
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
      type: DataTypes.FLOAT
    },
    rest_wave_unit: {
      type: DataTypes.STRING
    },
    obs_wave_value: {
      type: DataTypes.FLOAT
    },
    obs_wave_unit: {
      type: DataTypes.STRING
    },
    velocity_value: {
      type: DataTypes.FLOAT
    },
    velocity_unit: {
      type: DataTypes.STRING
    },
    ang_size_value: {
      type: DataTypes.FLOAT
    },
    ang_size_unit: {
      type: DataTypes.STRING
    },
    est_dist_value: {
      type: DataTypes.FLOAT
    },
    est_dist_unit: {
      type: DataTypes.STRING
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
  });
}
