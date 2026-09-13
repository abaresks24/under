"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { addr } from "@/lib/config";
import { tokenAbi, erc20Abi, hookAbi, adapterAbi, routerAbi } from "@/lib/abis";
import { buildBuyFor } from "@/lib/pool";
import { OFFERS, metrics, type Offer } from "@/lib/offers";
import { getListings, logActivity, type Listing } from "@/lib/activity";
import { ValueCurve } from "@/components/ValueCurve";
import { WorldVerify } from "@/components/WorldVerify";
import { ProviderMark } from "@/components/Brand";

const f6 = (v?: bigint) => (v != null ? Number(formatUnits(v, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");
const usd = (n: number) => "$" + n.toLocaleString("en-US");
const mmm = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });

// user-created listings (from the Sell tab) surface in the market as extra offers
function listingToOffer(l: Listing): Offer {
  return { id: l.id, provider: l.provider as any, seller: l.seller, faceValue: l.faceValue, expiry: l.expiry };
}

export function Market() {
  const [now, setNow] = useState(0);
  const [mine, setMine] = useState<Offer[]>([]);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000);
    const sync = () => setMine(getListings().map(listingToOffer));
    sync();
    window.addEventListener("under:store", sync);
    return () => { clearInterval(t); window.removeEventListener("under:store", sync); };
  }, []);

  const all = useMemo(() => [...mine, ...OFFERS], [mine]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = all.find((o) => o.id === selectedId) || null;

  if (selected) return <OfferDetail offer={selected} now={now} onBack={() => setSelectedId(null)} />;
  return <MarketList offers={all} now={now} onSelect={setSelectedId} />;
}

