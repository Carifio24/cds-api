import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { Story } from "./story";
import { Student } from "./student";

export class StoryState extends Model<InferAttributes<StoryState>, InferCreationAttributes<StoryState>> {
  declare student_id: CreationOptional<number>;
  declare story_name: string;
  declare story_state: JSON;
  declare last_modified: CreationOptional<Date>;
}

export function initializeStoryStateModel(sequelize: Sequelize) {
    StoryState.init({
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
      story_state: {
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
