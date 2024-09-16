import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { Student } from "./student";

export class StudentOptions extends Model<InferAttributes<StudentOptions>, InferCreationAttributes<StudentOptions>> {
  declare student_id: number;
  declare speech_autoread: CreationOptional<number>;
  declare speech_rate: CreationOptional<number>;
  declare speech_pitch: CreationOptional<number>;
  declare speech_voice: CreationOptional<string>;
}

// TODO: Can we generate this automatically from the class definition?
const STUDENT_OPTIONS = ["speech_autoread", "speech_rate", "speech_pitch", "speech_voice"] as const;
export type StudentOption = typeof STUDENT_OPTIONS[number];

export function isStudentOption(o: string): o is StudentOption {
  return typeof o === "string" && (STUDENT_OPTIONS as readonly string[]).includes(o);
}

export function initializeStudentOptionsModel(sequelize: Sequelize) {
  StudentOptions.init({
    student_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Student,
        key: "id"
      }
    },
    speech_autoread: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    speech_rate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1
    },
    speech_pitch: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1
    },
    speech_voice: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
  });
}
