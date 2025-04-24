import { nanoid } from "nanoid";
import { enc, SHA256 } from "crypto-js";
import { v5 } from "uuid";

import * as S from "@effect/schema/Schema";
import { Model } from "sequelize";

import { ParsedQs } from "qs";
import { Request } from "express";
import { Response } from "express-serve-static-core";
import { Class } from "./models";

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];

// TODO: Clean up these type definitions
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type GenericRequest = Request<{}, any, any, ParsedQs, Record<string, any>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericResponse = Response<any, Record<string, any>, number>;

// This type describes objects that we're allowed to pass to a model's `update` method
export type UpdateAttributes<M extends Model> = Parameters<M["update"]>[0];

export type Only<T, U> = {
  [P in keyof T]: T[P];
} & {
  [P in keyof U]?: never;
};

export type Either<T, U> = Only<T,U> | Only<U,T>;

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}

function pairType<T>(type: S.Schema<T,T,never>): S.Schema<[T, T], [T, T], never> {
  return S.mutable(S.tuple(type, type));
}

function arrayType<T>(type: S.Schema<T,T,never>) {
  return S.mutable(S.array(S.mutable(type)));
}

function pairArrayType<T>(type: S.Schema<T,T,never>): S.Schema<[T, T][], [T, T][], never> {
  return S.mutable(S.array(pairType(type)));
}

export const LatLon = S.tuple(S.number, S.number);
export const LatLonArray = arrayType(LatLon);
export const NumberPair = pairType(S.number);
export const NumberArray = arrayType(S.number);
export const NumberPairArray = pairArrayType(S.number);
export const IntArray = arrayType(S.number.pipe(S.int()));
export const StringArray = arrayType(S.string);
export const StringPair = pairType(S.string);
export const StringPairArray = pairArrayType(S.string);
export const OptionalInt = S.optional(S.number.pipe(S.int()), { exact: true });
export const OptionalBoolean = S.optional(S.boolean, { exact: true });
export const OptionalLatLonArray = S.optional(LatLonArray, { exact: true });
export const OptionalIntArray = S.optional(IntArray, { exact: true });
export const OptionalNumberPair = S.optional(NumberPair, { exact: true });
export const OptionalNumberArray = S.optional(NumberArray, { exact: true });
export const OptionalNumberPairArray = S.optional(NumberPairArray, { exact: true });
export const OptionalStringArray = S.optional(StringArray, { exact: true });
export const OptionalStringPairArray = S.optional(StringPairArray, { exact: true });

export function createVerificationCode(): string {
  return nanoid(21);
}

export function encryptPassword(password: string): string {
  return SHA256(password).toString(enc.Base64);
}

// A namespace for creating v5 UUIDs
const cdsNamespace = "0a69782c-f1af-48c5-9aaf-078a4e511518";
export function createV5(name: string): string {
  return v5(name, cdsNamespace);
}

async function isClassCodeUnique(code: string): Promise<boolean> {
  const cls = await Class.findOne({ where: { code } });
  return cls === null;
}

function createPossibleClassCode(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export async function createClassCode(length: number = 6): Promise<string> {
  let code = "";
  let unique = false;
  do {
    code = createPossibleClassCode(length);
    unique = await isClassCodeUnique(code);
  } while (!unique);

  return code;
}


// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function isArrayThatSatisfies<T extends Array<any>>(array: any, condition: (t: Array<any>) => boolean): array is T {
  return Array.isArray(array) && condition(array);
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function isNumberArray(arr: any): arr is number[] {
  return Array.isArray(arr) && arr.every(x => typeof x === "number");
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function isStringArray(arr: any): arr is string[] {
  return Array.isArray(arr) && arr.every(x => typeof x === "string");
}

export function mySqlDatetime(dt: Date): string {
  return `${String(dt.getUTCFullYear()).padStart(4, "0")}-${String(dt.getUTCMonth()+1).padStart(2, "0")}-${String(dt.getUTCDay()).padStart(2, "0")} ${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}:${String(dt.getUTCSeconds()).padStart(2, "0")}`;
}

// I don't love the nested ternary, but we can't do boolean operations on the `extends` conditions
export type UpdateState<S> = {
  [K in keyof S as (K extends string ? (S[K] extends number ? `delta_${K}` : K) : K)]?: S[K];
};
