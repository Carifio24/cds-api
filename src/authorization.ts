import SHA3 from "sha3";
import { APIKey } from "./models/api_key";
import { Permission, Role } from "./models";
import { logger } from "./logger";
import type { Action, GenericRequest } from "./utils";
import { literal, Op } from "sequelize";

const HASHER = new SHA3(256);

const validKeys = new Map<string, APIKey>();

const methodsToActions = new Map<string, Action>([
  ["GET", "read"],
  ["PATCH", "write"],
  ["POST", "write"],
  ["PUT", "write"],
  ["DELETE", "delete"],
]);

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

interface PermissionInfo {
  key: APIKey;
  action: Action;
  resourcePath: string;
}
export async function hasPermission(info: PermissionInfo): Promise<boolean> {
  return Permission.findOne({
    include: [
      {
        model: Role,
        required: true,
        include: [
          {
            model: APIKey,
            required: true,
            where: { id: info.key.id },
          }
        ]
      },
    ],
    where: {
      [Op.and]: [
        { action: info.action },
        literal(`"${info.resourcePath}" LIKE CONCAT(resource_pattern, "%")`),
      ],
    }
  })
  .then(permission => permission != null)
  .catch(error => {
    logger.error(error);
    return false;
  });
}

export async function requestHasPermission(req: GenericRequest): Promise<{ permission: boolean, validKey: boolean }> {
  const key = req.get("Authorization");
  const apiKey = key ? await getAPIKey(key) : null;
  if (apiKey == null) {
    return { permission: false, validKey: false };
  }
  const action = methodsToActions.get(req.method);
  if (action == undefined) {
    return { permission: false, validKey: true };
  }
  const resourcePath = req.path; 
  const permission = await hasPermission({
    key: apiKey,
    action,
    resourcePath,
  });
  return {
    permission,
    validKey: true,
  };
}
