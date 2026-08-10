import { Sequelize, DataTypes } from "sequelize";
import { Student } from "../../../models";
import { ModelBase } from "../../../utils";

export class HubbleStudentData extends ModelBase<HubbleStudentData> {
  declare student_id: number;
  declare hubble_fit_value: number;
  declare hubble_fit_unit: string;
  declare age_value: number;
  declare age_unit: string;
  declare last_data_update: Date;
}

export function initializeHubbleStudentDataModel(sequelize: Sequelize) {
  HubbleStudentData.init({
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      unique: true,
      references: {
        model: Student,
        key: "id"
      }
    },
    hubble_fit_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    hubble_fit_unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    age_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    age_unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_data_update: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  }, {
    sequelize,
    freezeTableName: true,
  });
}
