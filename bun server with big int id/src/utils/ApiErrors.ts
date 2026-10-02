class ApiError extends Error {
	statusCode: number;
	messege: string | string[];
	error: string;
	data: null;
	success: false;

	constructor(
		statusCode: number,
		error: string = "Something went wrong",
		messege: string | string[] = [],
		stack?: string
	) {
		super(error);
		this.statusCode = statusCode;
		this.messege = messege;
		this.error = error;
		this.data = null;
		this.success = false;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	toJSON() {
		return {
			statusCode: this.statusCode,
			message: this.messege,
			error: this.error,
			success: this.success,
			data: this.data,
		};
	}
}

export { ApiError };