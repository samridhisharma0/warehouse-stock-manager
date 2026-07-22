// Shared domain types used by both the client and the server.
// Keeping a single source of truth prevents the API contract from drifting
// between the two halves of the app.

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  lowStockThreshold: number;
  // Dimensions/weight are optional at Tier 1 but power the Tier 3 shipping engine.
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'Fulfilled' | 'Partially Fulfilled' | 'Pending';

export interface OrderLine {
  sku: string;
  name: string;
  requestedQty: number;
  fulfilledQty: number;
  backorderedQty: number;
}

export interface Order {
  id: string;
  reference: string;
  items: OrderLine[];
  status: OrderStatus;
  createdAt: string;
}

// ---- API request/response contracts ----

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateOrderRequest {
  items: { sku: string; quantity: number }[];
}

export interface ShippingItemInput {
  sku?: string;
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ShippingRequest {
  originPincode: string;
  destinationPincode: string;
  items: ShippingItemInput[];
}

export interface ShippingBreakdownStep {
  label: string;
  detail: string;
}

export interface ShippingOption {
  vehicle: string;
  vehicleCount: number;
  dispatchCost: number;
  weightCost: number;
  totalCost: number;
  justification: string;
}

export interface ZoneInfo {
  id: string;
  name: string;
  ratePerKg: number;
  description: string;
}

export interface ShippingResponse {
  destinationPincode: string;
  zone: string;
  zoneRatePerKg: number;
  zoneInfo: ZoneInfo;
  totalActualWeightKg: number;
  totalVolumetricWeightKg: number;
  totalChargeableWeightKg: number;
  vehicle: string;
  vehicleCount: number;
  vehicleDispatchCost: number;
  weightCost: number;
  totalCost: number;
  currency: string;
  justification: string;
  breakdown: ShippingBreakdownStep[];
  alternatives: ShippingOption[];
  cheapestOption: ShippingOption;
}

export interface ApiError {
  error: string;
}
