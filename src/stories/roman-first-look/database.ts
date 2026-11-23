import * as S from "@effect/schema/Schema";
import type { CreationAttributes } from "sequelize";

import { logger } from "../../logger";
import { ModelEffectSchema } from "../../schema";
import { RomanFirstLookData } from "./models";
import { UpdateAttributes } from "../../utils";

type RomanFirstLookEntryT = S.Schema.To<ModelEffectSchema<RomanFirstLookData>>;
type RomanFirstLookUpdateT = Omit<RomanFirstLookEntryT, "user_uuid">;

export async function submitRomanFirstLookData(data: RomanFirstLookEntryT): Promise<RomanFirstLookData | null> {
  logger.verbose(`Attempting to submit roman-first-look data for user ${data.user_uuid}`);
  return RomanFirstLookData.upsert(data).then(([item, _]) => item);
}

export async function getRomanFirstLookData(userUUID: string): Promise<RomanFirstLookData | null> {
  return RomanFirstLookData.findOne({
    where: { user_uuid: userUUID },
  });
}

export async function updateRomanFirstLookData(userUUID: string, update: RomanFirstLookUpdateT): Promise<RomanFirstLookData | null> {
  const data = await RomanFirstLookData.findOne({ where: { user_uuid: userUUID } });
  if (data === null) {
    const creationData: CreationAttributes<RomanFirstLookData> = {
      user_uuid: userUUID,
      app_time_ms: update.app_time_ms ?? 0,
    };
    return RomanFirstLookData.create(creationData);
  }

  const dbUpdate: UpdateAttributes<RomanFirstLookData> = {
    last_updated: new Date(),
  };

  return data.update(dbUpdate).catch(_err => null);
}
