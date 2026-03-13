import { Request, Response as ExpressResponse, NextFunction } from "express";

import { requestHasPermission } from "./authorization";
import { ALLOWED_ORIGINS } from "./utils";


export async function apiKeyMiddleware(req: Request, res: ExpressResponse, next: NextFunction): Promise<void> {

  if (["/", "/permission", "/docs.json"].includes(req.path)) {
    next();
    return;
  }

  // The whitelisting of hosts is temporary!
  const host = req.headers.origin;
  const validOrigin = host && ALLOWED_ORIGINS.includes(host);
  const { permission, validKey } = await requestHasPermission(req); 
  if (validOrigin || permission) {
    next();
  } else {
    res.statusCode = validKey ? 403 : 401;
    const message = validKey ?
      "Your API key does not provide access to this endpoint!" :
      "You must provide a valid CosmicDS API key!";
    res.json({ message });
    res.end();
  }
}
