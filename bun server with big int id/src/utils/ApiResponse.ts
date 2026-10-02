class ApiResponse<T = unknown> {
	statusCode: number;
	data: T;
	messege: string | Record<string, unknown>;
	success: boolean;

	constructor(
		statusCode: number,
		data: T,
		messege: string | Record<string, unknown> = "Success"
	) {
		this.statusCode = statusCode;
		this.data = data;
		this.messege = messege;
		this.success = statusCode < 400;
	}
}

export { ApiResponse };