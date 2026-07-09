// `sub` (subject) is the JWT-standard claim name for "who this token is about" —
// JwtStrategy reads it back off the verified token to identify the requesting user.
export interface JwtPayload {
  sub: string;
  email: string;
}
