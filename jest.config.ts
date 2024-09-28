import type { Config } from "jest";

const config: Config = {
  verbose: true,
  silent: false,
  preset: "ts-jest",
  testEnvironment: "node",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist",
  ]
};

export default config;
