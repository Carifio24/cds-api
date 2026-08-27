import * as S from "@effect/schema/Schema";
import { DataTypes, InferCreationAttributes, ModelAttributeColumnOptions, ModelStatic, type Model } from "sequelize";
import { BaseTrackingData } from "./models/base_tracking_data";

/**
 * JC notes:
 * The typing here is admittedly a bit hairy!
 * I came up with these types by basically just looking at the typing inside of `effect`
 * and seeing how they handle generating the correct typing for structs.
 * The end result here is quite nice though!
 * The struct returned from `modelToEffectSchema` will give us a completely type-aware
 * schema that we can generate automatically from the Sequelize model. No need to maintain
 * two separate definitions!
 */

type AttributeEffectSchema<P> = S.Schema<P | undefined>;
type AttributeEffectSignature<P> = S.PropertySignature<P | undefined, true, P | undefined, true>
type AttributeEffect<P> = AttributeEffectSchema<P> | AttributeEffectSignature<P>;
type ModelEffect<M extends Model> = { [K in keyof InferCreationAttributes<M>]: InferCreationAttributes<M>[K] };
// type _ModelEffectSchemaWithContext<M extends Model> = S.Schema<Simplify<S.ToStruct<ModelEffect<M>>>, Simplify<S.FromStruct<ModelEffect<M>>>, S.Schema.Context<ModelEffect<M>[keyof InferCreationAttributes<M>]>>;
// export type ModelEffectSchema<M extends Model> = S.Schema<Simplify<S.ToStruct<ModelEffect<M>>>, Simplify<S.FromStruct<ModelEffect<M>>>, never>;
export type ModelEffectSchema<M extends Model> = S.Schema<ModelEffect<M>>;

export function modelToEffectSchema<M extends Model>(modelType: ModelStatic<M>): ModelEffectSchema<M> {

  const structOptions = {} as { [K in keyof InferCreationAttributes<M>]: AttributeEffect<InferCreationAttributes<M>[K]> };
  const attributes = modelType.getAttributes();
  Object.entries(attributes).forEach(entry => {
    const key = entry[0] as keyof InferCreationAttributes<M>;
    const attr = entry[1];
    let schema = schemaForAttribute(attr) as AttributeEffectSchema<InferCreationAttributes<M>[typeof key]> | null;
    if (!schema) {
      return;
    }
    const optional = 
      attr.allowNull ||
      attr.defaultValue !== undefined ||
      attr.autoIncrement;
    const item = optional ? S.optional(schema) : schema;
    structOptions[key] = item;
  });
  
  // We need to type-cast here because effect will infer that we need a context
  // We don't - since we're using InferCreationAttributes the result will be a primitive type
  return S.struct(structOptions) as unknown as ModelEffectSchema<M>;
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
