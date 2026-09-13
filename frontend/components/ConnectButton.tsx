"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton({ onVideo = false }: { onVideo?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [err, setErr] = useState("");
  const primary = onVideo ? "btn on-video" : "btn primary";
  const ghost = onVideo ? "btn on-video-ghost mono" : "btn ghost mono";

  if (isConnected && address) {
    return (
      <button className={ghost} onClick={() => disconnect()}>
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  const onClick = async () => {
    setErr("");
    // prefer an injected wallet (MetaMask etc.); fall back to whatever is available
    const c = connectors.find((x) => x.type === "injected" || x.id === "injected") ?? connectors[0];
    if (!c) { setErr("No wallet detected"); return; }
    try {
      await connectAsync({ connector: c });
    } catch (e: any) {
      if (e?.name !== "UserRejectedRequestError") setErr(e?.shortMessage ?? "Connection failed");
    }
  };

  return (
    <button className={primary} onClick={onClick} disabled={isPending} title={err || undefined}>
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
