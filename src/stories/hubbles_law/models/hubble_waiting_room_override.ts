import { Class } from "../../../models";
import { Sequelize, DataTypes, CreationOptional } from "sequelize";
import { ModelBase } from "../../../utils";

export class HubbleWaitingRoomOverride extends ModelBase<HubbleWaitingRoomOverride> {
  declare class_id: number;
  declare timestamp: CreationOptional<Date>;
}

export function initializeHubbleWaitingRoomOverrideModel(sequelize: Sequelize) {
  HubbleWaitingRoomOverride.init({
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Class,
        key: "id",
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    }
  }, {
    sequelize,
  });
}
