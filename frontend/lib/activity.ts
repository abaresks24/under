"use client";

/**
 * Lightweight client-side store for the demo — buys and listings the user has made this session
 * are kept in localStorage so the Portfolio has real history and stats. On-chain balances are
 * read live; this only tracks intent/history the chain doesn't index for us.
 */

export type Activity = {
  id: string;
  kind: "buy" | "list";
  provider: string;
  label: string;
  amountUsd?: number;
  faceValue?: number;
  tx?: string;
  ts: number;
};

export type Listing = {
  id: string;
  provider: string;
  seller: string;
  ctype: string;
  region?: string;
  faceValue: number;
  expiry: number; // seconds
  ts: number;
};

const AKEY = "under.activity.v1";
const LKEY = "under.listings.v1";

function read<T>(k: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
}
function write<T>(k: string, v: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v.slice(0, 60)));
  window.dispatchEvent(new Event("under:store"));
}

export const getActivity = () => read<Activity>(AKEY);
export const logActivity = (a: Activity) => write(AKEY, [a, ...getActivity()]);

export const getListings = () => read<Listing>(LKEY);
export const addListing = (l: Listing) => write(LKEY, [l, ...getListings()]);
