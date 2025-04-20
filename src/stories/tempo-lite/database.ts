import * as S from "@effect/schema/Schema";

import { logger } from "../../logger";

import { TempoLiteData } from "./models";
import { CreationAttributes } from "sequelize";
import { OptionalInt, OptionalIntArray, OptionalStringArray, StringPairArray, UpdateAttributes } from "../../utils";

type TempoLiteDataUpdateAttributes = UpdateAttributes<TempoLiteData>;

export const TempoLiteEntry = S.struct({
  user_uuid: S.string,
  user_selected_calendar_dates: OptionalIntArray,
  user_selected_calendar_dates_count: OptionalInt,
  user_selected_timezones: OptionalStringArray,
  user_selected_timezones_count: OptionalInt,
  user_selected_locations: OptionalStringArray,
  user_selected_locations_count: OptionalInt,
  user_selected_notable_events: StringPairArray,
  user_selected_notable_events_count: OptionalInt,
  whats_new_opened_count: OptionalInt,
  whats_new_open_time_ms: OptionalInt,
  introduction_opened_count: OptionalInt,
  introduction_open_time_ms: OptionalInt,
  user_guide_opened_count: OptionalInt,
  user_guide_open_time_ms: OptionalInt,
  about_data_opened_count: OptionalInt,
  about_data_open_time_ms: OptionalInt,
  credits_opened_count: OptionalInt,
  credits_open_time_ms: OptionalInt,
  share_button_clicked_count: OptionalInt,
});

export const TempoLiteUpdate = S.struct({
  user_selected_calendar_dates: OptionalIntArray,
  user_selected_calendar_dates_count: OptionalInt,
  user_selected_timezones: OptionalStringArray,
  user_selected_timezones_count: OptionalInt,
  user_selected_locations: OptionalStringArray,
  user_selected_locations_count: OptionalInt,
  user_selected_notable_events: StringPairArray,
  user_selected_notable_events_count: OptionalInt,
  delta_whats_new_opened_count: OptionalInt,
  delta_whats_new_open_time_ms: OptionalInt,
  delta_introduction_opened_count: OptionalInt,
  delta_introduction_open_time_ms: OptionalInt,
  delta_user_guide_opened_count: OptionalInt,
  delta_user_guide_open_time_ms: OptionalInt,
  delta_about_data_opened_count: OptionalInt,
  delta_about_data_open_time_ms: OptionalInt,
  delta_credits_opened_count: OptionalInt,
  delta_credits_open_time_ms: OptionalInt,
  delta_share_button_clicked_count: OptionalInt,
});

export type TempoLiteEntryT = S.Schema.To<typeof TempoLiteEntry>;
export type TempoLiteUpdateT = S.Schema.To<typeof TempoLiteUpdate>;

export async function submitTempoLiteData(data: TempoLiteEntryT): Promise<TempoLiteData | null> {
  logger.verbose(`Attempting to submit TEMPO Lite data for user ${data.user_uuid}`);

  const dataWithCounts: CreationAttributes<TempoLiteData> = {
    ...data,
    user_selected_locations_count: data.user_selected_locations_count ?? (data.user_selected_locations?.length ?? 0),
    user_selected_notable_events_count: data.user_selected_notable_events_count ?? (data.user_selected_notable_events?.length ?? 0),
  };

  return TempoLiteData.upsert(dataWithCounts).then(([item, _]) => item);
}

export async function getAllTempoLiteData(): Promise<TempoLiteData[]> {
  return TempoLiteData.findAll();
}

export async function getTempoLiteData(userUUID: string): Promise<TempoLiteData | null> {
  return TempoLiteData.findOne({
    where: { user_uuid: userUUID }
  });
}

export async function updateTempoLiteData(userUUID: string, update: TempoLiteUpdateT): Promise<TempoLiteData | null> {
  const data = await TempoLiteData.findOne({ where: { user_uuid: userUUID } });

  if (data === null) {
    const created = await TempoLiteData.create({
      user_uuid: userUUID,
      user_selected_calendar_dates: update.user_selected_calendar_dates ?? [],
      user_selected_calendar_dates_count: update.user_selected_calendar_dates?.length ?? 0,
      user_selected_timezones: update.user_selected_timezones ?? [],
      user_selected_timezones_count: update.user_selected_timezones?.length ?? 0,
      user_selected_locations: update.user_selected_locations ?? [],
      user_selected_locations_count: update.user_selected_locations?.length ?? 0,
      user_selected_notable_events: update.user_selected_notable_events ?? [],
      user_selected_notable_events_count: update.user_selected_notable_events?.length ?? 0,
      whats_new_opened_count: update.delta_whats_new_opened_count ?? 0,
      whats_new_open_time_ms: update.delta_whats_new_open_time_ms ?? 0,
      introduction_opened_count: update.delta_introduction_opened_count ?? 0,
      introduction_open_time_ms: update.delta_introduction_open_time_ms ?? 0,
      user_guide_opened_count: update.delta_user_guide_opened_count ?? 0,
      user_guide_open_time_ms: update.delta_user_guide_open_time_ms ?? 0,
      about_data_opened_count: update.delta_about_data_opened_count ?? 0,
      about_data_open_time_ms: update.delta_about_data_open_time_ms ?? 0,
      credits_opened_count: update.delta_credits_opened_count ?? 0,
      credits_open_time_ms: update.delta_credits_open_time_ms ?? 0,
      share_button_clicked_count: update.delta_share_button_clicked_count ?? 0,
    });
    return created;
  }

  const dbUpdate: TempoLiteDataUpdateAttributes = {
    last_updated: new Date(),
  };

  // We could probably do the same thing with the arrays as we do for the numerical values below
  // It's a bit more complicated since the array types are all different
  // With only four things, it's probably not worth the type gymnastics
  if (update.user_selected_calendar_dates) {
    const selected = data.user_selected_calendar_dates.concat(update.user_selected_calendar_dates);
    dbUpdate.user_selected_calendar_dates = selected;
    dbUpdate.user_selected_calendar_dates_count = selected.length;
  }

  if (update.user_selected_timezones) {
    const selected = data.user_selected_timezones.concat(update.user_selected_timezones);
    dbUpdate.user_selected_timezones = selected;
    dbUpdate.user_selected_timezones_count = selected.length;
  }

  if (update.user_selected_notable_events) {
    const selected = data.user_selected_notable_events.concat(update.user_selected_notable_events);
    dbUpdate.user_selected_notable_events = selected;
    dbUpdate.user_selected_notable_events_count = selected.length;
  }

  if (update.user_selected_locations) {
    const selected = data.user_selected_locations.concat(update.user_selected_locations);
    dbUpdate.user_selected_locations = selected;
    dbUpdate.user_selected_locations_count = selected.length;
  }

  // For the count deltas, it's fine to skip the update logic whether
  // they're null/undefined (nothing to report) or zero (no change)
  const numberEntryKeys = [
    "whats_new_opened_count",
    "whats_new_open_time_ms",
    "introduction_opened_count",
    "introduction_open_time_ms",
    "user_guide_opened_count",
    "user_guide_open_time_ms",
    "about_data_opened_count",
    "about_data_open_time_ms",
    "credits_opened_count",
    "credits_open_time_ms",
    "share_button_clicked_count",
  ] as const;

  for (const key of numberEntryKeys) {
    const updateKey: keyof TempoLiteUpdateT = `delta_${key}`;
    const updateValue = update[updateKey];
    if (updateValue) {
      dbUpdate[key] = data[key] + updateValue;
    }
  }

  const result = await data.update(dbUpdate).catch(_err => null);
  return result;
}
