import * as S from "@effect/schema/Schema";
import type { CreationAttributes } from "sequelize";

import { logger } from "../../logger";
import { ModelEffectSchema } from "../../schema";
import { RomanFirstImagesData } from "./models";
import { UpdateAttributes } from "../../utils";

type RomanFirstImagesEntryT = S.Schema.To<ModelEffectSchema<RomanFirstImagesData>>;
type RomanFirstImagesUpdateT = Omit<RomanFirstImagesEntryT, "user_uuid">;

export async function submitRomanFirstImagesData(data: RomanFirstImagesEntryT): Promise<RomanFirstImagesData | null> {
  logger.verbose(`Attempting to submit roman-first-look data for user ${data.user_uuid}`);
  return RomanFirstImagesData.upsert(data).then(([item, _]) => item);
}

export async function getRomanFirstImagesData(userUUID: string): Promise<RomanFirstImagesData | null> {
  return RomanFirstImagesData.findOne({
    where: { user_uuid: userUUID },
  });
}

export async function updateRomanFirstImagesData(userUUID: string, update: RomanFirstImagesUpdateT): Promise<RomanFirstImagesData | null> {
  const data = await RomanFirstImagesData.findOne({ where: { user_uuid: userUUID } });
  if (data === null) {
    const creationData: CreationAttributes<RomanFirstImagesData> = {
      user_uuid: userUUID,
      app_time_ms: update.app_time_ms ?? 0,
    };
    return RomanFirstImagesData.create(creationData);
  }

  const dbUpdate: UpdateAttributes<RomanFirstImagesData> = {
    last_updated: new Date(),
  };

  return data.update(dbUpdate).catch(_err => null);
}
