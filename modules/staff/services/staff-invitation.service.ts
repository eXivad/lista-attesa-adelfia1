import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import type { StaffInvitationMailInput } from "@/modules/mail/mail-provider";
import type { UserRole } from "@/modules/auth/authorization";

const invitationSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  role: z.enum(["ADMIN", "STAFF"]),
  createdById: z.string().min(1),
});

export type StaffInvitationInput = z.input<typeof invitationSchema>;
export type ValidatedStaffInvitation = z.output<typeof invitationSchema>;

export interface CreateStaffInvitationCommand extends ValidatedStaffInvitation {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PendingStaffInvitation {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface StaffInvitationRepository {
  create(command: CreateStaffInvitationCommand): Promise<{ invitationId: string; outboxId: string }>;
  findValidByTokenHash(tokenHash: string, now: Date): Promise<PendingStaffInvitation | null>;
  markAccepted(invitationId: string, acceptedAt: Date): Promise<boolean>;
  markMailDelivered(outboxId: string, deliveredAt: Date): Promise<void>;
  markMailFailed(outboxId: string, failedAt: Date, reason: string): Promise<void>;
}

export interface StaffAccountProvisioner {
  create(input: PendingStaffInvitation & { password: string }): Promise<{ id: string }>;
}

export interface StaffInvitationMailProvider {
  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void>;
}

export type StaffInvitationErrorCode = "INVALID_INPUT" | "INVALID_PASSWORD" | "INVITATION_EXPIRED" | "CONCURRENT_CHANGE";

export class StaffInvitationError extends Error {
  constructor(public readonly code: StaffInvitationErrorCode, public readonly userMessage: string) {
    super(userMessage);
    this.name = "StaffInvitationError";
  }
}

interface StaffInvitationServiceOptions {
  repository: StaffInvitationRepository;
  accountProvisioner: StaffAccountProvisioner;
  mailProvider: StaffInvitationMailProvider;
  baseUrl: string;
  tokenFactory?: () => string;
  clock?: () => Date;
}

export class StaffInvitationService {
  private readonly clock: () => Date;
  private readonly tokenFactory: () => string;

  constructor(private readonly options: StaffInvitationServiceOptions) {
    this.clock = options.clock ?? (() => new Date());
    this.tokenFactory = options.tokenFactory ?? (() => randomBytes(32).toString("base64url"));
  }

  async invite(input: StaffInvitationInput) {
    const parsed = invitationSchema.safeParse(input);
    if (!parsed.success) throw new StaffInvitationError("INVALID_INPUT", "Controlla i dati del Capo.");
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000);
    const token = this.tokenFactory();
    const created = await this.options.repository.create({
      ...parsed.data,
      tokenHash: tokenHash(token),
      expiresAt,
      createdAt: now,
    });

    try {
      await this.options.mailProvider.sendStaffInvitation({
        recipient: parsed.data.email,
        staffName: `${parsed.data.firstName} ${parsed.data.lastName}`,
        invitationUrl: `${this.options.baseUrl.replace(/\/$/, "")}/invito/${encodeURIComponent(token)}`,
        expiresAt,
      });
      await this.options.repository.markMailDelivered(created.outboxId, now);
    } catch (error) {
      await this.options.repository.markMailFailed(
        created.outboxId,
        now,
        error instanceof Error ? error.message : "Errore provider email",
      );
    }
    return { invitationId: created.invitationId, expiresAt };
  }

  async accept(token: string, password: string) {
    const passwordResult = z.string().min(12).max(128).safeParse(password);
    if (!passwordResult.success) {
      throw new StaffInvitationError("INVALID_PASSWORD", "La password deve contenere almeno 12 caratteri.");
    }
    const now = this.clock();
    const invitation = await this.options.repository.findValidByTokenHash(tokenHash(token), now);
    if (!invitation) {
      throw new StaffInvitationError("INVITATION_EXPIRED", "L'invito non è valido o è scaduto. Chiedi un nuovo invito al Capo Gruppo.");
    }
    const account = await this.options.accountProvisioner.create({ ...invitation, password: passwordResult.data });
    if (!await this.options.repository.markAccepted(invitation.id, now)) {
      throw new StaffInvitationError("CONCURRENT_CHANGE", "L'invito è già stato utilizzato.");
    }
    return account;
  }
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
