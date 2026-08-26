import * as S from "@effect/schema/Schema";
import type { Simplify } from "effect/Types";
import { DataTypes, ModelAttributeColumnOptions, ModelStatic, type Model } from "sequelize";


export type EntryType<UpdateType> = Simplify<UpdateType & { readonly user_uuid: string }>;

export function createEntrySchema<T>(dataSchema: S.Schema<T,T,never>): S.Schema<EntryType<T>, EntryType<T>, never> {
  return S.extend(dataSchema, S.struct({ user_uuid: S.string }));
}

function schemaForAttribute<M extends Model>(attribute: ModelAttributeColumnOptions<M>) {
  const type: string = typeof attribute.type === "string" ? attribute.type : attribute.type.key;

  const stringTypes = [DataTypes.STRING, DataTypes.TEXT].map(t => t.key);
  if (stringTypes.includes(type)) {
    return S.string;
  }

  const intTypes = [DataTypes.INTEGER, DataTypes.INTEGER.UNSIGNED].map(t => t.key);
  if (intTypes.includes(type)) {
    return S.number.pipe(S.int());
  }

  const bigIntTypes = [DataTypes.BIGINT, DataTypes.BIGINT.UNSIGNED].map(t => t.key);
  if (bigIntTypes.includes(type)) {
    return S.bigint;
  }

  switch (type) {
    case DataTypes.ENUM.key:
      const options: Record<string, string | number> = {};
      attribute.values?.forEach(val => { options[val] = val; });
      return S.enums(options);

    // TODO: What to do about dates?
    case DataTypes.DATE.key:
      return S.string;

    case DataTypes.DATEONLY.key:
      return S.string;

    case DataTypes.BOOLEAN.key:
      return S.boolean;

    case DataTypes.JSON.key:
      return S.object;
  }

  return null;
}

export function modelToEffectSchema<M extends Model>(modelType: ModelStatic<M>): S.Schema<any,any,never> {
  const structOptions: Record<string, S.Schema<any,any,never>> = {};
  const attributes = modelType.getAttributes();
  Object.entries(attributes).forEach(([key, attr]) => {
    let schema: S.Schema<any,any,never> | null = schemaForAttribute(attr);
    if (!schema) {
      return;
    }
    if (attr.allowNull) {
      schema = S.nullish(schema);
    }
    structOptions[key] = schema;
  });

  return S.struct(structOptions);
}
