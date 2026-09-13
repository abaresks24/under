"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { metrics } from "@/lib/offers";
import { addListing, logActivity } from "@/lib/activity";
import { WorldVerify } from "@/components/WorldVerify";

type Tab = "home" | "market" | "sell" | "portfolio" | "desk";

const CTYPES: Record<string, string[]> = {
  AWS: ["Savings Plan", "Reserved Instances", "Enterprise Discount Program"],
  GCP: ["Committed Use Discount", "Spend-based CUD", "Enterprise Agreement"],
  Azure: ["Reservation", "Savings Plan", "Enterprise Agreement"],
};

const usd = (n: number) => "$" + n.toLocaleString("en-US");

export function Sell({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { address, isConnected } = useAccount();
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
      <div>
        <div className="page-head"><div><h1 className="page-title">Listing published</h1><p className="page-sub">Your commitment is now on the market, priced by the v4 time-decay hook.</p></div></div>
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
      </div>
    );
  }

  return (
    <div>
      <div className="page-head"><div><h1 className="page-title">List a commitment</h1><p className="page-sub">Turn unused AWS, Google Cloud or Azure capacity into a tradeable position.</p></div></div>

      <div className="sell-grid">
        {/* form */}
        <div className="card">
          <h2>Commitment details</h2>
          <div className="sub">Describe what you're selling — the market prices it from its maturity.</div>

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
            <div className="tile"><div className="l">Opening discount</div><div className="n good">{preview ? `${preview.discountPct.toFixed(1)}%` : "—"}</div><div className="s">to face value</div></div>
            <div className="tile"><div className="l">Price / $1</div><div className="n">{preview ? `$${preview.price.toFixed(3)}` : "—"}</div><div className="s">USDC per $1 face</div></div>
            <div className="tile"><div className="l">Est. proceeds</div><div className="n">{preview ? usd(Math.round(preview.proceeds)) : "—"}</div><div className="s">if fully sold now</div></div>
            <div className="tile"><div className="l">Matures in</div><div className="n">{preview ? `${preview.monthsLeft.toFixed(0)} mo` : "—"}</div><div className="s">then worthless</div></div>
          </div>

          <div style={{ marginTop: 16 }}>
            {!isConnected ? (
              <button className="btn primary block lg" disabled>Connect wallet to list</button>
            ) : !verified ? (
              <>
                <div className="notice" style={{ marginBottom: 10 }}>Sellers verify with World Selfie Check first — proof a real human authorizes the sale.</div>
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
    </div>
  );
}
