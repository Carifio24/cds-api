import { Class } from "../../../models";
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class SyncMergedHubbleClasses extends Model<InferAttributes<SyncMergedHubbleClasses>, InferCreationAttributes<SyncMergedHubbleClasses>> {
  declare class_id: number | null;
  declare merged_class_id: number;
  declare merged: CreationOptional<Date>;
}

export function initializeSyncMergedHubbleClassesModel(sequelize: Sequelize) {
  SyncMergedHubbleClasses.init({
    class_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
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
