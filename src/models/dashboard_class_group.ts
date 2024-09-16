import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class DashboardClassGroup extends Model<InferAttributes<DashboardClassGroup>, InferCreationAttributes<DashboardClassGroup>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare code: string;
  declare class_ids: number[];
}

export function initializeDashboardClassGroupModel(sequelize: Sequelize) {
  DashboardClassGroup.init({
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
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    class_ids: {
      type: DataTypes.JSON,
      allowNull: false
    }
  }, {
    sequelize,
  });
}
