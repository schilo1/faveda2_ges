import type { Role, MovementType, AlertType, AlertSeverity, TransferStatus } from "@prisma/client";

export type { Role, MovementType, AlertType, AlertSeverity, TransferStatus };

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface DashboardStats {
  totalValue: number;
  totalProducts: number;
  outOfStock: number;
  nearMinimum: number;
  nearExpiry: number;
  recentEntries: MovementItem[];
  recentExits: MovementItem[];
  topProducts: TopProduct[];
}

export interface MovementItem {
  id: string;
  productName: string;
  quantity: number;
  type: MovementType;
  date: Date;
  userName: string;
}

export interface TopProduct {
  id: string;
  name: string;
  totalSold: number;
  currentStock: number;
}

export interface ProductWithRelations {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
  expiryDate: Date | null;
  isActive: boolean;
  photo: string | null;
  category: { id: string; name: string };
  unit: { id: string; name: string; abbreviation: string };
  supplier: { id: string; name: string } | null;
}

export interface AlertItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  product: { id: string; name: string; currentStock: number };
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
