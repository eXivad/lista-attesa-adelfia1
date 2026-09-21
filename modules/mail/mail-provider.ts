export interface RegistrationMailInput {
  applicantName: string;
  applicantBirthDate: Date;
  registrationNumber: string;
  recipients: string[];
  bccRecipients: string[];
}

export interface StatusMailInput {
  applicantName: string;
  registrationNumber: string;
  recipients: string[];
  bccRecipients: string[];
}

export interface StaffInvitationMailInput {
  recipient: string;
  staffName: string;
  invitationUrl: string;
  expiresAt: Date;
}

export interface PasswordResetMailInput {
  recipient: string;
  staffName: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface MailProvider {
  sendRegistrationConfirmation(input: RegistrationMailInput): Promise<void>;
  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void>;
  sendRejectionConfirmation(input: StatusMailInput): Promise<void>;
  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void>;
  sendPasswordReset(input: PasswordResetMailInput): Promise<void>;
}
