export interface AuthenticatedUserDTO {
  email: string;
  clientId: string;
}

export interface AuthValidationResponse {
  valid: boolean;
  user?: {
    email: string;
    clientId: string;
  };
  error?: string;
}
