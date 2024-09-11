import { Request, Response as ExpressResponse, NextFunction } from "express";

import { getAPIKey, hasPermission } from "./authorization";
import { ALLOWED_ORIGINS } from "./utils";


export async function apiKeyMiddleware(req: Request, res: ExpressResponse, next: NextFunction): Promise<void> {

  if (req.originalUrl === "/") {
    next();
    return;
  }

  // The whitelisting of hosts is temporary!
  const host = req.headers.origin;
  const validOrigin = host && ALLOWED_ORIGINS.includes(host);
  const key = req.get("Authorization");
  const apiKey = key ? await getAPIKey(key) : null;
  const apiKeyExists = apiKey !== null;
  if (validOrigin || (apiKeyExists && hasPermission(apiKey, req))) {
    next();
  } else {
    res.statusCode = apiKeyExists ? 403 : 401;
    const message = apiKeyExists ?
      "Your API key does not provide permission to access this endpoint!" :
      "You must provide a valid CosmicDS API key!";
    res.json({ message });
    res.end();
  }
}
