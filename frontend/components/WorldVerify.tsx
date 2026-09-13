"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { IDKitRequestWidget, selfieCheckLegacy, type IDKitResult, type RpContext } from "@worldcoin/idkit";
import { world } from "@/lib/config";

/**
 * World ID 4.0 Selfie Check gate. On a valid proof the server verifies it and onboards the address
 * on-chain (ENS records + eligibility), then calls `onVerified`. Reused by the buy flow and the seller
 * onboarding.
 */
export function WorldVerify({
  onVerified,
  className = "btn primary block lg",
  label = "Verify with World ID",
}: {
  onVerified: () => void;
  className?: string;
  label?: string;
}) {
  const { address } = useAccount();
  const [ctx, setCtx] = useState<RpContext | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const start = async () => {
    setErr(""); setBusy("Preparing…");
    try {
      const r = await fetch("/api/world-context");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "could not start World verification");
      setCtx(d.rp_context); setBusy(""); setOpen(true);
    } catch (e: any) { setBusy(""); setErr(e?.message ?? "failed"); }
  };

  const handleVerify = async (result: IDKitResult) => {
    setBusy("Verifying…");
    const res = await fetch("/api/verify", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ result, address }),
    });
    const data = await res.json();
    if (!res.ok || !data.verified) { setBusy(""); setErr(data.error ?? "verification failed"); throw new Error("failed"); }
    setBusy(""); onVerified();
  };

  return (
    <>
      <button className={className} onClick={start} disabled={!address || !!busy}>{busy || label}</button>
      {ctx && (
        <IDKitRequestWidget
          app_id={world.appId}
          action={world.action}
          rp_context={ctx}
          allow_legacy_proofs={false}
          environment="production"
          preset={selfieCheckLegacy({ signal: address ?? "" })}
          open={open}
          onOpenChange={setOpen}
          handleVerify={handleVerify}
          onSuccess={() => {}}
        />
      )}
      {err && <div className="notice bad">{err}</div>}
    </>
  );
}
