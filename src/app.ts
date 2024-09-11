import { Express } from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import { Sequelize } from "sequelize";
import sequelizeStore from "connect-session-sequelize";
import { v4 } from "uuid";

import { apiKeyMiddleware } from "./middleware";
import { ALLOWED_ORIGINS } from "./utils";

export function setupApp(app: Express, db: Sequelize) {

  const corsOptions: CorsOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  
  const PRODUCTION = process.env.NODE_ENV === "production";
  const SESSION_MAX_AGE = 24 * 60 * 60; // in seconds

  app.use(cors(corsOptions));
  app.use(cookieParser());
  const SequelizeStore = sequelizeStore(session.Store);
  const store = new SequelizeStore({
    db,
    table: "CosmicDSSession", // We need to use the model name instead of the table name (here they are different)
    checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds
    expiration: SESSION_MAX_AGE * 1000, // The maximum age (in milliseconds) of a valid session
    extendDefaultFields: function (defaults, sess) {
      return {
        data: defaults.data,
        expires: defaults.expires,
        user_id: sess.user_id,
        username: sess.username,
        email: sess.email
      };
    }
  });
  
  
  const SECRET = "ADD_REAL_SECRET";
  const SESSION_NAME = "cosmicds";
  
  app.set("trust proxy", 1);
  app.use(session({
    secret: SECRET,
    genid: (_req) => v4(),
    store: store,
    name: SESSION_NAME,
    saveUninitialized: false,
    resave: true,
    cookie: {
      path: "/",
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: PRODUCTION
    }
  }));
  store.sync();

  app.use(apiKeyMiddleware);
  
  // parse requests of content-type - application/json
  app.use(bodyParser.json());
  
  // parse requests of content-type - application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }));
  
  app.use(function(req, res, next) {
  
    const origin = req.get("origin");
    if (origin !== undefined && ALLOWED_ORIGINS.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    next();
  });

  app.all("*", (req, _res, next) => {
    console.log(req.session.id);
    next();
  });

}
