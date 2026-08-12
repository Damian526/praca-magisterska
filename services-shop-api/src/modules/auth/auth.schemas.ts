import { Type } from "@sinclair/typebox";

export const RegisterBody = Type.Object({
  email: Type.String({ format: "email", maxLength: 120 }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
  fullName: Type.String({ minLength: 2, maxLength: 100 }),
});

export const LoginBody = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 1 }),
});

export const UserDto = Type.Object({
  id: Type.String(),
  email: Type.String(),
  fullName: Type.String(),
});

export const AuthResponse = Type.Object({
  token: Type.String(),
  user: UserDto,
});
