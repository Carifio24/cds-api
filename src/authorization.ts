import SHA3 from "sha3";
import { APIKey } from "./models/api_key";

const HASHER = new SHA3(256);

export async function getAPIKey(key: string): Promise<APIKey | null> {
  HASHER.update(key);
  const hashedKey = HASHER.digest("hex");
  const apiKey = await APIKey.findOne({ where: { hashed_key: hashedKey } });
  HASHER.reset();
  return apiKey;
}

// TODO: Is there a better way to set this system up?
export function hasPermission(key: APIKey, relativeURL: string): boolean {
  const permissionsRoot = key.permissions_root;
  return permissionsRoot === null || relativeURL.startsWith(permissionsRoot);
}
