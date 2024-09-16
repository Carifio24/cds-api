import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { Class } from "./class";
import { Story } from "./story";

export class ClassStories extends Model<InferAttributes<ClassStories>, InferCreationAttributes<ClassStories>> {
  declare class_id: number;
  declare story_name: string;
  declare active: CreationOptional<number>;
}

export function initializeClassStoryModel(sequelize: Sequelize) {
  ClassStories.init({
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Class,
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
    },
    active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
    }
  }, {
    sequelize,
  });
}
