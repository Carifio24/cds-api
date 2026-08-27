import { CreationOptional, DataTypes, type Model, Sequelize } from "sequelize";
import { ModelBase } from "../utils";

export class BaseTrackingData<M extends Model> extends ModelBase<M> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare app_time_ms: CreationOptional<number>;
  declare created: CreationOptional<Date>;
  declare last_updated: CreationOptional<Date>;

  static readonly ATTRIBUTES = {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_uuid: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    app_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  };
}
