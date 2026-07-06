// src/utils/ApiResponse.ts
class ApiResponse {
  statusCode: number;
  data: any;
  messege: string | Record<string, any>;  // ← allow both
  success: boolean;

  constructor(
    statusCode: number,
    data: any = null,
    messege: string | Record<string, any> = "Success"  // ← allow both
  ) {
    this.statusCode = statusCode;
    this.data = data;
    this.messege = messege;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };

// good typo but need to fix the frontend 
// // src/utils/ApiResponse.ts
// class ApiResponse {
//   statusCode: number;
//   data: any;
//   message: string;
//   success: boolean;

//   constructor(
//     statusCode: number,
//     data: any = null,
//     message: string = "Success"
//   ) {
//     this.statusCode = statusCode;
//     this.data = data;
//     this.message = message;
//     this.success = statusCode < 400;
//   }
// }

// export { ApiResponse };