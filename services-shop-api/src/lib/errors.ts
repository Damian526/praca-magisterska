export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const NotFound = (co: string) =>
  new AppError(404, "NOT_FOUND", `${co} nie został znaleziony`);

export const BadRequest = (msg: string) =>
  new AppError(400, "BAD_REQUEST", msg);

export const Unauthorized = (msg = "Wymagane uwierzytelnienie") =>
  new AppError(401, "UNAUTHORIZED", msg);

export const Conflict = (msg: string) => new AppError(409, "CONFLICT", msg);
