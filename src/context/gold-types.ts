export type Metal = "gold" | "silver";

export type TxType =
  | "buy"
  | "sell"
  | "sip"
  | "gift_sent"
  | "redeem_order"
  | "silver_buy"
  | "silver_sell";

export type Transaction = {
  id: string;
  type: TxType;
  metal: Metal;
  at: string;
  inr?: number;
  grams?: number;
  note?: string;
  recipient?: string;
};

export type RedeemOrder = {
  id: string;
  createdAt: string;
  metal: Metal;
  grams: number;
  productLabel: string;
  status: "processing" | "shipped" | "delivered";
  addressLine: string;
  city: string;
  pin: string;
};

export type PriceAlert = {
  id: string;
  metal: Metal;
  targetInrPerGram: number;
  active: boolean;
  createdAt: string;
};

export type SipFrequency = "daily" | "weekly" | "monthly";

export type SipState = {
  active: boolean;
  amountInr: number;
  frequency: SipFrequency;
  metal: Metal;
  nextDate?: string;
};

export type ProfileState = {
  displayName: string;
  phone: string;
  kycTier: "none" | "pan_submitted" | "verified";
};

export type SettingsState = {
  priceAlertsEnabled: boolean;
};

export type InAppNotification = {
  id: string;
  message: string;
  at: string;
};
