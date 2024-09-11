import { nanoid } from "nanoid";
import { enc, SHA256 } from "crypto-js";
import { v5 } from "uuid";

import { Model } from "sequelize";

import { ParsedQs } from "qs";
import { Request } from "express";
import { Response } from "express-serve-static-core";

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

export function createVerificationCode(): string {
  return nanoid(21);
}

export function encryptPassword(password: string): string {
  return SHA256(password).toString(enc.Base64);
}

// A namespace for creating v5 UUIDs
const cdsNamespace = "0a69782c-f1af-48c5-9aaf-078a4e511518";
function createV5(name: string): string {
  return v5(name, cdsNamespace);
}

export function createClassCode(educatorID: number, className: string) {
  const nameString = `${educatorID}_${className}`;
  return createV5(nameString);
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
