import { storyRouter } from "../../story_router";
import { WhyRomanData, initializeModels } from "./models";
import { getWhyRomanData, submitWhyRomanData, updateWhyRomanData } from "./database";
import type { StorySetupParams } from "../../types";

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function router() {
 return storyRouter<WhyRomanData>({
    storyName: "why-roman",
    userExperience: true,
    dataTracking: {
      model: WhyRomanData,
      getter: getWhyRomanData,
      updater: updateWhyRomanData,
      submitter: submitWhyRomanData,
    },
  });
}
