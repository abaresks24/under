"use client";

import { useEffect, useState } from "react";
import { OFFERS, metrics } from "@/lib/offers";

type Tab = "home" | "market" | "sell" | "portfolio" | "desk";

const usd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;

export function Home({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Math.floor(Date.now() / 1000)); }, []);

  const totalFace = OFFERS.reduce((s, o) => s + o.faceValue, 0);
  const live = OFFERS.filter((o) => o.live).length;
  const avgDiscount = now
    ? OFFERS.reduce((s, o) => s + metrics(o.expiry, now).discountPct, 0) / OFFERS.length
    : 0;

  return (
    <div className="dash">
      {/* hero */}
      <section className="dash-hero">
        <div className="pres-eyebrow">The protocol</div>
        <h1>Unused cloud commitments, made liquid.</h1>
        <p>
          Enterprises pre-pay years of AWS, Google Cloud and Azure to unlock discounts — then leave much
          of it unused. Under is the secondary market where they resell that capacity, priced by a
          Uniswap&nbsp;v4 hook from the time left to consume the credit.
        </p>
        <div className="dash-cta">
          <button className="btn primary lg" onClick={() => onNavigate("market")}>Browse the market</button>
          <button className="btn lg" onClick={() => onNavigate("sell")}>List a commitment</button>
        </div>
      </section>

      {/* live figures */}
      <section className="stat-strip">
        <div className="stat"><b>{usd(totalFace)}</b><span>Face value listed</span></div>
        <div className="stat"><b>{OFFERS.length}</b><span>Commitments on the market</span></div>
        <div className="stat"><b>{now ? `${avgDiscount.toFixed(1)}%` : "—"}</b><span>Average discount to face</span></div>
        <div className="stat"><b>{live}</b><span>Live on Sepolia</span></div>
      </section>

      {/* what it solves */}
      <section className="dash-sec">
        <div className="pres-eyebrow">What it solves</div>
        <h2>A wasting asset, finally tradeable.</h2>
        <div className="solve-grid">
          <div className="solve">
            <h3>$200B+ committed each year</h3>
            <p>Cloud commitments are how enterprises buy discounts. A large share is never consumed — pure sunk cost written off at expiry.</p>
          </div>
          <div className="solve">
            <h3>Illiquid and bilateral</h3>
            <p>Reselling unused capacity today means slow, opaque OTC deals — if it's possible at all. Most of it simply expires unused.</p>
          </div>
          <div className="solve">
            <h3>Priced by time, on-chain</h3>
            <p>Under tokenizes the commitment and lets a v4 hook price it mechanically: the discount widens as the credit nears expiry.</p>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="dash-sec">
        <div className="pres-eyebrow">How it works</div>
        <h2>Sell, price, buy.</h2>
        <div className="steps">
          <div className="step">
            <div className="no">01 — List</div>
            <h3>Tokenize what you won't use</h3>
            <p>A verified seller lists their commitment. It hits the market instantly — no OTC deal, no waiting.</p>
          </div>
          <div className="step">
            <div className="no">02 — Price</div>
            <h3>The discount tracks maturity</h3>
            <p>A Uniswap v4 hook prices it from the time left to consume the credit; the discount widens as expiry nears.</p>
          </div>
          <div className="step">
            <div className="no">03 — Buy</div>
            <h3>Acquire capacity below face</h3>
            <p>A verified buyer picks it up at a discount and captures the spread by consuming the credit before it expires.</p>
          </div>
        </div>
      </section>

      {/* trust */}
      <section className="dash-sec">
        <div className="pres-eyebrow">Trust, minimized in layers</div>
        <h2>Verified sellers. Real skin in the game.</h2>
        <div className="feat-grid">
          <div className="feat"><h3>Proof of human</h3><p>World Selfie Check proves a real person authorizes the sale — an anti-fraud signal, not KYC.</p></div>
          <div className="feat"><h3>Revocable identity</h3><p>Eligibility is an ENSv2 credential a delegated compliance role can revoke live — without ever moving the name.</p></div>
          <div className="feat"><h3>Collateral bond</h3><p>Sellers post a bond that is slashed to a compensation pool on fraud, so a buyer is made whole on-chain.</p></div>
        </div>
      </section>

      {/* built on */}
      <section className="dash-sec last">
        <div className="pres-eyebrow">Built on</div>
        <div className="builton">
          <span>Uniswap v4 <i>· the time-decay hook</i></span>
          <span>ENSv2 <i>· portable, revocable identity</i></span>
          <span>World <i>· proof of human</i></span>
        </div>
      </section>
    </div>
  );
}
