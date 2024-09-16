import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { Story } from "./story";


export class Stage extends Model<InferAttributes<Stage>, InferCreationAttributes<Stage>> {
  declare story_name: string;
  declare stage_name: string;
  declare stage_index: CreationOptional<number | null>;
}

export function initializeStageModel(sequelize: Sequelize) {
  Stage.init({
    story_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    stage_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
      references: {
        model: Story,
        key: "name",
      }
    },
    stage_index: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    }
  }, {
    sequelize,
    indexes: [
      {
        unique: true,
        fields: ["story_name", "stage_name"],
      },
      {
        unique: true,
        fields: ["story_name"],
      },
      {
        unique: true,
        fields: ["stage_name"],
      },
    ]
  });
}
