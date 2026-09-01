import type { Express, Router } from "express";
import type { Sequelize } from "sequelize";

export interface StorySetupParams {
  app: Express;
  db: Sequelize;
  createEndpoints?: boolean;
}

export type StorySetupFunction = (params: StorySetupParams) => void;

export interface StoryInfo {
  path: string,
  router: Express | Router | (() => Router);
  setup: StorySetupFunction;
  createEndpoints: (router: Router) => void;
}
