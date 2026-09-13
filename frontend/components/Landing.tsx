"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Brand";
import { ConnectButton } from "@/components/ConnectButton";

export function Landing({ onEnter }: { onEnter: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true; // ensure the muted PROPERTY is set so browsers allow autoplay
      const p = v.play();
      if (p) p.catch(() => {});
    }
  }, []);

  return (
    <>
      {/* cinematic city hero */}
      <div className="video-hero">
        <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline preload="auto">
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="hero-inner">
          <nav className="hero-nav">
            <div className="brand"><Logo light height={20} /></div>
            <div className="hero-nav-right">
              <ConnectButton onVideo />
            </div>
          </nav>
          <main className="hero-copy">
            <h1>Unused cloud commitments, made liquid.</h1>
            <p>
              Companies pay years of AWS, Google Cloud and Azure up front for a discount, then never use
              all of it. Under is where they sell what's left, at a price that follows the time still on
              the clock to spend it.
            </p>
            <div className="hero-cta">
              <button className="btn on-video lg" onClick={onEnter}>Launch app</button>
              <Link className="btn on-video-ghost lg" href="/docs">Read the docs</Link>
            </div>
          </main>
        </div>
      </div>

      {/* presentation of the protocol */}
      <div className="wrap">
        <section className="pres-sec">
          <div className="pres-eyebrow">The protocol</div>
          <h2>A market for capacity that would otherwise expire.</h2>
          <p className="lead">
            A cloud commitment isn't worth a fixed amount. It's worth less the closer it gets to the
            deadline, because there's less time left to spend it, and nothing once that day passes. Under
            turns that into something one company can sell today and another can buy at a discount.
          </p>
        </section>

        <section className="pres-sec">
          <div className="pres-eyebrow">How it works</div>
          <h2>Sell, price, buy. On-chain.</h2>
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
              <h3>Get capacity below face value</h3>
              <p>A verified buyer picks it up cheap and keeps the difference by using the credit before it runs out.</p>
            </div>
          </div>
        </section>

        <section className="pres-sec">
          <div className="pres-eyebrow">Why you can trust it</div>
          <h2>Real sellers, with something to lose.</h2>
          <p className="lead">
            This is a claim on the real world, so the market can't just be anonymous. It has to be able
            to remove bad actors and make buyers whole. Three things make that possible.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h3>A real person behind each sale</h3>
              <p>World Selfie Check confirms there's a human on the other side. It's there to stop fraud, and it isn't KYC.</p>
            </div>
            <div className="feat">
              <h3>Access that can be pulled</h3>
              <p>A seller's right to trade lives in an ENS record. Compliance can switch it off on the spot, and the name never has to move.</p>
            </div>
            <div className="feat">
              <h3>Money on the line</h3>
              <p>Every seller posts a bond. If they cheat, it's taken and paid out to the buyer, right on-chain.</p>
            </div>
          </div>
        </section>

        <section className="pres-sec">
          <div className="pres-eyebrow">Built on</div>
          <div className="builton">
            <span>Uniswap v4 <i>· the time decay hook</i></span>
            <span>ENSv2 <i>· identity you can revoke</i></span>
            <span>World <i>· a real person</i></span>
          </div>
        </section>

        <section className="cta-band">
          <h2>See what's on the market.</h2>
          <p>Browse the live commitments, their discounts and the value curve.</p>
          <div className="home-cta">
            <button className="btn primary lg" onClick={onEnter}>Launch app</button>
            <Link className="btn lg" href="/docs">Read the docs</Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
