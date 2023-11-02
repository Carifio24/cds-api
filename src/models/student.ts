import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { User } from "../user";

export class Student extends Model<InferAttributes<Student>, InferCreationAttributes<Student>> implements User {
  declare id: CreationOptional<number>;
  declare verified: number;
  declare verification_code: string;
  declare email: string;
  declare username: string;
  declare password: string;
  declare institution: string | null;
  declare age: number | null;
  declare gender: string | null;
  declare ip: CreationOptional<string | null>;
  declare lat: CreationOptional<string | null>;
  declare lon: CreationOptional<string | null>;
  declare profile_created: CreationOptional<Date>;
  declare visits: CreationOptional<number>;
  declare last_visit: CreationOptional<Date>;
  declare last_visit_ip: CreationOptional<string | null>;
  declare seed: CreationOptional<number>;
  declare team_member: CreationOptional<string | null>;
  declare dummy: CreationOptional<boolean>;
}

export function initializeStudentModel(sequelize: Sequelize) {
  Student.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      unique: true
    },
    verified: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    verification_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    institution: {
      type: DataTypes.STRING
    },
    age: {
      type: DataTypes.TINYINT,
    },
    gender: {
      type: DataTypes.STRING
    },
    ip: {
      type: DataTypes.STRING
    },
    lat: {
      type: DataTypes.STRING
    },
    lon: {
      type: DataTypes.STRING
    },
    profile_created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    visits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    last_visit: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    last_visit_ip: {
      type: DataTypes.STRING
    },
    seed: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    team_member: {
      type: DataTypes.STRING
    },
    dummy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {
    sequelize,
    engine: "InnoDB",
    indexes: [
      {
        unique: true,
        fields: ["email"]
      },
      {
        unique: true,
        fields: ["id"]
      },
      {
        unique: true,
        fields: ["verificationCode"]
      }
    ]
  });
}
