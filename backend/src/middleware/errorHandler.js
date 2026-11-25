import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { log } from "../lib/logger.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {},
    });
    if (!result.success) {
      return next(new AppError(400, "VALIDATION_ERROR", "Check the highlighted fields", formatIssues(result.error)));
    }
    req.valid = result.data;
    next();
  };
}

export function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.filter((part) => part !== "body" && part !== "query" && part !== "params").join("."),
    message: issue.message,
  }));
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields", details: formatIssues(err) },
    });
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: { code: "FILE_TOO_LARGE", message: "Images must be 5 MB or smaller" },
    });
  }

  if (err instanceof AppError) {
    if (err.status >= 500) log("error", err.message, { code: err.code, path: req.path });
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  log("error", "request failed", { message: err?.message || "unknown", path: req.path, code: err?.code });
  const message = env.NODE_ENV === "production" ? "Something went wrong" : (err?.message || "Something went wrong");
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
}
