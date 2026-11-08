export type Module = 'BUDGET' | 'BILLS' | 'AGENDA' | 'DOCUMENTS' | 'SHOPPING' | 'TASKS';
export type Level = 'VIEW' | 'EDIT';
export const MODULES: Module[] = ['BUDGET', 'BILLS', 'AGENDA', 'DOCUMENTS', 'SHOPPING', 'TASKS'];

export interface User { id: number; name: string; email: string; phone?: string; lang: string; openingBalance?: number | null; lastSeenAt?: string | null; }
export interface AuthResponse { token: string; user: User; }

export interface Entry {
  id: number; ownerId: number; module: Module; title: string; note?: string | null;
  amount?: number | null; kind?: string | null; category?: string | null;
  date?: string | null; time?: string | null; status?: string | null; done?: boolean;
}

export interface MemberView { userId: number; name: string; email: string; role: 'ADMIN' | 'MEMBER'; offered: Module[]; }
export interface GrantView { ownerId: number; granteeId: number; module: Module; level: Level; }
export interface FamilyView { id: number; name: string; inviteCode: string; myRole: 'ADMIN' | 'MEMBER'; members: MemberView[]; grants: GrantView[]; }
export interface Viewable { ownerId: number; name: string; modules: Record<string, Level>; }

export interface SubscriptionView { plan: 'FREE' | 'MONTHLY' | 'YEARLY'; trialEndsAt?: string | null; trialActive: boolean; trialUsed: boolean; trialDaysLeft: number; premium: boolean; }
export interface Notif { id: number; kind: 'BILL' | 'EVENT' | 'TASK' | 'DOCUMENT'; title: string; dueDate?: string | null; amount?: number | null; readFlag: boolean; createdAt: string; }
export interface OfferView { id: number; store: string; product: string; price: number; unit?: string | null; validUntil?: string | null; hasPhoto?: boolean; }
export interface AdminUser { id: number; name: string; email: string; lang: string; createdAt: string; lastSeenAt?: string | null; online: boolean; }
export interface AdminOverview { total: number; online: number; day: number; week: number; users: AdminUser[]; }
