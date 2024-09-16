import type { Config } from "jest";

const config: Config = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  coveragePathIgnorePatterns: [
    "/node_modules/",
  ]
};

export default config;
