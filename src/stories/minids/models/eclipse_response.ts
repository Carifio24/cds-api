import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class EclipseMiniResponse extends Model<InferAttributes<EclipseMiniResponse>, InferCreationAttributes<EclipseMiniResponse>> {
  declare id: CreationOptional<number>;
  declare user_uuid: string;
  declare mc_responses: string[];
  declare preset_locations: string[];
  declare preset_locations_count: number;
  declare user_selected_locations: [number, number][];
  declare user_selected_locations_count: number;
  declare timestamp: CreationOptional<Date>;
}

export function initializeEclipseMiniResponseModel(sequelize: Sequelize) {
  EclipseMiniResponse.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    user_uuid: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    mc_responses: {
      type: DataTypes.JSON,
      defaultValue: null
    },
    preset_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    preset_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_selected_locations: {
      type: DataTypes.JSON,
      allowNull: false
    },
    user_selected_locations_count: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    }
  }, {
    sequelize,
  });
}
