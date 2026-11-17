import * as S from "@effect/schema/Schema";
import type { CreationAttributes } from "sequelize";

import { logger } from "../../logger";
import { ModelEffectSchema } from "../../schema";
import { VoyagerLightDayData } from "./models";
import { UpdateAttributes } from "../../utils";

type VoyagerLightDayEntryT = S.Schema.To<ModelEffectSchema<VoyagerLightDayData>>;
type VoyagerLightDayUpdateT = Omit<VoyagerLightDayEntryT, "user_uuid">;

export async function submitVoyagerLightDayData(data: VoyagerLightDayEntryT): Promise<VoyagerLightDayData | null> {
  logger.verbose(`Attempting to submit voyager-light-day data for user ${data.user_uuid}`);
  return VoyagerLightDayData.upsert(data).then(([item, _]) => item);
}

export async function getVoyagerLightDayData(userUUID: string): Promise<VoyagerLightDayData | null> {
  return VoyagerLightDayData.findOne({
    where: { user_uuid: userUUID },
  });
}

export async function updateVoyagerLightDayData(userUUID: string, update: VoyagerLightDayUpdateT): Promise<VoyagerLightDayData | null> {
  const data = await VoyagerLightDayData.findOne({ where: { user_uuid: userUUID } });

  if (data === null) {
    const creationData: CreationAttributes<VoyagerLightDayData> = {
      user_uuid: userUUID,
      app_time_ms: update.app_time_ms ?? 0,
    };
    return VoyagerLightDayData.create(creationData);
  }

  const dbUpdate: UpdateAttributes<VoyagerLightDayData> = {
    last_updated: new Date(),
  };

  if (update.max_tour_step != null) {
    dbUpdate.max_tour_step = Math.max(data.max_tour_step, update.max_tour_step);
  }

  const countKeys = [
    "app_time_ms",
    "user_guide_time_ms",
    "tour_time_ms",
    "countdown_time_ms",
    "play_clicked_count",
    "mission_slider_use_count",
  ] as const;

  for (const key of countKeys) {
    const delta = update[key];
    if (delta) {
      dbUpdate[key] = data[key] + delta;
    }
  }

  const result = await data.update(dbUpdate).catch(_err => null);
  return result;
}
