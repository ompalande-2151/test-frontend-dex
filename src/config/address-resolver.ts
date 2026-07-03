import { createPublicClient, http, type Address } from "viem";
import { mstChain } from "./chains";
import addresses from "./addresses.json";
import { CONTRACTS, TOKENS as CONTRACT_TOKENS } from "./contracts";
import { TOKENS as BACKEND_TOKENS } from "./tokens";

const lpStateStorageAbi = [
  {
    type: "function",
    name: "poolAddress",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  }
] as const;

const poolAbi = [
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  }
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  }
] as const;

export async function resolveAddresses(): Promise<void> {
  console.log("[AddressResolver] Initiating dynamic contract address resolution...");
  
  try {
    const publicClient = createPublicClient({
      chain: mstChain,
      transport: http("https://testnetrpc.mstblockchain.com"),
    });

    const lpStateStorageAddress = addresses.LP_STATE_STORAGE_ADDRESS as Address;
    if (!lpStateStorageAddress) {
      console.warn("[AddressResolver] No LPStateStorage address found in configuration.");
      return;
    }

    const poolAddr = await publicClient.readContract({
      address: lpStateStorageAddress,
      abi: lpStateStorageAbi,
      functionName: "poolAddress"
    }) as Address;

    if (!poolAddr || poolAddr === "0x0000000000000000000000000000000000000000") {
      console.log("[AddressResolver] LPStateStorage pool address is empty or not set.");
      return;
    }

    console.log(`[AddressResolver] Discovered active pool: ${poolAddr}`);

    const [token0, token1] = await Promise.all([
      publicClient.readContract({
        address: poolAddr,
        abi: poolAbi,
        functionName: "token0"
      }) as Promise<Address>,
      publicClient.readContract({
        address: poolAddr,
        abi: poolAbi,
        functionName: "token1"
      }) as Promise<Address>
    ]);

    const [symbol0, symbol1] = await Promise.all([
      publicClient.readContract({
        address: token0,
        abi: erc20Abi,
        functionName: "symbol"
      }).catch(() => "UNKNOWN"),
      publicClient.readContract({
        address: token1,
        abi: erc20Abi,
        functionName: "symbol"
      }).catch(() => "UNKNOWN")
    ]);

    let usdcAddress = "";
    let wmstAddress = "";

    if (symbol0 === "USDC") {
      usdcAddress = token0;
      wmstAddress = token1;
    } else if (symbol1 === "USDC") {
      usdcAddress = token1;
      wmstAddress = token0;
    } else {
      // Fallback if symbols aren't standard
      usdcAddress = token0;
      wmstAddress = token1;
    }

    console.log(`[AddressResolver] Resolved tokens: USDC=${usdcAddress}, WMST=${wmstAddress}`);

    // Update addresses in JSON import (mutating the loaded object in memory)
    (addresses as any).POOL_ADDRESS = poolAddr;
    (addresses as any).USDC_ADDRESS = usdcAddress;
    (addresses as any).WMST_ADDRESS = wmstAddress;

    // Update CONTRACTS config
    (CONTRACTS as any).usdc = usdcAddress as Address;
    (CONTRACTS as any).wmst = wmstAddress as Address;

    // Update TOKENS in contracts.ts
    const contractUsdc = CONTRACT_TOKENS.find(t => t.symbol === "USDC");
    if (contractUsdc) contractUsdc.address = usdcAddress as Address;
    const contractWmst = CONTRACT_TOKENS.find(t => t.symbol === "WMST");
    if (contractWmst) contractWmst.address = wmstAddress as Address;

    // Update TOKENS in tokens.ts
    const backendUsdc = BACKEND_TOKENS.find(t => t.symbol === "USDC");
    if (backendUsdc) backendUsdc.address = usdcAddress;
    const backendWmst = BACKEND_TOKENS.find(t => t.symbol === "WMST");
    if (backendWmst) backendWmst.address = wmstAddress;

    console.log("[AddressResolver] Config files successfully updated in memory.");
  } catch (err: any) {
    console.error("[AddressResolver] Failed to resolve addresses dynamically. Falling back to default config:", err.message);
  }
}
