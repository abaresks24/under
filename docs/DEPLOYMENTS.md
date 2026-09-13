# Deployments — Sepolia (11155111)

Deployed 2026-09-08 via `script/Deploy.s.sol`. A conformant buy was executed in the same broadcast
and verified on-chain. This deployment includes the **SellerBond** (collateral / trust-minimization).

## Ours

| Contract | Address | Role |
|---|---|---|
| CommitmentToken (ccAWS) | `0x4e9698256dC1654876086374B2B2655D97941280` | $100k AWS commitment, 24-month expiry, 6dp |
| CommitmentResolver | `0xD682c2f8C498A3B08C52E7c27891284Ab7A79dAe` | ENSIP text resolver + EAC roles (issuer/verifier) |
| EnsSellerRegistry | `0x05E00f06019DE4964314B6Ff727a098341c0f17a` | reads `commitment.status`; eligibility = active |
| EnsEligibilityAdapter | `0x4B909eE2C0c919D18b284177EE2830457E14818A` | address → ENS node → eligibility (hook's oracle) |
| **SellerBond** | `0x9a880f885445bAF769E98D57Dda814E3d6aADef4` | seller collateral; slashable on fraud → compensation pool |
| **TimeDecayHook** | `0xB5E5daeE51a2cbd5db6Fc021db0A091cac928888` | v4 custom-curve hook; low bits `0x888` = flags |
| CommitmentRouter | `0xc0363da931c198fab1533F2B1486d794A5931B6c` | dedicated router (RISK #1: forwards real user) |

## Reused (pinned + verified — see `addresses.ts`)

| Contract | Address |
|---|---|
| Uniswap v4 PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| MockUSDC (payment + pool USDC + bond token, mintable 6dp) | `0x768f42455a2d082e23ceef7d51e5787c82d67a39` |
| ENS name | `cloudcredits.eth` (node `0xfc47d166…c78b`) |

Dev wallet: `0xc46809Db4e041156a9000d177f5b8cE45405Fa69`.

## On-chain verification (post-deploy `cast`)

- `hook.bond()` → the SellerBond address (bond wired into the hook's seller gate)
- `bond.hasBond(dev)` → `true` (dev posted a 50,000 USDC bond before seeding)
- `hook.allowedRouter(router)` → `true`
- `adapter.isEligible(dev)` → `true` (ENS-backed, via cloudcredits.eth → status active)
- ACME balance of dev grew by ~1,000 → **the conformant buy landed**

## Trust model (collateral)

To list a commitment, a seller must (1) be ENS-eligible (`commitment.status == active`) **and** (2) post
a bond in `SellerBond` (`seedLiquidity` reverts `NotBonded` otherwise). If the commitment turns out
fraudulent, the compliance officer both revokes the ENS status **and** slashes the bond to a
compensation pool — so a buyer is made whole on-chain. A clean exit requires `requestUnbond()` + a
cooldown, so a fraudster cannot withdraw before being caught. Honest boundary: the bond replaces
reputational trust with an economic guarantee, but still relies on a trigger (the officer / a future
challenge game) to declare fraud.

## Notes

- The pool is reachable only through `CommitmentRouter`; direct PoolManager access is rejected
  (`UnauthorizedRouter`). Concentrated liquidity is disabled; reserves are ERC-6909 claims seeded via
  `seedLiquidity`.
- The hook address was mined with `HookMiner` so its low 14 bits carry the permission flags, then
  deployed via CREATE2.

## Additional markets (Sepolia) — one token + mined hook + pool each

All share the eligibility adapter, seller bond and router above; deployed via
`script/DeployMarkets.s.sol`, each pool seeded with 20k cc + 20k USDC.

| Seller    | Provider | Face   | Maturity   | CommitmentToken                              | TimeDecayHook                                |
|-----------|----------|--------|------------|----------------------------------------------|----------------------------------------------|
| Northwind | GCP      | 250k   | 2028-03-15 | `0x3420EFa01699a1de4dC0dEE604617240caDbe77f` | `0x81a7BeA320943CC4A5E0ca28e6eD897Df2700888` |
| Contoso   | Azure    | 50k    | 2027-06-15 | `0x41bb7fB4183f7e938a88447c82214db1928Ecfa4` | `0x3CAd1C594608066a11Aa8C2659d34ab98965C888` |
| Globex    | AWS      | 500k   | 2029-03-15 | `0xF6e478CF307B5c6d28a62b41f714031b501051b7` | `0x6245A7700926b7AC830E2867feB4416885A58888` |
| Initech   | GCP      | 75k    | 2027-02-15 | `0x27baD6953BfB87D9DFf9Aa01034bfBba0b62ae04` | `0x0fE73d39676d1b003Ab745C4fa22B385FeCe4888` |
| Umbrella  | Azure    | 320k   | 2027-12-15 | `0xe0B6881E5ce7045CA0F6A13644395B12554a96f0` | `0xEA9080489732Af5cCa822d1A317E675d2fA30888` |
| Hooli     | AWS      | 180k   | 2028-06-15 | `0x816538b12989c84FbC30C22ceBD20F06f312eFE6` | `0x16F624C577A10C622aA8dEE8942e57BA573ec888` |
