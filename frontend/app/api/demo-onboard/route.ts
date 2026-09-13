import { NextResponse } from "next/server";
import { createWalletClient, http, namehash, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

/**
 * Demo bypass. Onboards an address on-chain (ENS credential + eligibility) WITHOUT a World proof,
 * for judges/demos who don't have an Orb / Selfie Check handy. Same effect as the World success path
 * in /api/verify, minus the proof. Testnet only. Must target the resolver/adapter the hooks gate on.
 */
const RESOLVER = "0xD682c2f8C498A3B08C52E7c27891284Ab7A79dAe";
const ADAPTER = "0x4B909eE2C0c919D18b284177EE2830457E14818A";
const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

const resolverAbi = [
  { type: "function", name: "onboard", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }, { type: "string" }, { type: "string" }, { type: "uint64" }], outputs: [] },
] as const;
const adapterAbi = [
  { type: "function", name: "bind", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bytes32" }], outputs: [] },
] as const;

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ error: "missing address" }, { status: 400 });

    const deskKey = process.env.DESK_PRIVATE_KEY as `0x${string}` | undefined;
    if (!deskKey) return NextResponse.json({ error: "desk key not configured" }, { status: 501 });

    const user = getAddress(address);
    const node = namehash(`${user.slice(2).toLowerCase()}.cloudcredits.eth`);
    const wallet = createWalletClient({ account: privateKeyToAccount(deskKey), chain: sepolia, transport: http(RPC) });
    const expires = BigInt(Math.floor(Date.now() / 1000) + 730 * 24 * 3600);
    await wallet.writeContract({ address: RESOLVER, abi: resolverAbi, functionName: "onboard", args: [node as `0x${string}`, "aws", "demo", expires] });
    await wallet.writeContract({ address: ADAPTER, abi: adapterAbi, functionName: "bind", args: [user, node as `0x${string}`] });

    return NextResponse.json({ onboarded: true, node });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}
