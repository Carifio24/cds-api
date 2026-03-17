import { DataTypes, type Model, type ModelAttributeColumnOptions, type ModelStatic } from "sequelize";
import { Schema } from "swagger-jsdoc";


function typeInfoForAttribute<M extends Model>(attribute: ModelAttributeColumnOptions<M>): Record<string, unknown> | null{
  const type: string = typeof attribute.type === "string" ? attribute.type : attribute.type.key;

  const stringTypes = [DataTypes.STRING, DataTypes.TEXT].map(t => t.key);
  if (stringTypes.includes(type)) {
    return { type: "string" };
  }
  if (type == DataTypes.ENUM.key) {
    return { type: "string", enum: attribute.values };
  }

  if (type == DataTypes.DATE.key) {
    return { type: "string", format: "date-time" };
  }
  if (type == DataTypes.DATEONLY.key) {
    return { type: "string", format: "date" };
  }

  const intTypes = [DataTypes.INTEGER, DataTypes.INTEGER.UNSIGNED].map(t => t.key);
  if (intTypes.includes(type)) {
    return { type: "integer", format: "int32" };
  }

  const bigIntTypes = [DataTypes.BIGINT, DataTypes.BIGINT.UNSIGNED].map(t => t.key);
  if (bigIntTypes.includes(type)) {
    return { type: "integer", format: "int64" };
  }

  if (type == DataTypes.BOOLEAN.key) {
    return { type: "boolean" };
  }

  if (type == DataTypes.JSON.key) {
    return { type: "object" };
  }
  
  return null;
}

export function modelToSchema<M extends Model>(modelType: ModelStatic<M>): Schema {
  const required: string[] = [];
  const properties: Record<string, Record<string, unknown>> = {};

  const attributes = modelType.getAttributes();
  Object.entries(attributes).forEach(([key, attr]) => {
    const info = typeInfoForAttribute(attr);
    if (info == null) {
      return;
    }

    if (!attr.allowNull) {
      required.push(key);
    }
    properties[key] = info;
  });

  return {
    type: "object",
    required,
    properties,
  };
}
