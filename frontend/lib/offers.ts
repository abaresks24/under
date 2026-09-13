export type Provider = "AWS" | "GCP" | "Azure";
export type Offer = { id: string; provider: Provider; seller: string; faceValue: number; expiry: number; live?: boolean };

const ts = (d: string) => Math.floor(Date.parse(d) / 1000);
export const HORIZON = 730 * 24 * 3600; // seconds — matches the deployed pool

/**
 * The market catalogue. One offer (`live`) is the real on-chain market (ccAWS, tradeable on Sepolia);
 * the others are representative listings so the market looks in place. Prices/discounts are computed
 * from each offer's maturity via the same time-decay formula the hook uses — nothing hardcoded.
 */
export const OFFERS: Offer[] = [
  { id: "aws-acme", provider: "AWS", seller: "Acme Corp", faceValue: 100_000, expiry: ts("2028-09-08T00:00:00Z"), live: true },
  { id: "gcp-northwind", provider: "GCP", seller: "Northwind", faceValue: 250_000, expiry: ts("2028-03-15T00:00:00Z") },
  { id: "azure-contoso", provider: "Azure", seller: "Contoso", faceValue: 50_000, expiry: ts("2027-06-15T00:00:00Z") },
  { id: "aws-globex", provider: "AWS", seller: "Globex", faceValue: 500_000, expiry: ts("2029-03-15T00:00:00Z") },
  { id: "gcp-initech", provider: "GCP", seller: "Initech", faceValue: 75_000, expiry: ts("2027-02-15T00:00:00Z") },
  { id: "azure-umbrella", provider: "Azure", seller: "Umbrella", faceValue: 320_000, expiry: ts("2027-12-15T00:00:00Z") },
  { id: "aws-hooli", provider: "AWS", seller: "Hooli", faceValue: 180_000, expiry: ts("2028-06-15T00:00:00Z") },
];

export function metrics(expiry: number, now: number) {
  const left = Math.max(0, expiry - now);
  const factor = HORIZON === 0 ? 1 : Math.min(left, HORIZON) / HORIZON;
  return { monthsLeft: left / (30 * 24 * 3600), factor, discountPct: (1 - factor) * 100, price: factor };
}