function MarketList({ offers, now, onSelect }: { offers: Offer[]; now: number; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [prov, setProv] = useState("all");
  const [seller, setSeller] = useState("all");
  const [sort, setSort] = useState("maturity-asc");

  const sellers = useMemo(() => Array.from(new Set(offers.map((o) => o.seller))), [offers]);

  const view = useMemo(() => {
    let v = offers.filter((o) => {
      if (prov !== "all" && o.provider !== prov) return false;
      if (seller !== "all" && o.seller !== seller) return false;
      if (q && !`${o.seller} ${o.provider}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const d = (o: Offer) => (now ? metrics(o.expiry, now).discountPct : 0);
    v = [...v].sort((a, b) => {
      switch (sort) {
        case "maturity-asc": return a.expiry - b.expiry;
        case "maturity-desc": return b.expiry - a.expiry;
        case "discount-desc": return d(b) - d(a);
        case "face-desc": return b.faceValue - a.faceValue;
        default: return 0;
      }
    });
    return v;
  }, [offers, prov, seller, q, sort, now]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Cloud commitment market</h1>
          <p className="page-sub">Unused AWS, Google Cloud and Azure commitments, priced by time to maturity.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search seller or provider" />
        </div>
        <div className="filters">
          <select value={prov} onChange={(e) => setProv(e.target.value)}>
            <option value="all">All providers</option><option>AWS</option><option>GCP</option><option>Azure</option>
          </select>
          <select value={seller} onChange={(e) => setSeller(e.target.value)}>
            <option value="all">All sellers</option>
            {sellers.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="maturity-asc">Maturity: soonest</option>
            <option value="maturity-desc">Maturity: latest</option>
            <option value="discount-desc">Discount: highest</option>
            <option value="face-desc">Face value: largest</option>
          </select>
        </div>
      </div>

      <div className="offers-grid">
        {view.map((o) => {
          const m = metrics(o.expiry, now);
          return (
            <button className="offer-card" key={o.id} onClick={() => onSelect(o.id)}>
              <div className="oc-top">
                <div className="oc-ico"><ProviderMark provider={o.provider} /></div>
                {o.live ? <span className="mkt-tag live">Live</span> : <span className="mkt-tag preview">Listed</span>}
              </div>
              <div className="oc-title">{o.seller}</div>
              <div className="oc-sub">{o.provider} · cc{o.provider} · matures {mmm(o.expiry)}</div>
              <div className="oc-metrics">
                <div><span className="l">Discount</span><span className="v big">{now ? `${m.discountPct.toFixed(1)}%` : "—"}</span></div>
                <div><span className="l">Price / $1</span><span className="v">{now ? `$${m.price.toFixed(3)}` : "—"}</span></div>
              </div>
              <div className="oc-foot">
                <div><span className="l">Face value</span><span>{usd(o.faceValue)}</span></div>
                <div><span className="l">Matures in</span><span>{now ? `${m.monthsLeft.toFixed(0)} mo` : "—"}</span></div>
              </div>
              <div className="oc-cta">View market →</div>
            </button>
          );
        })}
      </div>
      {view.length === 0 && <div className="notice" style={{ marginTop: 18 }}>No commitments match your filters.</div>}
    </div>
  );
}

function OfferDetail({ offer, now, onBack }: { offer: Offer; now: number; onBack: () => void }) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [usdcIn, setUsdcIn] = useState("1000");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [tx, setTx] = useState<`0x${string}` | undefined>();
  const live = !!offer.live;
  const tok = (offer.token ?? addr.token) as `0x${string}`;
  const hk = (offer.hook ?? addr.hook) as `0x${string}`;
  const q = { enabled: live && !!address };

  const { data: eligible, refetch: rEl } = useReadContract({ address: addr.adapter, abi: adapterAbi, functionName: "isEligible", args: [address!], query: q });
  const { data: factorB } = useReadContract({ address: hk, abi: hookAbi, functionName: "currentFactorBips", query: { enabled: live } });
  const { data: onchainExpiry } = useReadContract({ address: tok, abi: tokenAbi, functionName: "expiry", query: { enabled: live } });
  const { data: acme, refetch: rA } = useReadContract({ address: tok, abi: tokenAbi, functionName: "balanceOf", args: [address!], query: q });
  const { data: usdc, refetch: rU } = useReadContract({ address: addr.usdc, abi: erc20Abi, functionName: "balanceOf", args: [address!], query: q });
  const { data: allow, refetch: rAllow } = useReadContract({ address: addr.usdc, abi: erc20Abi, functionName: "allowance", args: [address!, addr.router], query: q });

  const nowS = now || Math.floor(Date.now() / 1000);
  const expiry = live && onchainExpiry ? Number(onchainExpiry) : offer.expiry;
  const m = metrics(expiry, nowS);
  const factor01 = live && factorB != null ? Number(factorB) / 10000 : m.factor;
  const price = factor01.toFixed(3);
  const discount = ((1 - factor01) * 100).toFixed(1);
  const est = factor01 > 0 ? (Number(usdcIn || "0") / factor01).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
  const approved = (allow as bigint | undefined) ? (allow as bigint) > 0n : false;

  const refresh = () => { rEl(); rA(); rU(); rAllow(); };
  const run = async (label: string, fn: () => Promise<`0x${string}`>) => {
    setErr(""); setBusy(label);
    try { const h = await fn(); setTx(h); await new Promise((r) => setTimeout(r, 1800)); refresh(); return h; }
    catch (e: any) { setErr(e?.shortMessage ?? e?.message ?? "transaction failed"); return undefined; }
    finally { setBusy(""); }
  };
  const faucet = () => run("Minting test USDC", () => writeContractAsync({ address: addr.usdc, abi: erc20Abi, functionName: "mint", args: [address!, parseUnits("10000", 6)] }));
  const approve = () => run("Approving", () => writeContractAsync({ address: addr.usdc, abi: erc20Abi, functionName: "approve", args: [addr.router, maxUint256] }));
  const buy = async () => {
    const h = await run("Buying", () => writeContractAsync({ address: addr.router, abi: routerAbi, functionName: "swap", args: buildBuyFor(tok, hk, parseUnits(usdcIn || "0", 6)) as any }));
    if (h) logActivity({ id: h, kind: "buy", provider: offer.provider, label: `${offer.seller} · cc${offer.provider}`, amountUsd: Number(usdcIn || "0"), faceValue: offer.faceValue, tx: h, ts: Math.floor(Date.now() / 1000) });
  };

  // After World verification the desk onboards the address on-chain; poll until eligibility lands.
  const pollEligible = () => {
    let n = 0;
    const iv = setInterval(async () => {
      n++;
      const r = await rEl();
      if ((r as any)?.data || n >= 15) clearInterval(iv);
    }, 3000);
  };

  return (
    <div>
      <button className="btn ghost" onClick={onBack} style={{ marginTop: 22 }}>← Market</button>

      <div className="market-head" style={{ marginTop: 16 }}>
        <div className="asset">
          <div className="ico"><ProviderMark provider={offer.provider} size={26} /></div>
          <div>
            <div className="name">{offer.seller} — {offer.provider} commitment</div>
            <div className="meta">cc{offer.provider} · matures {mmm(expiry)} {live && <span className="mkt-tag live" style={{ marginLeft: 6 }}>Live</span>}</div>
          </div>
        </div>
        <div className="maturity"><div className="lbl">Matures in</div><div className="big">{now ? `${m.monthsLeft.toFixed(0)} mo` : "—"}</div></div>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <div className="tiles">
              <div className="tile"><div className="l">Discount to face</div><div className="n good">{discount}%</div><div className="s">the deal you capture</div></div>
              <div className="tile"><div className="l">Price</div><div className="n">${price}</div><div className="s">USDC per $1 face</div></div>
              <div className="tile"><div className="l">Face value</div><div className="n">{usd(offer.faceValue)}</div><div className="s">commitment</div></div>
              <div className="tile"><div className="l">Maturity</div><div className="n">{mmm(expiry)}</div><div className="s">credit lost after</div></div>
            </div>
          </div>
          <div className="card">
            <h2>Value to maturity</h2>
            <div className="sub">Priced mechanically by the v4 hook from the time left to consume the credit.</div>
            <ValueCurve faceValue={offer.faceValue} expiry={expiry} />
          </div>
        </div>

        <div className="card" style={{ position: "sticky", top: 84 }}>
          <h2>Buy</h2>
          {!live ? (
            <>
              <div className="sub">Listed commitment</div>
              <div className="notice">This commitment isn't settling on Sepolia yet. Open the <b>Acme · AWS</b> market to run the full on-chain buy flow.</div>
            </>
          ) : (
            <>
              <div className="sub">Buy cc{offer.provider} with USDC · verified buyers only.</div>
              <div className="field">
                <div className="top"><span>You pay</span><span className="mono">Balance {f6(usdc as bigint)}</span></div>
                <div className="mid"><input value={usdcIn} onChange={(e) => setUsdcIn(e.target.value)} inputMode="decimal" placeholder="0.0" /><span className="chip-token"><span className="coin" style={{ background: "var(--muted)" }}>$</span>USDC</span></div>
              </div>
              <div className="field">
                <div className="top"><span>You receive (est.)</span><span className="mono">Balance {f6(acme as bigint)}</span></div>
                <div className="mid"><span className="est">≈ {est}</span><span className="chip-token"><span className="coin" style={{ background: "var(--ink)" }}>{offer.provider[0]}</span>cc{offer.provider}</span></div>
              </div>

              {!isConnected ? (
                <button className="btn primary block lg" disabled style={{ marginTop: 12 }}>Connect wallet</button>
              ) : !eligible ? (
                <div style={{ marginTop: 12 }}>
                  <div className="notice" style={{ marginBottom: 10 }}>One step before you buy: verify you're a real, eligible buyer with World ID.</div>
                  <WorldVerify onVerified={pollEligible} label="Verify with World ID to buy" />
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button className="btn ghost" onClick={faucet} disabled={!!busy}>Get test USDC</button>
                    {!approved && <button className="btn ghost" onClick={approve} disabled={!!busy}>Approve</button>}
                  </div>
                  <button className="btn primary block lg" style={{ marginTop: 8 }} onClick={buy} disabled={!!busy || !approved || Number(usdcIn) <= 0}>{busy || `Buy cc${offer.provider}`}</button>
                </>
              )}
              {err && <div className="notice bad mono">{err}</div>}
              {tx && !err && <div className="notice">Recorded: <a className="mono" href={`https://sepolia.etherscan.io/tx/${tx}`} target="_blank" rel="noreferrer">{tx.slice(0, 14)}…</a></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
