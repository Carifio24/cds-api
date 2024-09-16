import { describe, it } from "@jest/globals";

import testApp, { authorizedRequest, runApp } from "./utils";

describe("Test root route", () => {
  runApp(testApp);

  it("Should show a welcome message", async () => {
    authorizedRequest(testApp)
      .get("/")
      .expect(200)
      .expect("Content-Type", /json/)
      .expect({ message: "Welcome to the CosmicDS server!" });
  });
});
