"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { addr } from "@/lib/config";
import { tokenAbi, erc20Abi, hookAbi, adapterAbi, routerAbi } from "@/lib/abis";
import { buildBuy } from "@/lib/pool";
import { OFFERS, metrics, type Offer } from "@/lib/offers";
import { ValueCurve } from "@/components/ValueCurve";
import { WorldVerify } from "@/components/WorldVerify";

const f6 = (v?: bigint) => (v != null ? Number(formatUnits(v, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");
const usd = (n: number) => "$" + n.toLocaleString("en-US");
const mmm = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const ico = (p: string) => (p === "Azure" ? "AZ" : p);

export function Market() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000);
    return () => clearInterval(t);
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = OFFERS.find((o) => o.id === selectedId) || null;

  if (selected) return <OfferDetail offer={selected} now={now} onBack={() => setSelectedId(null)} />;
  return <MarketList now={now} onSelect={setSelectedId} />;
}

function MarketList({ now, onSelect }: { now: number; onSelect: (id: string) => void }) {
  return (
    <div>
      <div className="market-head">
        <div className="asset">
          <div><div className="name">Cloud commitment market</div><div className="meta">Unused AWS, GCP and Azure commitments, priced by time to maturity.</div></div>
        </div>
      </div>

      <div className="mkt">
        <div className="mkt-row head">
          <span>Commitment</span>
          <span className="mkt-hide-sm">Maturity</span>
          <span className="mkt-hide-sm">Face value</span>
          <span>Discount</span>
          <span className="mkt-hide-sm">Price</span>
          <span />
        </div>
        {OFFERS.map((o) => {
          const m = metrics(o.expiry, now);
          return (
            <div className="mkt-row" key={o.id} onClick={() => onSelect(o.id)}>
              <div className="mkt-asset">
                <div className="ico">{ico(o.provider)}</div>
                <div><div className="nm">{o.seller} · {o.provider}</div><div className="sub">cc{o.provider} · matures {mmm(o.expiry)}</div></div>
              </div>
              <span className="mkt-num mkt-hide-sm">{now ? `${m.monthsLeft.toFixed(0)} mo` : "—"}</span>
              <span className="mkt-num mkt-hide-sm">{usd(o.faceValue)}</span>
              <span className="mkt-num" style={{ fontWeight: 600 }}>{now ? `${m.discountPct.toFixed(1)}%` : "—"}</span>
              <span className="mkt-num mkt-hide-sm">{now ? `$${m.price.toFixed(3)}` : "—"}</span>
              <span>{o.live ? <span className="mkt-tag live">Live</span> : <span className="mkt-tag preview">Preview</span>}</span>
            </div>
          );
        })}
      </div>
      <div className="notice" style={{ marginTop: 14 }}>One market (<b>Acme · AWS</b>) is live on Sepolia and fully tradeable; the others are representative listings. Click any commitment to open it.</div>
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
  const q = { enabled: live && !!address };

  const { data: eligible, refetch: rEl } = useReadContract({ address: addr.adapter, abi: adapterAbi, functionName: "isEligible", args: [address!], query: q });
  const { data: factorB } = useReadContract({ address: addr.hook, abi: hookAbi, functionName: "currentFactorBips", query: { enabled: live } });
  const { data: onchainExpiry } = useReadContract({ address: addr.token, abi: tokenAbi, functionName: "expiry", query: { enabled: live } });
  const { data: acme, refetch: rA } = useReadContract({ address: addr.token, abi: tokenAbi, functionName: "balanceOf", args: [address!], query: q });
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
    try { const h = await fn(); setTx(h); await new Promise((r) => setTimeout(r, 1800)); refresh(); }
    catch (e: any) { setErr(e?.shortMessage ?? e?.message ?? "transaction failed"); }
    finally { setBusy(""); }
  };
  const faucet = () => run("Minting test USDC", () => writeContractAsync({ address: addr.usdc, abi: erc20Abi, functionName: "mint", args: [address!, parseUnits("10000", 6)] }));
  const approve = () => run("Approving", () => writeContractAsync({ address: addr.usdc, abi: erc20Abi, functionName: "approve", args: [addr.router, maxUint256] }));
  const buy = () => run("Buying", () => writeContractAsync({ address: addr.router, abi: routerAbi, functionName: "swap", args: buildBuy(parseUnits(usdcIn || "0", 6)) as any }));

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
          <div className="ico">{ico(offer.provider)}</div>
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
              <div className="sub">Preview listing</div>
              <div className="notice">This commitment isn't live on Sepolia yet. Open the <b>Acme · AWS</b> market to run the full buy flow.</div>
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
                <div className="mid"><span className="est">≈ {est}</span><span className="chip-token"><span className="coin" style={{ background: "var(--ink)" }}>A</span>ccAWS</span></div>
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
