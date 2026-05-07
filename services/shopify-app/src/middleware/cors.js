import { env } from "../config/env.js";

const DEV_WEB_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8082",
  "http://localhost:19006",
  "http://127.0.0.1:19006"
];

const buildAllowedOrigins = () => {
  const configuredOrigins = env.corsAllowedOrigins;

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  // Keep localhost web clients working even when the shared env file uses
  // production-like values for remote staging or deployed backends.
  return [env.atribeBaseUrl, ...DEV_WEB_ORIGINS];
};

const allowedOrigins = new Set(buildAllowedOrigins());
const ALLOWED_HEADERS = "Authorization, Content-Type, Accept, X-Requested-With";
const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";

function appendVaryHeader(currentValue, nextValue) {
  if (!currentValue) {
    return nextValue;
  }

  const values = new Set(
    String(currentValue)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  values.add(nextValue);
  return Array.from(values).join(", ");
}

function setCorsHeaders(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Vary", appendVaryHeader(res.getHeader("Vary"), "Origin"));
}

export function corsMiddleware(req, res, next) {
  const origin = String(req.headers.origin || "").trim();
  const isAllowedOrigin = origin && allowedOrigins.has(origin);

  if (isAllowedOrigin) {
    setCorsHeaders(res, origin);
  }

  if (req.method === "OPTIONS") {
    if (isAllowedOrigin) {
      return res.status(204).end();
    }

    return res.status(403).json({
      error: "Origin not allowed."
    });
  }

  return next();
}
