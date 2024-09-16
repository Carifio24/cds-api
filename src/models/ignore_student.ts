import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { Story } from "./story";
import { Student } from "./student";

export class IgnoreStudent extends Model<InferAttributes<IgnoreStudent>, InferCreationAttributes<IgnoreStudent>> {
  declare student_id: number;
  declare story_name: string;
}

export function initializeIgnoreStudentModel(sequelize: Sequelize) {
  IgnoreStudent.init({
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Student,
        key: "id"
      }
    },
    story_name: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Story,
        key: "name"
      }
    }
  }, {
    sequelize,
  });
}
