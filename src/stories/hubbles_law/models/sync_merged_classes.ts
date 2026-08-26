import { Class } from "../../../models";
import { Sequelize, DataTypes, CreationOptional } from "sequelize";
import { ModelBase } from "../../../utils";

export class SyncMergedHubbleClasses extends ModelBase<SyncMergedHubbleClasses> {
  declare class_id: number | null;
  declare merged_class_id: number;
  declare merged: CreationOptional<Date>;
}

export function initializeSyncMergedHubbleClassesModel(sequelize: Sequelize) {
  SyncMergedHubbleClasses.init({
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Class,
        key: "id"
      }
    },
    merged_class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: Class,
        key: "id"
      }
    },
    merged: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    sequelize,
  });
}
