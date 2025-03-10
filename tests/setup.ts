import { setupTestDatabase } from "./utils";

export default async () => {
  await setupTestDatabase();
  await new Promise(r => setTimeout(r, 10_000));
};
