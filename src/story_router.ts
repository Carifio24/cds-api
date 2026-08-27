import { Router } from "express";
import { addUserExperience } from "./mixins/user_experience";
import { AddDataTrackingOptions, addDataTracking } from "./mixins/tracking";
import { addVisit } from "./mixins/visit";
import { BaseTrackingData } from "./models/base_tracking_data";

export interface StoryRouterOptions<Data extends BaseTrackingData<Data>, Update> {
  storyName: string;
  userExperience?: boolean;
  visit?: boolean;
  dataTracking?: AddDataTrackingOptions<Data, Update>;
}

export function storyRouter<Data extends BaseTrackingData<Data>, Update>(options: StoryRouterOptions<Data, Update>): Router {
  const router = Router();

  if (options.userExperience) {
    addUserExperience(router, options);
  } 
  if (options.dataTracking) {
    addDataTracking(router, options.dataTracking);
  }
  if (options.visit ?? true) {
    addVisit(router, options);
  }
  return router;
}
