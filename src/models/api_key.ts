import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class APIKey extends Model<InferAttributes<APIKey>, InferCreationAttributes<APIKey>> {
  declare id: CreationOptional<number>;
  declare hashed_key: string;
  declare client: string;
  declare permissions_root: CreationOptional<string>;
}

export function initializeAPIKeyModel(sequelize: Sequelize) {
  APIKey.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    hashed_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    client: {
      type: DataTypes.STRING,
      allowNull: false
    },
    permissions_root: {
      type: DataTypes.STRING,
      defaultValue: null
    }
  }, {
    sequelize,
    engine: "InnoDB"
  });
}
