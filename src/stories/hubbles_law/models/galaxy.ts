import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";

export class Galaxy extends Model<InferAttributes<Galaxy>, InferCreationAttributes<Galaxy>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare ra: number;
  declare decl: number;
  declare z: number;
  declare type: string;
  declare element: string;
  declare marked_bad: CreationOptional<number>;
  declare is_bad: CreationOptional<number>;
  declare spec_marked_bad: CreationOptional<number>;
  declare spec_is_bad: CreationOptional<number>;
  declare spec_is_good: CreationOptional<number>;
  declare spec_checked: CreationOptional<number>;
  declare tileload_marked_bad: CreationOptional<number>;
  declare is_sample: CreationOptional<number>;
}

export function initializeGalaxyModel(sequelize: Sequelize) {
  Galaxy.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    ra: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    decl: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    z: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    element: {
      type: DataTypes.STRING,
      allowNull: false
    },
    marked_bad: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    is_bad: {
      type:DataTypes.TINYINT,
      allowNull: false,
    },
    spec_marked_bad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    spec_is_bad: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    spec_is_good: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    spec_checked: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tileload_marked_bad: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_sample: {
      type: DataTypes.TINYINT,
      allowNull: false
    }
  }, {
    sequelize,
  });
}
