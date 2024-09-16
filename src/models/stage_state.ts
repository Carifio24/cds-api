import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { Story } from "./story";
import { Student } from "./student";

export class StageState extends Model<InferAttributes<StageState>, InferCreationAttributes<StageState>> {
  declare student_id: CreationOptional<number>;
  declare story_name: string;
  declare stage_name: string;
  declare state: JSON;
  declare last_modified: CreationOptional<Date>;
}

export function initializeStageStateModel(sequelize: Sequelize) {
    StageState.init({
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
      },
      stage_name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      state: {
        type: DataTypes.JSON,
        allowNull: false
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
