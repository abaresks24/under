"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton({ onVideo = false }: { onVideo?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const primary = onVideo ? "btn on-video" : "btn primary";
  const ghost = onVideo ? "btn on-video-ghost mono" : "btn ghost mono";
  if (isConnected && address) {
    return (
      <button className={ghost} onClick={() => disconnect()}>
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }
  return (
    <button className={primary} onClick={() => connect({ connector: connectors[0] })}>
      Connect wallet
    </button>
  );
}
