import SHA3 from "sha3";
import { APIKey } from "./models/api_key";

const HASHER = new SHA3(256);

export async function isValidAPIKey(key: string): Promise<boolean> {
  HASHER.update(key);
  const hashedKey = HASHER.digest("hex");
  const apiKey = await APIKey.findOne({ where: { hashed_key: hashedKey } });
  HASHER.reset();
  return apiKey !== null;
}
