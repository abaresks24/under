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
          Companies pay years of AWS, Google Cloud and Azure up front to get a discount, and then never
          use all of it. Under is where they sell what's left. A Uniswap&nbsp;v4 hook sets the price from
          how much time is still on the clock to spend the credit.
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
        <div className="stat"><b>{now ? `${avgDiscount.toFixed(1)}%` : "…"}</b><span>Average discount to face</span></div>
        <div className="stat"><b>{live}</b><span>Live on Sepolia</span></div>
      </section>

      {/* what it solves */}
      <section className="dash-sec">
        <div className="pres-eyebrow">What it solves</div>
        <h2>A wasting asset you can finally trade.</h2>
        <div className="solve-grid">
          <div className="solve">
            <h3>Over $200B committed a year</h3>
            <p>Buying cloud in advance is how big companies get their discount. A lot of it goes to waste, and whatever isn't spent by the deadline is just written off.</p>
          </div>
          <div className="solve">
            <h3>Almost impossible to resell</h3>
            <p>Selling what you won't use means chasing a private deal, if you can find a buyer at all. Most of the time the credit simply runs out.</p>
          </div>
          <div className="solve">
            <h3>Priced by the clock</h3>
            <p>Under wraps the commitment into a token and lets a v4 hook do the pricing. The less time left to spend it, the bigger the discount.</p>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="dash-sec">
        <div className="pres-eyebrow">How it works</div>
        <h2>Sell, price, buy.</h2>
        <div className="steps">
          <div className="step">
            <div className="no">01 List</div>
            <h3>Put up what you won't use</h3>
            <p>A verified seller lists their commitment and it's on the market right away. No broker, no waiting for a counterparty.</p>
          </div>
          <div className="step">
            <div className="no">02 Price</div>
            <h3>The discount follows the clock</h3>
            <p>A Uniswap v4 hook reads how long is left to spend the credit and sets the price. As the deadline gets closer, the discount grows.</p>
          </div>
          <div className="step">
            <div className="no">03 Buy</div>
            <h3>Get capacity below face</h3>
            <p>A verified buyer picks it up cheap and keeps the difference by actually using the credit before it runs out.</p>
          </div>
        </div>
      </section>

      {/* trust */}
      <section className="dash-sec">
        <div className="pres-eyebrow">Why you can trust it</div>
        <h2>Real sellers, with something to lose.</h2>
        <div className="feat-grid">
          <div className="feat"><h3>A real person behind each sale</h3><p>World Selfie Check confirms there's a human on the other side. It's there to stop fraud, and it isn't KYC.</p></div>
          <div className="feat"><h3>Access that can be pulled</h3><p>A seller's right to trade lives in an ENSv2 record. Compliance can switch it off on the spot, and the name never has to move.</p></div>
          <div className="feat"><h3>Money on the line</h3><p>Every seller posts a bond. If they cheat, it's taken and paid out to the buyer, right on-chain.</p></div>
        </div>
      </section>

      {/* built on */}
      <section className="dash-sec last">
        <div className="pres-eyebrow">Built on</div>
        <div className="builton">
          <span>Uniswap v4 <i>· the time decay hook</i></span>
          <span>ENSv2 <i>· identity you can revoke</i></span>
          <span>World <i>· a real person</i></span>
        </div>
      </section>
    </div>
  );
}
