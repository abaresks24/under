"use client";

import { useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Landing } from "@/components/Landing";
import { Home } from "@/components/Home";
import { Market } from "@/components/Market";
import { Sell } from "@/components/Sell";
import { Portfolio } from "@/components/Portfolio";
import { Desk } from "@/components/Desk";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Brand";

type Tab = "home" | "market" | "sell" | "portfolio" | "desk";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "market", label: "Market" },
  { id: "sell", label: "Sell" },
  { id: "portfolio", label: "Portfolio" },
  { id: "desk", label: "Desk" },
];

export default function Page() {
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [openOffer, setOpenOffer] = useState<{ id: string; side: "buy" | "sell" } | null>(null);

  if (!entered) return <Landing onEnter={() => { setTab("home"); setEntered(true); }} />;

  const scrollTop = () => { if (typeof window !== "undefined") window.scrollTo({ top: 0 }); };
  const go = (t: Tab) => { setOpenOffer(null); setTab(t); scrollTop(); };
  const openMarket = (id: string, side: "buy" | "sell") => { setOpenOffer({ id, side }); setTab("market"); scrollTop(); };

  return (
    <div className="wrap">
      <nav className="nav">
        <button className="brand" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={() => setEntered(false)} aria-label="Home">
          <Logo />
        </button>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </div>
        <ConnectButton />
      </nav>

      {tab === "home" && <Home onNavigate={go} />}
      {tab === "market" && <Market open={openOffer} />}
      {tab === "sell" && <Sell onNavigate={go} onSell={(id) => openMarket(id, "sell")} />}
      {tab === "portfolio" && <Portfolio onNavigate={go} />}
      {tab === "desk" && (
        <>
          <div className="page-head" style={{ marginBottom: 8 }}><div><h1 className="page-title">Compliance desk</h1><p className="page-sub">Turn a seller's right to trade on or off. This is the ENSv2 credential layer.</p></div></div>
          <Desk />
        </>
      )}

      <Footer />
    </div>
  );
}
