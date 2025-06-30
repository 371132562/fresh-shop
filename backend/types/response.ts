export enum ErrorCode {
  SUCCESS = 10000,
  PARAM_VALIDATE_FAIL = 40001,
  AUTH_EXPIRED = 40100,
  SYSTEM_ERROR = 50000,
}

export type ResponseBody<T = any> = {
  code: ErrorCode;
  msg: string;
  data: T;
};
