import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  RPC_URL,
} from "../config/contractConfig";

/**
 * Returns a fallback JSON-RPC provider connected directly to the local Hardhat node
 */
export function getFallbackProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Instantiate the CharityPlatform smart contract with either a Signer or Provider
 */
export function getContractInstance(signerOrProvider) {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "Contract address not configured. Please run `npx hardhat run scripts/deploy.js --network localhost`."
    );
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

/**
 * Fetch all campaigns directly from the blockchain
 */
export async function fetchAllCampaigns(providerOrSigner) {
  const provider = providerOrSigner || getFallbackProvider();
  const contract = getContractInstance(provider);

  const rawList = await contract.getAllCampaigns();
  return rawList.map((c) => ({
    id: Number(c.id),
    title: c.title,
    description: c.description,
    creator: c.creator,
    fundingGoal: ethers.formatEther(c.fundingGoal),
    fundingGoalWei: c.fundingGoal,
    totalRaised: ethers.formatEther(c.totalRaised),
    totalRaisedWei: c.totalRaised,
    deadline: Number(c.deadline),
    deadlineDate: new Date(Number(c.deadline) * 1000),
    isExpired: Date.now() >= Number(c.deadline) * 1000,
    verified: c.verified,
    withdrawn: c.withdrawn,
  }));
}

/**
 * Fetch platform-wide statistics directly from smart contract state
 */
export async function fetchPlatformStats(providerOrSigner) {
  const provider = providerOrSigner || getFallbackProvider();
  const contract = getContractInstance(provider);

  const [totalCampaigns, verifiedCampaigns, totalDonatedWei, successfulCampaigns] =
    await contract.getPlatformStats();

  return {
    totalCampaigns: Number(totalCampaigns),
    verifiedCampaigns: Number(verifiedCampaigns),
    totalDonatedEth: ethers.formatEther(totalDonatedWei),
    successfulCampaigns: Number(successfulCampaigns),
  };
}

/**
 * Check contribution of a specific donor to a campaign
 */
export async function getDonorContribution(campaignId, donorAddress, providerOrSigner) {
  const provider = providerOrSigner || getFallbackProvider();
  const contract = getContractInstance(provider);
  const contributionWei = await contract.getContribution(campaignId, donorAddress);
  return {
    wei: contributionWei,
    eth: ethers.formatEther(contributionWei),
  };
}

/**
 * Create a new charity campaign on-chain
 */
export async function createCampaignOnChain(title, description, goalEth, deadlineTimestamp, signer) {
  const contract = getContractInstance(signer);
  const goalWei = ethers.parseEther(goalEth.toString());
  const tx = await contract.createCampaign(title, description, goalWei, deadlineTimestamp);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Verify a campaign (Administrator only)
 */
export async function verifyCampaignOnChain(campaignId, signer) {
  const contract = getContractInstance(signer);
  const tx = await contract.verifyCampaign(campaignId);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Donate test ETH to a verified campaign
 */
export async function donateToCampaignOnChain(campaignId, amountEth, signer) {
  const contract = getContractInstance(signer);
  const amountWei = ethers.parseEther(amountEth.toString());
  const tx = await contract.donate(campaignId, { value: amountWei });
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Withdraw funds (Creator only, after goal reached)
 */
export async function withdrawFundsOnChain(campaignId, signer) {
  const contract = getContractInstance(signer);
  const tx = await contract.withdrawFunds(campaignId);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Claim refund for an expired campaign that missed its goal
 */
export async function claimRefundOnChain(campaignId, signer) {
  const contract = getContractInstance(signer);
  const tx = await contract.claimRefund(campaignId);
  const receipt = await tx.wait();
  return { tx, receipt };
}

/**
 * Fetch verified on-chain donation history for a specific campaign using events
 */
export async function fetchCampaignDonations(campaignId, providerOrSigner) {
  const provider = providerOrSigner || getFallbackProvider();
  const contract = getContractInstance(provider);

  const filter = contract.filters.DonationReceived(campaignId);
  const events = await contract.queryFilter(filter, 0, "latest");

  const donations = await Promise.all(
    events.map(async (event) => {
      const block = await event.getBlock();
      return {
        id: event.transactionHash + "-" + event.index,
        campaignId: Number(event.args[0]),
        donor: event.args[1],
        amountEth: ethers.formatEther(event.args[2]),
        totalRaisedAfterEth: ethers.formatEther(event.args[3]),
        timestamp: block ? new Date(block.timestamp * 1000) : new Date(Number(event.args[4]) * 1000),
        transactionHash: event.transactionHash,
      };
    })
  );

  return donations.reverse(); // Most recent first
}

/**
 * Fetch all donations made by a specific user across all campaigns
 */
export async function fetchUserDonationRecords(userAddress, providerOrSigner) {
  const provider = providerOrSigner || getFallbackProvider();
  const contract = getContractInstance(provider);

  const filter = contract.filters.DonationReceived(null, userAddress);
  const events = await contract.queryFilter(filter, 0, "latest");

  const donations = await Promise.all(
    events.map(async (event) => {
      const block = await event.getBlock();
      return {
        campaignId: Number(event.args[0]),
        donor: event.args[1],
        amountEth: ethers.formatEther(event.args[2]),
        timestamp: block ? new Date(block.timestamp * 1000) : new Date(Number(event.args[4]) * 1000),
        transactionHash: event.transactionHash,
      };
    })
  );

  return donations.reverse();
}
