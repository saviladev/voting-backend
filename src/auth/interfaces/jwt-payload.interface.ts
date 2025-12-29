export interface JwtPayload {
  sub: string;
  dni: string;
  iat?: number;
  exp?: number;
}
