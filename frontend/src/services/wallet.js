import { ethers } from "ethers";
import { NETWORK_CHAIN_ID, RPC_URL } from "../config/contractConfig";

export const HARDHAT_CHAIN_ID_HEX = "0x7a69"; // 31337 in hex

/**
 * Abbreviate an Ethereum address for UI display
 * e.g., 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 -> 0xf39F...2266
 */
export function shortenAddress(address) {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Check if MetaMask or an Ethereum provider is installed
 */
export function isMetaMaskInstalled() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

/**
 * Connect to MetaMask wallet
 */
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error(
      "MetaMask is not detected. Please install the MetaMask browser extension to interact with TrustLedger."
    );
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  
  if (!accounts || accounts.length === 0) {
    throw new Error("No authorized accounts found in MetaMask.");
  }

  const network = await provider.getNetwork();
  const signer = await provider.getSigner();

  return {
    provider,
    signer,
    account: accounts[0],
    chainId: Number(network.chainId),
    isCorrectNetwork: Number(network.chainId) === NETWORK_CHAIN_ID,
  };
}

/**
 * Force MetaMask to show the account selection prompt
 * (Allows switching between Admin, Donor, and any imported account)
 */
export async function requestAccountChange() {
  if (!isMetaMaskInstalled()) return;

  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    return await connectWallet();
  } catch (err) {
    if (err.code === 4001) {
      // User cancelled account selection
      return null;
    }
    throw err;
  }
}

/**
 * Prompt user to switch to the local Hardhat network or add it
 */
export async function switchToHardhatNetwork() {
  if (!isMetaMaskInstalled()) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_CHAIN_ID_HEX,
              chainName: "Hardhat Local",
              rpcUrls: [RPC_URL],
              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError) {
        throw new Error("Failed to add Hardhat local network to MetaMask: " + addError.message);
      }
    } else {
      throw switchError;
    }
  }
}
