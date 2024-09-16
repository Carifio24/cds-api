import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { Class } from "./class";
import { Story } from "./story";

export class DummyClass extends Model<InferAttributes<DummyClass>, InferCreationAttributes<DummyClass>> {
  declare story_name: string;
  declare class_id: number;
}

export function initializeDummyClassModel(sequelize: Sequelize) {
  DummyClass.init({
    story_name: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      references: {
        model: Story,
        key: "name"
      }
    },
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      references: {
        model: Class,
        key: "id"
      }
    }
  }, {
    sequelize,
  });
}
