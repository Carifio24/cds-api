import { describe, it } from "@jest/globals";

import testApp, { authorizedRequest } from "./utils";

describe("Test root route", async() => {
  it("Should show a welcome message", async () => {
    authorizedRequest(testApp)
      .get("/")
      .expect(200)
      .expect("Content-Type", /json/)
      .expect({ message: "Welcome to the CosmicDS server!" });
  });
});
