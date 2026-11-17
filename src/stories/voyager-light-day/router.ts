import { storyRouter } from "../../story_router";
import { VoyagerLightDayData, initializeModels } from "./models";
import { getVoyagerLightDayData, submitVoyagerLightDayData, updateVoyagerLightDayData } from "./database";
import type { StorySetupParams } from "../../types";

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function router() {
  return storyRouter<VoyagerLightDayData>({
    storyName: "voyager-light-day",
    userExperience: true,
    dataTracking: {
      model: VoyagerLightDayData,
      getter: getVoyagerLightDayData,
      updater: updateVoyagerLightDayData,
      submitter: submitVoyagerLightDayData,
    },
  });
}
