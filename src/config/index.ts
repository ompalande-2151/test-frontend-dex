import { parseAbiItem, type Address } from "viem";
import addresses from "./addresses.json";
import { erc20Abi, nonfungiblePositionManagerAbi, quoterV2Abi } from "./contracts";

export { erc20Abi, nonfungiblePositionManagerAbi, V3_FEE, ZERO_SQRT_PRICE_LIMIT, displayTokenSymbol } from "./contracts";
export { TOKENS } from "./tokens";

export const erc20TransferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export const erc20ApprovalEvent = parseAbiItem(
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
);

export const erc721TransferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

// ExplorePage Events
export const poolSwapEvent = parseAbiItem(
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
);

export const poolMintEvent = parseAbiItem(
  "event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)"
);

export const poolBurnEvent = parseAbiItem(
  "event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)"
);

export const wmstDepositEvent = parseAbiItem(
  "event Deposit(address indexed dst, uint256 wad)"
);

export const wmstWithdrawalEvent = parseAbiItem(
  "event Withdrawal(address indexed src, uint256 wad)"
);

export const poolAbi = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" }
    ]
  }
] as const;

export const lpStateStorageAbi = [
  {
    type: "function",
    name: "poolAddress",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "lpTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "lpLiquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint128" }]
  },
  {
    type: "function",
    name: "lpAmount0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "lpAmount1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export const erc20AbiExtended = [
  ...erc20Abi,
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  }
] as const;

export const ABIS = {
  erc20: erc20AbiExtended,
  lpStateStorage: lpStateStorageAbi,
  pool: poolAbi,
  quoterV2: quoterV2Abi,
  positionManager: nonfungiblePositionManagerAbi
};

export function getContractAddress(name: string, chainId?: number): Address {
  const mapping: Record<string, string> = {
    wmst: addresses.WMST_ADDRESS,
    swapRouter: addresses.SWAP_ROUTER_ADDRESS,
    quoterV2: addresses.QUOTER_V2_ADDRESS,
    positionManager: addresses.POSITION_MANAGER_ADDRESS,
    usdc: addresses.USDC_ADDRESS,
    factory: addresses.V3_FACTORY_ADDRESS,
    pool: addresses.POOL_ADDRESS,
    lpStateStorage: addresses.LP_STATE_STORAGE_ADDRESS,
  };

  const addr = mapping[name];
  return (addr || "0x0000000000000000000000000000000000000000") as Address;
}
