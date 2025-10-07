import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class APIKey extends Model<InferAttributes<APIKey>, InferCreationAttributes<APIKey>> {
  declare id: CreationOptional<number>;
  declare hashed_key: string;
  declare client: string;
  declare permissions_roots: CreationOptional<string[]>;
  declare allowed_methods: CreationOptional<string[]>;
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
    permissions_roots: {
      type: DataTypes.JSON,
      defaultValue: null
    },
    allowed_methods: {
      type: DataTypes.JSON,
      defaultValue: null
    }
  }, {
    sequelize,
  });
}
