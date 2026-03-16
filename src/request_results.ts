export type RequestResult = 
  CreateClassResult |
  LoginResult |
  SignUpResult |
  VerificationResult;

export enum CreateClassResult {
  BadRequest = "bad_request",
  Ok = "ok",
  AlreadyExists = "already_exists",
  Error = "error" 
}

export namespace CreateClassResult {
  export function statusCode(result: CreateClassResult): number {
    switch (result) {
      case CreateClassResult.Ok:
        return 201;
      case CreateClassResult.AlreadyExists:
        return 409;
      case CreateClassResult.BadRequest:
      case CreateClassResult.Error:
        return 400;
    }
  }

  export function success(result: CreateClassResult): boolean {
    return result === CreateClassResult.Ok;
  }
}

export enum LoginResult {
  BadRequest = "bad_request",
  BadSession = "bad_session",
  Ok = "ok",
  EmailNotExist = "email_not_exist",
  NotVerified = "not_verified",
  IncorrectPassword = "incorrect_password"
}

export namespace LoginResult {
  export function statusCode(result: LoginResult): number {
    switch (result) {
      case LoginResult.BadRequest:
        return 400;
      case LoginResult.EmailNotExist:
        return 204;
      default:
        return 200;
    }
  }

  export function success(result: LoginResult): boolean {
    return result === LoginResult.Ok;
  }
}

export enum SignUpResult {
  BadRequest = "bad_request",
  Ok = "ok",
  EmailExists = "email_already_exists",
  Error = "error"
}

export namespace SignUpResult {
  export function statusCode(result: SignUpResult): number {
    switch (result) {
      case SignUpResult.Ok:
        return 201;
      case SignUpResult.EmailExists:
        return 409;
      case SignUpResult.BadRequest:
        return 400;
      case SignUpResult.Error:
        return 500;
    }
  }

  export function success(result: SignUpResult): boolean {
    return result === SignUpResult.Ok;
  }
}

export enum VerificationResult {
  BadRequest = "bad_request",
  Ok = "ok",
  AlreadyVerified = "already_verified",
  InvalidCode = "invalid_code",
  Error = "internal_server_error",
}

export namespace VerificationResult {
  export function success(result: VerificationResult): boolean {
    return result === VerificationResult.Ok;
  }
}
