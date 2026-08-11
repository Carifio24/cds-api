import type { Express, IRouter } from "express";
import { DataTypes, type Model, type ModelAttributeColumnOptions, type ModelStatic } from "sequelize";
import swaggerJSDoc, { OAS3Options, PathItem, Schema } from "swagger-jsdoc";
import swaggerUi, { SwaggerUiOptions } from "swagger-ui-express";
import { SwaggerTheme, SwaggerThemeNameEnum } from "swagger-themes";
import { GenericRequest, GenericResponse } from "../utils";
import { middleware as openApiValidatorMiddleware } from "express-openapi-validator";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";


function typeInfoForAttribute<M extends Model>(attribute: ModelAttributeColumnOptions<M>): Record<string, unknown> | null{
  const type: string = typeof attribute.type === "string" ? attribute.type : attribute.type.key;

  const stringTypes = [DataTypes.STRING, DataTypes.TEXT].map(t => t.key);
  if (stringTypes.includes(type)) {
    return { type: "string" };
  }
  if (type == DataTypes.ENUM.key) {
    return {
      type: "string", 
      enum: attribute.values
    };
  }
  if (type == DataTypes.DATE.key) {
    return {
      type: "string", 
      format: "date-time" 
    };
  }
  if (type == DataTypes.DATEONLY.key) {
    return {
      type: "string", 
      format: "date" 
    };
  }

  const intTypes = [DataTypes.INTEGER, DataTypes.INTEGER.UNSIGNED].map(t => t.key);
  if (intTypes.includes(type)) {
    return {
      type: "integer", 
      format: "int32" 
    };
  }

  const bigIntTypes = [DataTypes.BIGINT, DataTypes.BIGINT.UNSIGNED].map(t => t.key);
  if (bigIntTypes.includes(type)) {
    return {
      type: "integer", 
      format: "int64" 
    };
  }

  if (type == DataTypes.FLOAT.key) {
    return {
      type: "number",
    };
  }

  if (type == DataTypes.BOOLEAN.key) {
    return { type: "boolean" };
  }

  if (type == DataTypes.JSON.key) {
    return { type: "object" };
  }
  
  return null;
}

export function modelToSchema<M extends Model>(modelType: ModelStatic<M>): Schema {
  const required: string[] = [];
  const properties: Record<string, Record<string, unknown>> = {};

  const attributes = modelType.getAttributes();
  Object.entries(attributes).forEach(([key, attr]) => {
    let info = typeInfoForAttribute(attr);
    if (info == null) {
      return;
    }

    if (!attr.allowNull && attr.defaultValue !== null) {
      required.push(key);
    } else {
      if ("enum" in info || "format" in info) {
        info = { oneOf: [info, {type: "null"}] };
      } else {
        info["type"] = [info["type"], "null"];
      }
    }
    properties[key] = info;
  });

  return {
    type: "object",
    required,
    properties,
  };
}

export interface SwaggerSetupOptions {
  router: IRouter;
  swaggerOptions: OAS3Options;
  name: string;
  basePath: string;
  docsPath?: string;
  title?: string;
  theme?: SwaggerThemeNameEnum;
}

const swaggerOptions: SwaggerSetupOptions[] = [];

export function registerSwaggerDocs(options: SwaggerSetupOptions) {
  swaggerOptions.push(options);
}

const pathTypes: (keyof PathItem)[] = ["get", "put", "post", "delete", "options", "head"];

type GenericObject = Record<string, unknown>;
function filterTags(spec: GenericObject) {

  const tags = spec.tags as { name: string; description: string; }[] | undefined;
  if (!tags) {
    return;
  }

  const paths = spec.paths as GenericObject[] | undefined;
  if (!paths) {
    return;
  }

  const usedTags = new Set<string>();
  Object.values(paths).forEach((path: GenericObject) => {
    const type = pathTypes.find(type => type in path);
    if (type) {
      const typeData = path[type] as GenericObject;
      const tags = typeData.tags as string[];
      tags?.forEach((tag: string) => usedTags.add(tag));
    }
  });

  spec.tags = tags.filter(tag => usedTags.has(tag["name"]));
}

export function setupSwaggerDocs(app: Express) {

  const defaultDocsPath = "/docs";
  const urls = swaggerOptions.map(options => {
    const docsPath = options.docsPath ?? defaultDocsPath;
    return {
      url: `${options.basePath}${docsPath}.json`,
      name: options.name,
    };
  });

  swaggerOptions.forEach(options => {
    const router = options.router;
    const swaggerSpec = swaggerJSDoc(options.swaggerOptions);
    filterTags(swaggerSpec as GenericObject);

    const docsPath = options.docsPath ?? defaultDocsPath;
    router.get(`${docsPath}.json`, (_req: GenericRequest, res: GenericResponse) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });

    if (process.env.NODE_ENV === "test") {
      console.info("SETTING UP MIDDLEWARE");
      router.use(
        openApiValidatorMiddleware({
          apiSpec: swaggerSpec as OpenAPIV3.DocumentV3_1,
          validateRequests: false,
          validateResponses: {
            onError: (error, _json) => {
              console.log("OPENAPI ERROR");
              console.error(error.message);
              console.error(error.errors);
              throw new Error(error.message);
            },
          },
          useRequestUrl: true,
          ajvFormats: ["date-time", "date", "int32"],
          unknownFormats: ["email"],
        })
      );
    }
  });

  const baseOptions = swaggerOptions[0];
  const theme = new SwaggerTheme();
  const swaggerUIOptions: SwaggerUiOptions = {
    explorer: true,
    customSiteTitle: baseOptions.title ?? "CosmicDS Database API",
    customCss: theme.getBuffer(baseOptions.theme ?? SwaggerThemeNameEnum.GRUVBOX),
    swaggerOptions: {
      urls,
      "urls.primaryName": "Base",
    }
  };

  const docsPath = baseOptions.docsPath ?? defaultDocsPath;
  app.use(docsPath, swaggerUi.serveFiles(undefined, swaggerUIOptions));
  app.get(docsPath, swaggerUi.serve, swaggerUi.setup(null, swaggerUIOptions));
}
