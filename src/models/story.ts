import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class Story extends Model<InferAttributes<Story>, InferCreationAttributes<Story>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare display_name: string;
}

export function initializeStoryModel(sequelize: Sequelize) {
  Story.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    display_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
  });
}
