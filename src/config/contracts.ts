import type { Address } from "viem";
import addresses from "./addresses.json";

export const V3_FEE = 3000;
export const ZERO_SQRT_PRICE_LIMIT = 0n;
export const ZERO_SQRT_LIMIT = 0n;
export const API_BASE = import.meta.env.VITE_API_URL || "https://dex-production-c023.up.railway.app";

export const CONTRACTS = {
  wmst: (import.meta.env.VITE_WMST_ADDRESS || addresses.WMST_ADDRESS) as Address,
  swapRouter: (import.meta.env.VITE_SWAP_ROUTER_ADDRESS || addresses.SWAP_ROUTER_ADDRESS) as Address,
  quoterV2: (import.meta.env.VITE_QUOTER_V2_ADDRESS || addresses.QUOTER_V2_ADDRESS) as Address,
  positionManager: (import.meta.env.VITE_POSITION_MANAGER_ADDRESS || addresses.POSITION_MANAGER_ADDRESS) as Address,
  usdc: (import.meta.env.VITE_USDC_ADDRESS || addresses.USDC_ADDRESS) as Address,
  factory: (import.meta.env.VITE_V3_FACTORY_ADDRESS || addresses.V3_FACTORY_ADDRESS) as Address
};

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  address?: Address;
  isNativeWrapped?: boolean;
}

export const TOKENS: TokenConfig[] = [
  {
    symbol: "WMST",
    name: "Wrapped MST",
    decimals: 18,
    address: CONTRACTS.wmst,
    isNativeWrapped: true
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: Number(import.meta.env.VITE_USDC_DECIMALS || addresses.USDC_DECIMALS || 18),
    address: CONTRACTS.usdc
  }
];

export function getToken(symbol: string) {
  return TOKENS.find((token) => token.symbol === symbol);
}

export const NATIVE_TOKEN_SYMBOL = "MST";
export const NATIVE_TOKEN_DISPLAY_SYMBOL = "tMST";
export const NATIVE_TOKEN_DISPLAY_NAME = "tMST Native Token";

export function displayTokenSymbol(symbol: string) {
  return symbol === NATIVE_TOKEN_SYMBOL ? NATIVE_TOKEN_DISPLAY_SYMBOL : symbol;
}

export function displayTokenName(symbol: string) {
  return symbol === NATIVE_TOKEN_SYMBOL ? NATIVE_TOKEN_DISPLAY_NAME : getToken(symbol)?.name ?? symbol;
}


export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" }
        ]
      }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { name: "initializedTicksCrossedList", type: "uint32[]" },
      { name: "gasEstimate", type: "uint256" }
    ]
  }
] as const;

export const swapRouterAbi = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" }
        ]
      }
    ],
    outputs: [{ name: "amountOut", type: "uint256" }]
  },
  {
    type: "function",
    name: "exactInput",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "path", type: "bytes" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" }
        ]
      }
    ],
    outputs: [{ name: "amountOut", type: "uint256" }]
  }
] as const;

export const nonfungiblePositionManagerAbi = [
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" }
    ]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "factory",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "amount0Desired", type: "uint256" },
          { name: "amount1Desired", type: "uint256" },
          { name: "amount0Min", type: "uint256" },
          { name: "amount1Min", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" }
        ]
      }
    ],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "liquidity", type: "uint128" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "increaseLiquidity",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "amount0Desired", type: "uint256" },
          { name: "amount1Desired", type: "uint256" },
          { name: "amount0Min", type: "uint256" },
          { name: "amount1Min", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      }
    ],
    outputs: [
      { name: "liquidity", type: "uint128" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "decreaseLiquidity",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "liquidity", type: "uint128" },
          { name: "amount0Min", type: "uint256" },
          { name: "amount1Min", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      }
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "collect",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "amount0Max", type: "uint128" },
          { name: "amount1Max", type: "uint128" }
        ]
      }
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "createAndInitializePoolIfNecessary",
    stateMutability: "payable",
    inputs: [
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "sqrtPriceX96", type: "uint160" }
    ],
    outputs: [{ name: "pool", type: "address" }]
  }
] as const;

export const rapidexV3FactoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" }
    ],
    outputs: [{ name: "pool", type: "address" }]
  }
] as const;

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

export const swapEventAbi = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount0", type: "int256" },
      { indexed: false, name: "amount1", type: "int256" },
      { indexed: false, name: "sqrtPriceX96", type: "uint160" },
      { indexed: false, name: "liquidity", type: "uint128" },
      { indexed: false, name: "tick", type: "int24" }
    ]
  }
] as const;

