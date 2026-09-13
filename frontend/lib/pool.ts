import { addr, pool } from "./config";

const MIN_SQRT = 4295128739n + 1n;
const MAX_SQRT = 1461446703485210103287273052203988822378723970342n - 1n;

/** The pool key as a tuple for router.swap. token is currency0 (token address < usdc). */
export function poolKey() {
  return poolKeyFor(addr.token as `0x${string}`, addr.hook as `0x${string}`);
}

/** Pool key for an arbitrary commitment token + its hook (shared USDC / fee / tickSpacing). */
export function poolKeyFor(token: `0x${string}`, hook: `0x${string}`) {
  const tokenIsC0 = token.toLowerCase() < addr.usdc.toLowerCase();
  const c0 = tokenIsC0 ? token : (addr.usdc as `0x${string}`);
  const c1 = tokenIsC0 ? (addr.usdc as `0x${string}`) : token;
  return { currency0: c0, currency1: c1, fee: pool.fee, tickSpacing: pool.tickSpacing, hooks: hook };
}

/** Build router.swap args for buying ACME with `usdcIn` (6dp), exact-input. */
export function buildBuy(usdcIn: bigint) {
  return buildBuyFor(addr.token as `0x${string}`, addr.hook as `0x${string}`, usdcIn);
}

/** Build router.swap args for buying `token` with `usdcIn` USDC (6dp), exact-input. */
export function buildBuyFor(token: `0x${string}`, hook: `0x${string}`, usdcIn: bigint) {
  const tokenIsC0 = token.toLowerCase() < addr.usdc.toLowerCase();
  const zeroForOne = !tokenIsC0; // input = USDC; zeroForOne iff USDC is currency0
  return [
    poolKeyFor(token, hook),
    { zeroForOne, amountSpecified: -usdcIn, sqrtPriceLimitX96: zeroForOne ? MIN_SQRT : MAX_SQRT },
  ] as const;
}

/** Build router.swap args for selling `tokenIn` ACME for USDC, exact-input. */
export function buildSell(tokenIn: bigint) {
  return buildSellFor(addr.token as `0x${string}`, addr.hook as `0x${string}`, tokenIn);
}

/** Build router.swap args for selling `tokenIn` of `token` back for USDC, exact-input. */
export function buildSellFor(token: `0x${string}`, hook: `0x${string}`, tokenIn: bigint) {
  const tokenIsC0 = token.toLowerCase() < addr.usdc.toLowerCase();
  const zeroForOne = tokenIsC0; // input = token; zeroForOne iff token is currency0
  return [
    poolKeyFor(token, hook),
    { zeroForOne, amountSpecified: -tokenIn, sqrtPriceLimitX96: zeroForOne ? MIN_SQRT : MAX_SQRT },
  ] as const;
}
