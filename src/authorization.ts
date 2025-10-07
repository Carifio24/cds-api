import { Request } from "express";
import SHA3 from "sha3";
import { APIKey } from "./models/api_key";

const HASHER = new SHA3(256);

const validKeys = new Map<string, APIKey>();

export function hashAPIKey(key: string): string {
  HASHER.reset();
  HASHER.update(key);
  const hashed = HASHER.digest("hex");
  HASHER.reset();
  return hashed;
}

export async function getAPIKey(key: string): Promise<APIKey | null> {
  const cachedKey = validKeys.get(key);
  if (cachedKey !== undefined) {
    return cachedKey;
  }
  const hashedKey = hashAPIKey(key);
  const apiKey = await APIKey.findOne({ where: { hashed_key: hashedKey } });
  HASHER.reset();
  if (apiKey !== null) {
    validKeys.set(key, apiKey);
  }
  return apiKey;
}

// TODO: Is there a better way to set this system up?
export function hasPermission(key: APIKey, req: Request): boolean {
  const relativeURL = req.originalUrl;
  const permissionsRoots = key.permissions_roots;
  const routePermission = permissionsRoots === null ||
    permissionsRoots.some((root) => relativeURL.startsWith(root));
  const methodPermission = key.allowed_methods === null || key.allowed_methods.includes(req.method);
  return routePermission && methodPermission;
}
