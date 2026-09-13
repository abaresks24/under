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

interface IMintableUSDC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @notice Deploy the remaining commitment markets (one token + mined hook + pool + seeded reserves
 *         each), reusing the already-deployed eligibility adapter, seller bond and router. The
 *         deployer is already eligible (cloudcredits.eth) and bonded, so it can seed every pool.
 *
 * Run: forge script script/DeployMarkets.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY
 */
contract DeployMarkets is Script {
    IPoolManager constant MANAGER = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    address constant MOCK_USDC = 0x768F42455A2D082E23ceeF7d51e5787C82d67a39;
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    // shared infra, already live on Sepolia
    address constant ADAPTER = 0x4B909eE2C0c919D18b284177EE2830457E14818A;
    address constant BOND = 0x9a880f885445bAF769E98D57Dda814E3d6aADef4;
    address constant ROUTER = 0xc0363da931c198fab1533F2B1486d794A5931B6c;

    uint256 constant HORIZON = 730 days;
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    address me;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        me = vm.addr(pk);
        vm.startBroadcast(pk);

        // plenty of test USDC to seed every pool (6 x 20k + buffer)
        IMintableUSDC(MOCK_USDC).mint(me, 2_000_000e6);

        // (provider, faceValue, expiry) — must match frontend lib/offers.ts
        deployMarket(CommitmentToken.Provider.GCP, 250_000, 1836691200); // Northwind  2028-03-15
        deployMarket(CommitmentToken.Provider.AZURE, 50_000, 1813017600); // Contoso    2027-06-15
        deployMarket(CommitmentToken.Provider.AWS, 500_000, 1868227200); // Globex     2029-03-15
        deployMarket(CommitmentToken.Provider.GCP, 75_000, 1802649600); // Initech    2027-02-15
        deployMarket(CommitmentToken.Provider.AZURE, 320_000, 1828828800); // Umbrella   2027-12-15
        deployMarket(CommitmentToken.Provider.AWS, 180_000, 1844640000); // Hooli      2028-06-15

        vm.stopBroadcast();
    }

    function deployMarket(CommitmentToken.Provider provider, uint256 face, uint64 expiry) internal {
        CommitmentToken token = new CommitmentToken(provider, face, expiry, me);

        uint160 flags =
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        Currency usdcCurrency = Currency.wrap(MOCK_USDC);
        bytes memory args = abi.encode(MANAGER, IEligibility(ADAPTER), token, usdcCurrency, HORIZON, me, BOND);
        (address hookAddr, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(TimeDecayHook).creationCode, args);
        TimeDecayHook hook =
            new TimeDecayHook{salt: salt}(MANAGER, IEligibility(ADAPTER), token, usdcCurrency, HORIZON, me, BOND);
        require(address(hook) == hookAddr, "hook mismatch");
        hook.setRouter(ROUTER, true);

        (Currency c0, Currency c1) = address(token) < MOCK_USDC
            ? (Currency.wrap(address(token)), usdcCurrency)
            : (usdcCurrency, Currency.wrap(address(token)));
        PoolKey memory key =
            PoolKey({currency0: c0, currency1: c1, fee: 3000, tickSpacing: 60, hooks: IHooks(hookAddr)});
        MANAGER.initialize(key, SQRT_PRICE_1_1);

        token.approve(address(hook), type(uint256).max);
        IMintableUSDC(MOCK_USDC).approve(address(hook), type(uint256).max);
        hook.seedLiquidity(20_000e6, 20_000e6);

        console2.log("MARKET token / hook:");
        console2.logAddress(address(token));
        console2.logAddress(address(hook));
    }
}
