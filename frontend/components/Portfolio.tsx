"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { addr } from "@/lib/config";
import { tokenAbi, erc20Abi, hookAbi, adapterAbi } from "@/lib/abis";
import { OFFERS } from "@/lib/offers";
import { getActivity, getListings, type Activity, type Listing } from "@/lib/activity";
import { ProviderMark } from "@/components/Brand";

type Tab = "home" | "market" | "sell" | "portfolio" | "desk";

const usd = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const num = (v?: bigint) => (v != null ? Number(formatUnits(v, 6)) : 0);
const when = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const LIVE = OFFERS.filter((o) => o.live && o.token && o.hook);

export function Portfolio({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { address, isConnected } = useAccount();
  const [acts, setActs] = useState<Activity[]>([]);
  const [lists, setLists] = useState<Listing[]>([]);
  useEffect(() => {
    const sync = () => { setActs(getActivity()); setLists(getListings()); };
    sync();
    window.addEventListener("under:store", sync);
    return () => window.removeEventListener("under:store", sync);
  }, []);

  const q = { enabled: !!address };
  const { data: usdc } = useReadContract({ address: addr.usdc, abi: erc20Abi, functionName: "balanceOf", args: [address!], query: q });
  const { data: eligible } = useReadContract({ address: addr.adapter, abi: adapterAbi, functionName: "isEligible", args: [address!], query: q });

  // balance + live factor for every market, in one multicall
  const contracts = useMemo(
    () => LIVE.flatMap((o) => [
      { address: o.token!, abi: tokenAbi as any, functionName: "balanceOf", args: [address!] },
      { address: o.hook!, abi: hookAbi as any, functionName: "currentFactorBips" },
    ]),
    [address]
  );
  const { data: reads } = useReadContracts({ contracts, query: { enabled: !!address } });

  const positions = LIVE.map((o, i) => {
    const bal = num(reads?.[2 * i]?.result as bigint | undefined);
    const factor = Number((reads?.[2 * i + 1]?.result as bigint | undefined) ?? 0n) / 10000;
    return { offer: o, bal, factor, market: bal * factor };
  }).filter((p) => p.bal > 0.000001);

  const marketValue = positions.reduce((s, p) => s + p.market, 0);
  const faceAtMaturity = positions.reduce((s, p) => s + p.bal, 0);
  const upside = Math.max(0, faceAtMaturity - marketValue);
  const invested = acts.filter((a) => a.kind === "buy").reduce((s, a) => s + (a.amountUsd || 0), 0);

  if (!isConnected) {
    return (
      <div>
        <div className="page-head"><div><h1 className="page-title">Portfolio</h1><p className="page-sub">Your positions, history and stats.</p></div></div>
        <div className="card" style={{ maxWidth: 460 }}>
          <div className="sub">Connect your wallet to see your holdings and activity.</div>
          <button className="btn primary" onClick={() => onNavigate("market")}>Browse the market</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head"><div><h1 className="page-title">Portfolio</h1><p className="page-sub">Your positions, history and stats.</p></div>
        <div className="pf-badge">{eligible ? <span className="state ok">● Verified buyer</span> : <span className="state bad">● Not verified</span>}</div>
      </div>

      <div className="pf-stats">
        <div className="stat"><b>{usd(marketValue)}</b><span>Market value of holdings</span></div>
        <div className="stat"><b>{usd(faceAtMaturity)}</b><span>Value at maturity (face)</span></div>
        <div className="stat"><b>{usd(upside)}</b><span>Unrealized upside</span></div>
        <div className="stat"><b>{usd(num(usdc as bigint))}</b><span>USDC balance</span></div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Holdings</h2>
        <div className="sub">On-chain positions read live from Sepolia.</div>
        {positions.length > 0 ? (
          <div className="mkt" style={{ marginTop: 4 }}>
            <div className="mkt-row head" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr" }}><span>Position</span><span className="mkt-hide-sm">Units</span><span className="mkt-hide-sm">Price</span><span>Market value</span><span>At maturity</span></div>
            {positions.map((p) => (
              <div className="mkt-row" key={p.offer.id} style={{ cursor: "default", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr" }}>
                <div className="mkt-asset"><div className="ico"><ProviderMark provider={p.offer.provider} size={18} /></div><div><div className="nm">{p.offer.seller} · cc{p.offer.provider}</div><div className="sub">{p.offer.provider} commitment</div></div></div>
                <span className="mkt-num mkt-hide-sm">{p.bal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                <span className="mkt-num mkt-hide-sm">${p.factor.toFixed(3)}</span>
                <span className="mkt-num">{usd(p.market)}</span>
                <span className="mkt-num" style={{ fontWeight: 600 }}>{usd(p.bal)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="notice">No positions yet. <button className="linkbtn" onClick={() => onNavigate("market")}>Buy a commitment →</button></div>
        )}
      </div>

      {lists.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Your listings</h2>
          <div className="sub">Commitments you've put on the market.</div>
          {lists.map((l) => (
            <div className="row" key={l.id}>
              <span className="k">{l.seller} · cc{l.provider} · {l.ctype}</span>
              <span className="v">{usd(l.faceValue)} · matures {new Date(l.expiry * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Activity</h2>
        <div className="sub">Your recent buys and listings.</div>
        {acts.length === 0 ? (
          <div className="notice">No activity yet.</div>
        ) : (
          <div className="mkt" style={{ marginTop: 4 }}>
            <div className="mkt-row head" style={{ gridTemplateColumns: "1fr 2fr 1.2fr 1fr" }}><span>Type</span><span>Commitment</span><span className="mkt-hide-sm">Amount</span><span>Date</span></div>
            {acts.map((a) => (
              <div className="mkt-row" key={a.id} style={{ cursor: "default", gridTemplateColumns: "1fr 2fr 1.2fr 1fr" }}>
                <span><span className={`mkt-tag ${a.kind === "buy" ? "live" : "preview"}`}>{a.kind === "buy" ? "Buy" : "List"}</span></span>
                <span className="mkt-num" style={{ color: "var(--ink)" }}>{a.label}</span>
                <span className="mkt-num mkt-hide-sm">{a.kind === "buy" ? usd(a.amountUsd || 0) : usd(a.faceValue || 0)}</span>
                <span className="mkt-num">{when(a.ts)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="notice" style={{ marginTop: 12 }}>Invested to date: <b>{usd(invested)}</b>. History is kept locally per browser for this demo; on-chain balances above are read live.</div>
      </div>
    </div>
  );
}
