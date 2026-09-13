// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {HookMiner} from "v4-periphery/test/shared/HookMiner.sol";

import {CommitmentToken} from "../src/CommitmentToken.sol";
import {TimeDecayHook} from "../src/TimeDecayHook.sol";
import {IEligibility} from "../src/IEligibility.sol";

/**
 * @notice Repoint every market at real Circle USDC (Ethereum Sepolia). Reuses the existing
 *         CommitmentTokens, eligibility adapter, seller bond and router; only a fresh hook + pool is
 *         deployed per market, seeded token-only (buys draw the token side, so no real USDC is needed
 *         to bootstrap — buyers pay real USDC in). The deployer already holds leftover token supply.
 *
 * Run: forge script script/MigrateUSDC.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY --slow
 */
contract MigrateUSDC is Script {
    IPoolManager constant MANAGER = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // Circle USDC, Ethereum Sepolia
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    address constant ADAPTER = 0x4B909eE2C0c919D18b284177EE2830457E14818A;
    address constant BOND = 0x9a880f885445bAF769E98D57Dda814E3d6aADef4;
    address constant ROUTER = 0xc0363da931c198fab1533F2B1486d794A5931B6c;

    uint256 constant HORIZON = 730 days;
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;
    uint256 constant SEED_TOKENS = 20_000e6; // token-only reserve per pool

    address me;

    /// @dev One market per invocation (set IDX 0..6) so HookMiner's loop memory doesn't accumulate.
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        me = vm.addr(pk);
        uint256 idx = vm.envUint("IDX");

        address[7] memory tokens = [
            0x4e9698256dC1654876086374B2B2655D97941280, // Acme    AWS
            0x3420EFa01699a1de4dC0dEE604617240caDbe77f, // Northwind GCP
            0x41bb7fB4183f7e938a88447c82214db1928Ecfa4, // Contoso  Azure
            0xF6e478CF307B5c6d28a62b41f714031b501051b7, // Globex   AWS
            0x27baD6953BfB87D9DFf9Aa01034bfBba0b62ae04, // Initech  GCP
            0xe0B6881E5ce7045CA0F6A13644395B12554a96f0, // Umbrella Azure
            0x816538b12989c84FbC30C22ceBD20F06f312eFE6  // Hooli    AWS
        ];
        require(idx < tokens.length, "IDX out of range");

        vm.startBroadcast(pk);
        migrate(CommitmentToken(tokens[idx]));
        vm.stopBroadcast();
    }

    function migrate(CommitmentToken token) internal {
        uint160 flags =
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        Currency usdcCurrency = Currency.wrap(USDC);
        bytes memory args = abi.encode(MANAGER, IEligibility(ADAPTER), token, usdcCurrency, HORIZON, me, BOND);
        (address hookAddr, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(TimeDecayHook).creationCode, args);
        TimeDecayHook hook =
            new TimeDecayHook{salt: salt}(MANAGER, IEligibility(ADAPTER), token, usdcCurrency, HORIZON, me, BOND);
        require(address(hook) == hookAddr, "hook mismatch");
        hook.setRouter(ROUTER, true);

        (Currency c0, Currency c1) = address(token) < USDC
            ? (Currency.wrap(address(token)), usdcCurrency)
            : (usdcCurrency, Currency.wrap(address(token)));
        PoolKey memory key =
            PoolKey({currency0: c0, currency1: c1, fee: 3000, tickSpacing: 60, hooks: IHooks(hookAddr)});
        MANAGER.initialize(key, SQRT_PRICE_1_1);

        token.approve(address(hook), type(uint256).max);
        hook.seedLiquidity(SEED_TOKENS, 0); // token-only; real USDC comes from buyers

        console2.logAddress(address(token));
        console2.logAddress(address(hook));
    }
}
