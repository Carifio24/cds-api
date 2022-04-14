export type RequestResult = 
  CreateClassResult |
  LoginResult |
  SignUpResult |
  VerificationResult |
  SubmitHubbleMeasurementResult;

export enum CreateClassResult {
  BadRequest = "bad_request",
  Ok = "ok",
  AlreadyExists = "already_exists",
  Error = "error" 
}

export namespace CreateClassResult {
  export function statusCode(result: CreateClassResult): number {
    switch (result) {
      case CreateClassResult.BadRequest:
        return 400;
      case CreateClassResult.Ok:
        return 201;
      default:
        return 200;
    }
  }
}

export enum LoginResult {
  BadRequest = "bad_request",
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
    return result === SignUpResult.BadRequest ? 400 : 200;
  }

  export function success(result: SignUpResult): boolean {
    return result === SignUpResult.Ok;
  }
}

export enum VerificationResult {
  BadRequest = "bad_request",
  Ok = "ok",
  AlreadyVerified = "already_verified",
  InvalidCode = "invalid_code"
}

export namespace VerificationResult {
  export function success(result: VerificationResult): boolean {
    return result === VerificationResult.Ok;
  }
}

export enum SubmitHubbleMeasurementResult {
  BadRequest = "bad_request",
  MeasurementCreated = "measurement_created",
  MeasurementUpdated = "measurement_updated",
  NoSuchStudent = "no_such_student"
}

export namespace SubmitHubbleMeasurementResult {
  export function success(result: SubmitHubbleMeasurementResult): boolean {
    return result === SubmitHubbleMeasurementResult.MeasurementCreated ||
      result == SubmitHubbleMeasurementResult.MeasurementUpdated;
  }
}
