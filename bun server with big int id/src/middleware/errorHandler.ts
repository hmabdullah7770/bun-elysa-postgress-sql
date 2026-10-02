import { ApiError } from "../utils/ApiError";

export const handleElysiaError = ({ error, set, code }: any) => {
  if (error instanceof ApiError) {
    set.status = error.statusCode;
    return {
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      data: null,
    };
  }

  if (code === "VALIDATION") {
    set.status = 400;
    return {
      success: false,
      statusCode: 400,
      message: "Validation Error",
      errors: error.all,
      data: null,
    };
  }

  if (code === "NOT_FOUND") {
    set.status = 404;
    return { success: false, statusCode: 404, message: "Route not found", data: null };
  }

  if (code === "PARSE") {
    set.status = 400;
    return { success: false, statusCode: 400, message: "Invalid request body", data: null };
  }

  console.error("Unhandled request error:", error);
  set.status = 500;
  return {
    success: false,
    statusCode: 500,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Internal server error",
    data: null,
  };
};