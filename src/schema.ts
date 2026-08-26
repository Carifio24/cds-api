import * as S from "@effect/schema/Schema";
import type { Simplify } from "effect/Types";
import { DataTypes, ModelAttributeColumnOptions, ModelStatic, type Model } from "sequelize";


// Stolen from the Sequelize type definitions
type NonConstructorKeys<T> = ({[P in keyof T]: T[P] extends new () => any ? never : P })[keyof T];
type NonConstructor<T> = Pick<T, NonConstructorKeys<T>>;

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
type AttributeEffectSchema<P> = S.Schema<P | undefined, P | undefined, never>;
type AttributeEffectSignature<P> = S.PropertySignature<P | undefined, true, P | undefined, true>
type AttributeEffect<P> = AttributeEffectSchema<P> | AttributeEffectSignature<P>;
type ModelEffect<M extends Model> = { [K in NonConstructorKeys<M>]: AttributeEffect<M[K]> };
type ModelEffectSchema<M extends Model> = S.Schema<Simplify<S.ToStruct<ModelEffect<M>>>, Simplify<S.FromStruct<ModelEffect<M>>>, S.Schema.Context<ModelEffect<M>[NonConstructorKeys<M>]>>;

export function modelToEffectSchema<M extends Model>(modelType: ModelStatic<M>): ModelEffectSchema<M> {
  const structOptions = {} as { [K in NonConstructorKeys<M>]: AttributeEffect<M[K]> };
  const attributes = modelType.getAttributes();
  Object.entries(attributes).forEach(entry => {
    const key = entry[0] as NonConstructorKeys<M>;
    const attr = entry[1];
    let schema = schemaForAttribute(attr) as AttributeEffectSchema<M[typeof key]> | null;
    if (!schema) {
      return;
    }
    const item = attr.defaultValue !== undefined ? S.optional(schema) : schema;
    structOptions[key] = item;
  });

  return S.struct(structOptions);
}
