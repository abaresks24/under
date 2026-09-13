"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { addr } from "@/lib/config";
import { tokenAbi, hookAbi } from "@/lib/abis";
import { OFFERS, metrics } from "@/lib/offers";
import { addListing, logActivity } from "@/lib/activity";
import { WorldVerify } from "@/components/WorldVerify";
import { ProviderMark } from "@/components/Brand";

type Tab = "home" | "market" | "sell" | "portfolio" | "desk";

const CTYPES: Record<string, string[]> = {
  AWS: ["Savings Plan", "Reserved Instances", "Enterprise Discount Program"],
  GCP: ["Committed Use Discount", "Spend-based CUD", "Enterprise Agreement"],
  Azure: ["Reservation", "Savings Plan", "Enterprise Agreement"],
};

const usd = (n: number) => "$" + n.toLocaleString("en-US");
const usd2 = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const LIVE = OFFERS.filter((o) => o.live && o.token && o.hook);

export function Sell({ onNavigate, onSell }: { onNavigate: (t: Tab) => void; onSell: (offerId: string) => void }) {
  const { address, isConnected } = useAccount();

  // holdings across every live market, read in one multicall (same source as the Portfolio)
  const contracts = useMemo(
    () => LIVE.flatMap((o) => [
      { address: o.token!, abi: tokenAbi as any, functionName: "balanceOf", args: [address!] },
      { address: o.hook!, abi: hookAbi as any, functionName: "currentFactorBips" },
    ]),
    [address]
  );
  const { data: reads } = useReadContracts({ contracts, query: { enabled: !!address } });
  const positions = LIVE.map((o, i) => {
    const bal = Number(formatUnits((reads?.[2 * i]?.result as bigint | undefined) ?? 0n, 6));
    const factor = Number((reads?.[2 * i + 1]?.result as bigint | undefined) ?? 0n) / 10000;
    return { offer: o, bal, value: bal * factor };
  }).filter((p) => p.bal > 0.000001);

  return (
    <div>
      <div className="page-head"><div><h1 className="page-title">Sell</h1><p className="page-sub">Sell commitments you already hold, or list a new one for sale.</p></div></div>

      {/* sell what you own */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Sell what you own</h2>
        <div className="sub">Your on-chain positions. Sell any of them back to the market for USDC.</div>
        {!isConnected ? (
          <div className="notice">Connect your wallet to see your holdings.</div>
        ) : positions.length === 0 ? (
          <div className="notice">No commitments yet. <button className="linkbtn" onClick={() => onNavigate("market")}>Buy one in the market →</button> and it shows up here to sell.</div>
        ) : (
          <div className="mkt" style={{ marginTop: 4 }}>
            <div className="mkt-row head" style={{ gridTemplateColumns: "2.2fr 1fr 1fr auto" }}><span>Position</span><span className="mkt-hide-sm">Units</span><span>≈ Value</span><span /></div>
            {positions.map((p) => (
              <div className="mkt-row" key={p.offer.id} style={{ cursor: "default", gridTemplateColumns: "2.2fr 1fr 1fr auto" }}>
                <div className="mkt-asset"><div className="ico"><ProviderMark provider={p.offer.provider} size={18} /></div><div><div className="nm">{p.offer.seller} · cc{p.offer.provider}</div><div className="sub">{p.offer.provider} commitment</div></div></div>
                <span className="mkt-num mkt-hide-sm">{p.bal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                <span className="mkt-num">{usd2(p.value)}</span>
                <span><button className="btn primary" onClick={() => onSell(p.offer.id)}>Sell →</button></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* list a new commitment */}
      <ListForm onNavigate={onNavigate} isConnected={isConnected} />
    </div>
  );
}

function ListForm({ onNavigate, isConnected }: { onNavigate: (t: Tab) => void; isConnected: boolean }) {
  const [provider, setProvider] = useState<"AWS" | "GCP" | "Azure">("AWS");
  const [ctype, setCtype] = useState("Savings Plan");
  const [seller, setSeller] = useState("");
  const [region, setRegion] = useState("");
  const [face, setFace] = useState("100000");
  const [expiry, setExpiry] = useState("");
  const [verified, setVerified] = useState(false);
  const [listed, setListed] = useState<string | null>(null);

  const faceN = Number(face || "0");
  const expirySec = expiry ? Math.floor(Date.parse(expiry + "T00:00:00Z") / 1000) : 0;
  const now = Math.floor(Date.now() / 1000);
  const valid = faceN > 0 && expirySec > now && seller.trim().length > 0;

  const preview = useMemo(() => {
    if (!expirySec) return null;
    const m = metrics(expirySec, now);
    return { ...m, proceeds: faceN * m.price };
  }, [expirySec, faceN, now]);

  const publish = () => {
    if (!valid) return;
    const id = `mine-${provider.toLowerCase()}-${expirySec}-${Math.floor(faceN)}`;
    addListing({ id, provider, seller: seller.trim(), ctype, region: region.trim() || undefined, faceValue: faceN, expiry: expirySec, ts: now });
    logActivity({ id, kind: "list", provider, label: `${seller.trim()} · cc${provider}`, faceValue: faceN, ts: now });
    setListed(id);
  };

  if (listed) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="state ok" style={{ fontSize: 15 }}>✓ {seller} · {provider} commitment listed</div>
        <div className="row"><span className="k">Type</span><span className="v">{ctype}</span></div>
        <div className="row"><span className="k">Face value</span><span className="v">{usd(faceN)}</span></div>
        <div className="row"><span className="k">Matures</span><span className="v">{new Date(expirySec * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></div>
        {preview && <div className="row"><span className="k">Opening discount</span><span className="v">{preview.discountPct.toFixed(1)}%</span></div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn primary" onClick={() => onNavigate("market")}>View in market</button>
          <button className="btn ghost" onClick={() => { setListed(null); setSeller(""); setVerified(false); }}>List another</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sect"><span className="num">+</span><h2>List a new commitment</h2></div>
      <div className="sell-grid">
        {/* form */}
        <div className="card">
          <h2>Commitment details</h2>
          <div className="sub">Tell buyers what you're selling. The market sets the price from the maturity date.</div>

          <div className="form-row">
            <div>
              <label>Provider</label>
              <select value={provider} onChange={(e) => { const p = e.target.value as any; setProvider(p); setCtype(CTYPES[p][0]); }}>
                <option>AWS</option><option>GCP</option><option>Azure</option>
              </select>
            </div>
            <div>
              <label>Commitment type</label>
              <select value={ctype} onChange={(e) => setCtype(e.target.value)}>
                {CTYPES[provider].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label>Organization / seller name</label>
          <input value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="Acme Corp" />

          <div className="form-row">
            <div>
              <label>Face value (USD)</label>
              <input value={face} onChange={(e) => setFace(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="100000" />
            </div>
            <div>
              <label>Region (optional)</label>
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" />
            </div>
          </div>

          <label>Maturity date</label>
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>

        {/* preview + publish */}
        <div className="card" style={{ position: "sticky", top: 84 }}>
          <h2>Listing preview</h2>
          <div className="sub">How the hook prices it today.</div>
          <div className="tiles" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="tile"><div className="l">Opening discount</div><div className="n good">{preview ? `${preview.discountPct.toFixed(1)}%` : "…"}</div><div className="s">to face value</div></div>
            <div className="tile"><div className="l">Price / $1</div><div className="n">{preview ? `$${preview.price.toFixed(3)}` : "…"}</div><div className="s">USDC per $1 face</div></div>
            <div className="tile"><div className="l">Est. proceeds</div><div className="n">{preview ? usd(Math.round(preview.proceeds)) : "…"}</div><div className="s">if fully sold now</div></div>
            <div className="tile"><div className="l">Matures in</div><div className="n">{preview ? `${preview.monthsLeft.toFixed(0)} mo` : "…"}</div><div className="s">then worthless</div></div>
          </div>

          <div style={{ marginTop: 16 }}>
            {!isConnected ? (
              <button className="btn primary block lg" disabled>Connect wallet to list</button>
            ) : !verified ? (
              <>
                <div className="notice" style={{ marginBottom: 10 }}>Sellers verify with World Selfie Check first, to confirm a real person is behind the sale.</div>
                <WorldVerify onVerified={() => setVerified(true)} label="Verify with World ID to list" />
              </>
            ) : (
              <>
                <div className="notice" style={{ marginBottom: 10 }}>✓ Verified. Review the terms and publish your listing.</div>
                <button className="btn primary block lg" onClick={publish} disabled={!valid}>Publish listing</button>
                {!valid && <div className="notice bad" style={{ marginTop: 8 }}>Enter a seller name, a positive face value and a future maturity date.</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
