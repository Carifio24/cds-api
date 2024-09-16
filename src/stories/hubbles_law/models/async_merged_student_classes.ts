import { Class, Student } from "../../../models";
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class AsyncMergedHubbleStudentClasses extends Model<InferAttributes<AsyncMergedHubbleStudentClasses>, InferCreationAttributes<AsyncMergedHubbleStudentClasses>> {
  declare student_id: number;
  declare class_id: number | null;
  declare merged_class_id: number;
  declare merged: CreationOptional<Date>;
}

export function initializeAsyncMergedHubbleStudentClassesModel(sequelize: Sequelize) {
  AsyncMergedHubbleStudentClasses.init({
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Student,
        key: "id"
      }
    },
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      primaryKey: true,
      references: {
        model: Class,
        key: "id"
      }
    },
    merged_class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Class,
        key: "id"
      }
    },
    merged: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    sequelize,
  });
}
