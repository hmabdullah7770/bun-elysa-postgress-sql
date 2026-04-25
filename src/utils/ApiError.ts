// src/utils/ApiError.ts

class ApiError extends Error {
  statusCode: number;
  override message: string;
  errors: any[];
  data: null;
  success: false;

  constructor(
    statusCode: number,
    error: string = "Something went wrong",
    message: any[] = [],
    stack?: string
  ) {
    super(error);
    this.statusCode = statusCode;
    this.message = error;
    this.errors = message; // your old code called this "messege" — renamed to "errors"
    this.data = null;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Method to convert the error to JSON format
  // Elysia calls this automatically when returning error responses
  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      success: this.success,
      data: this.data,
    };
  }
}

export { ApiError };