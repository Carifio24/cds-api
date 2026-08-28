import * as S from "@effect/schema/Schema";
import type { CreationAttributes } from "sequelize";

import { logger } from "../../logger";
import { ModelEffectSchema } from "../../schema";
import { WhyRomanData } from "./models/why_roman_data";
import { UpdateAttributes } from "../../utils";


type WhyRomanEntryT = S.Schema.To<ModelEffectSchema<WhyRomanData>>;
type WhyRomanUpdateT = Omit<WhyRomanEntryT, "user_uuid">;

export async function submitWhyRomanData(data: WhyRomanEntryT): Promise<WhyRomanData | null> {
  logger.verbose(`Attempting to submit why-roman data for user ${data.user_uuid}`);
  return WhyRomanData.upsert(data).then(([item, _]) => item);
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

  console.log(update);

  const dbUpdate: UpdateAttributes<WhyRomanData> = {
    last_updated: new Date(),
  };

  if (update.max_andromeda_tour_step != null) {
    dbUpdate.max_andromeda_tour_step = Math.max(data.max_andromeda_tour_step, update.max_andromeda_tour_step);
  }

  const countKeys = [
    "tour_restarted_count",
    "zoom_to_pixel_scale_count",
    "side_controls_opened_count",
    "app_time_ms",
    "about_roman_time_ms",
    "user_guide_time_ms",
    "controls_open_time_ms",
    "slider_min_press_count",
    "slider_max_press_count",
    "slider_label_press_count",
    "slider_move_count",
  ] as const;

  for (const key of countKeys) {
    const delta = update[key];
    if (delta) {
      dbUpdate[key] = data[key] + delta;
    }
  }

  if (update.test != undefined) {
    dbUpdate.test = update.test;
  }

  console.log(dbUpdate);

  return data.update(dbUpdate).catch(_err => null);

}
