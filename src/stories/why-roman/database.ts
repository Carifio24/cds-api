import * as S from "@effect/schema/Schema";
import type { CreationAttributes } from "sequelize";

import { logger } from "../../logger";
import { createEntrySchema, modelToEffectSchema } from "../../schema";
import { WhyRomanData } from "./models/why_roman_data";
import { UpdateAttributes } from "../../utils";


export const WhyRomanUpdate = modelToEffectSchema(WhyRomanData);
export const WhyRomanEntry = createEntrySchema(WhyRomanUpdate);

export type WhyRomanUpdateT = S.Schema.To<typeof WhyRomanUpdate>;
export type WhyRomanEntryT = S.Schema.To<typeof WhyRomanEntry>;

export async function submitWhyRomanData(data: WhyRomanEntryT): Promise<WhyRomanData | null> {
  logger.verbose(`Attempting to submit why-roman data for user ${data.user_uuid}`);
  return WhyRomanData.upsert(data).then(([item, _]) => item);
}

export async function getAllWhyRomanData(): Promise<WhyRomanData[]> {
  return WhyRomanData.findAll();
}

export async function getWhyRomanData(userUUID: string): Promise<WhyRomanData | null> {
  return WhyRomanData.findOne({
    where: { user_uuid: userUUID },
  });
}

export async function updateWhyRomanData(userUUID: string, update: WhyRomanUpdateT): Promise<WhyRomanData | null> {
  const data = await WhyRomanData.findOne({ where: { user_uuid: userUUID } });

  if (data === null) {
    const creationData: CreationAttributes<WhyRomanData> = {
      user_uuid: userUUID,
      app_time_ms: update.app_time_ms ?? 0,
    };
    return WhyRomanData.create(creationData);
  }

  const dbUpdate: UpdateAttributes<WhyRomanData> = {
    last_updated: new Date(),
  };

  if (update.max_andromeda_step != null) {
    dbUpdate.max_andromeda_step = Math.max(data.max_andromeda_step, update.max_andromeda_step);
  }

  if (update.scales_selected) {
    const selected = data.scales_selected.concat(update.scales_selected);
    dbUpdate.scales_selected = selected;
  }

  if (update.tour_restarted_count) {
    dbUpdate.tour_restarted_count = data.tour_restarted_count + update.tour_restarted_count;
  }

  return data.update(dbUpdate).catch(_err => null);

}
