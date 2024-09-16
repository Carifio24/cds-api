import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";

export class CosmicDSSession extends Model<InferAttributes<CosmicDSSession>, InferCreationAttributes<CosmicDSSession>> {
  declare sid: string;
  declare expires: Date;
  declare data: string;
  declare user_id: number | null;
  declare user_type: number | null;
}

export function initializeSessionModel(sequelize: Sequelize) {
  CosmicDSSession.init({
    sid: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
    },
    user_type: {
      type: DataTypes.INTEGER
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false
    },
    data: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    tableName: "Sessions"
  });
}
