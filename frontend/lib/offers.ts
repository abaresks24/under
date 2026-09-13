export type Provider = "AWS" | "GCP" | "Azure";
export type Offer = {
  id: string;
  provider: Provider;
  seller: string;
  faceValue: number;
  expiry: number;
  live?: boolean;
  token?: `0x${string}`;
  hook?: `0x${string}`;
};

const ts = (d: string) => Math.floor(Date.parse(d) / 1000);
export const HORIZON = 730 * 24 * 3600; // seconds — matches the deployed pools

/**
 * The market catalogue. Every offer is a real, tradeable on-chain market: its own CommitmentToken
 * and its own Uniswap v4 TimeDecayHook, all sharing the eligibility adapter, seller bond and router.
 * Prices/discounts are computed from each offer's maturity via the same time-decay formula the hook
 * uses — the on-chain factor is read live in the detail view.
 */
export const OFFERS: Offer[] = [
  { id: "aws-acme", provider: "AWS", seller: "Acme Corp", faceValue: 100_000, expiry: ts("2028-09-08T00:00:00Z"), live: true, token: "0x4e9698256dC1654876086374B2B2655D97941280", hook: "0x94e886dD5F7D87DfEE94FE42bbdb802eFe954888" },
  { id: "gcp-northwind", provider: "GCP", seller: "Northwind", faceValue: 250_000, expiry: ts("2028-03-15T00:00:00Z"), live: true, token: "0x3420EFa01699a1de4dC0dEE604617240caDbe77f", hook: "0xAFb961e44254e6fF4dc4C0fb5c98E03F5AAC8888" },
  { id: "azure-contoso", provider: "Azure", seller: "Contoso", faceValue: 50_000, expiry: ts("2027-06-15T00:00:00Z"), live: true, token: "0x41bb7fB4183f7e938a88447c82214db1928Ecfa4", hook: "0xB4ea1c650267742dBdE5fFFcceE2777B1D25c888" },
  { id: "aws-globex", provider: "AWS", seller: "Globex", faceValue: 500_000, expiry: ts("2029-03-15T00:00:00Z"), live: true, token: "0xF6e478CF307B5c6d28a62b41f714031b501051b7", hook: "0xFd87e00bA3aAfDED29673233118ddabceF7b0888" },
  { id: "gcp-initech", provider: "GCP", seller: "Initech", faceValue: 75_000, expiry: ts("2027-02-15T00:00:00Z"), live: true, token: "0x27baD6953BfB87D9DFf9Aa01034bfBba0b62ae04", hook: "0x06d1035aac6DDE7695171754d3d0d3F4Be078888" },
  { id: "azure-umbrella", provider: "Azure", seller: "Umbrella", faceValue: 320_000, expiry: ts("2027-12-15T00:00:00Z"), live: true, token: "0xe0B6881E5ce7045CA0F6A13644395B12554a96f0", hook: "0xA540906fe1F3c970dA085c244453cE836711C888" },
  { id: "aws-hooli", provider: "AWS", seller: "Hooli", faceValue: 180_000, expiry: ts("2028-06-15T00:00:00Z"), live: true, token: "0x816538b12989c84FbC30C22ceBD20F06f312eFE6", hook: "0xdFCB60ffB81461dE0DE5A0dd483871Ef7b344888" },
];

export function metrics(expiry: number, now: number) {
  const left = Math.max(0, expiry - now);
  const factor = HORIZON === 0 ? 1 : Math.min(left, HORIZON) / HORIZON;
  return { monthsLeft: left / (30 * 24 * 3600), factor, discountPct: (1 - factor) * 100, price: factor };
}
