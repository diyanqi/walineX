export const CAP_SCOPES = {
  registration: "registration",
  login: "login",
  instance: "instance",
  comment: "comment",
} as const;

export type CapScope = (typeof CAP_SCOPES)[keyof typeof CAP_SCOPES];
