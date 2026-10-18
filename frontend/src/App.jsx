import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import CampaignCard from "./components/CampaignCard";
import CampaignForm from "./components/CampaignForm";
import CampaignDetails from "./components/CampaignDetails";
import MyDonations from "./components/MyDonations";
import AboutView from "./components/AboutView";
import { connectWallet, requestAccountChange, isMetaMaskInstalled } from "./services/wallet";
import { fetchAllCampaigns, fetchPlatformStats } from "./services/contract";
import { NETWORK_CHAIN_ID } from "./config/contractConfig";

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Blockchain Data
  const [campaigns, setCampaigns] = useState([]);
  const [platformStats, setPlatformStats] = useState({
    totalCampaigns: 0,
    verifiedCampaigns: 0,
    totalDonatedEth: "0.0",
    successfulCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [contractError, setContractError] = useState(null);

  // Wallet State
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Filter for campaigns list
  const [filter, setFilter] = useState("all"); // 'all' | 'verified' | 'pending' | 'funded'

  // -------------------------------------------------------------
  // REFRESH CONTRACT DATA
  // -------------------------------------------------------------
  const loadBlockchainData = useCallback(async () => {
    try {
      setLoading(true);
      setContractError(null);

      const [cList, stats] = await Promise.all([
        fetchAllCampaigns(provider || null),
        fetchPlatformStats(provider || null),
      ]);

      setCampaigns(cList);
      setPlatformStats(stats);

      // If a campaign modal is currently open, update its state
      if (selectedCampaign) {
        const updated = cList.find((c) => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (err) {
      console.warn("Could not connect to Ethereum node:", err.message);
      setContractError(
        "Unable to read local blockchain. Ensure `npx hardhat node` is running and the contract is deployed via `npx hardhat run scripts/deploy.js --network localhost`."
      );
    } finally {
      setLoading(false);
    }
  }, [provider, selectedCampaign]);

  // Initial load
  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  // -------------------------------------------------------------
  // METAMASK EVENT LISTENERS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null);
        setSigner(null);
      } else {
        setAccount(accounts[0]);
        // Re-connect to update signer
        handleWalletConnect();
      }
    };

    const handleChainChanged = (_chainIdHex) => {
      const numericId = parseInt(_chainIdHex, 16);
      setChainId(numericId);
      setIsCorrectNetwork(numericId === NETWORK_CHAIN_ID);
      // Ethers docs recommend page reload or provider refresh on chain change
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // WALLET ACTIONS
  // -------------------------------------------------------------
  const handleWalletConnect = async () => {
    try {
      setIsConnecting(true);
      const res = await connectWallet();
      setAccount(res.account);
      setSigner(res.signer);
      setProvider(res.provider);
      setChainId(res.chainId);
      setIsCorrectNetwork(res.isCorrectNetwork);
    } catch (err) {
      console.error("Wallet connection failed:", err.message);
      alert(err.message || "Failed to connect to MetaMask.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleWalletDisconnect = () => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
  };

  const handleSwitchAccount = async () => {
    try {
      setIsConnecting(true);
      const res = await requestAccountChange();
      if (res) {
        setAccount(res.account);
        setSigner(res.signer);
        setProvider(res.provider);
        setChainId(res.chainId);
        setIsCorrectNetwork(res.isCorrectNetwork);
      }
    } catch (err) {
      console.error("Account switch error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // -------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------
  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === "verified") return c.verified;
    if (filter === "pending") return !c.verified;
    if (filter === "funded") {
      const g = parseFloat(c.fundingGoal);
      const r = parseFloat(c.totalRaised);
      return r >= g && g > 0;
    }
    return true; // 'all'
  });

  return (
    <>
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          setSelectedCampaign(null);
        }}
        account={account}
        chainId={chainId}
        isCorrectNetwork={isCorrectNetwork}
        onConnect={handleWalletConnect}
        onDisconnect={handleWalletDisconnect}
        onSwitchAccount={handleSwitchAccount}
        isConnecting={isConnecting}
      />

      <main className="main-content">
        {contractError && (
          <div
            className="tx-alert error"
            style={{ marginBottom: "2rem", backgroundColor: "var(--color-error-bg)" }}
          >
            <div>
              <strong>Blockchain Connection Notice:</strong> {contractError}
            </div>
          </div>
        )}

        {/* VIEW: HOME / CAMPAIGNS */}
        {currentView === "home" && (
          <div>
            {/* Hero */}
            <section className="hero-section">
              <span className="hero-tagline">
                Fourth-Year B.Tech Mini Project • Blockchain Technology
              </span>
              <h1 className="hero-title">
                Transparent &amp; Genuine Charity Powered by Blockchain
              </h1>
              <p className="hero-desc">
                TrustLedger replaces opaque charitable donation systems with decentralized smart
                contract escrows. Every donation is permanently recorded on-chain, withdrawals require
                100% funding goal fulfillment, and unsuccessful campaigns guarantee automated donor refunds.
              </p>
              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentView("create")}
                  id="hero-create-btn"
                >
                  Start a Charity Campaign
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentView("about")}
                  id="hero-about-btn"
                >
                  Explore System Architecture
                </button>
              </div>
            </section>

            {/* Platform Metrics */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Campaigns</div>
                <div className="stat-value">{platformStats.totalCampaigns}</div>
                <div className="stat-subtext">Registered on smart contract</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Verified Campaigns</div>
                <div className="stat-value" style={{ color: "var(--color-primary-purple)" }}>
                  {platformStats.verifiedCampaigns}
                </div>
                <div className="stat-subtext">Approved by platform administrator</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Total ETH Donated</div>
                <div className="stat-value" style={{ color: "var(--color-accent-pink)" }}>
                  {platformStats.totalDonatedEth} ETH
                </div>
                <div className="stat-subtext">Cumulative verifiable volume</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Goals Achieved</div>
                <div className="stat-value" style={{ color: "var(--color-dark-purple)" }}>
                  {platformStats.successfulCampaigns}
                </div>
                <div className="stat-subtext">Eligible for creator withdrawal</div>
              </div>
            </div>

            {/* Campaign Section Header & Filters */}
            <div className="section-header">
              <h2 className="section-title">Charitable Campaigns</h2>
              <div className="filters-bar">
                <button
                  className={`filter-btn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All ({campaigns.length})
                </button>
                <button
                  className={`filter-btn ${filter === "verified" ? "active" : ""}`}
                  onClick={() => setFilter("verified")}
                >
                  Verified Only
                </button>
                <button
                  className={`filter-btn ${filter === "pending" ? "active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Pending Approval
                </button>
                <button
                  className={`filter-btn ${filter === "funded" ? "active" : ""}`}
                  onClick={() => setFilter("funded")}
                >
                  Goals Reached
                </button>
              </div>
            </div>

            {/* Campaign Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem 0" }}>
                <span
                  className="spinner"
                  style={{ width: "32px", height: "32px", borderColor: "#E6DDEA", borderTopColor: "#7450C8" }}
                />
                <p style={{ marginTop: "1rem", color: "var(--color-text-secondary)" }}>
                  Reading campaign states from local blockchain...
                </p>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="empty-state">
                <h3 className="empty-state-title">No Campaigns Found</h3>
                <p className="empty-state-desc">
                  {filter === "all"
                    ? "No charity campaigns have been created on this network yet."
                    : `No campaigns match the '${filter}' filter.`}
                </p>
                <button className="btn btn-primary" onClick={() => setCurrentView("create")}>
                  Create the First Campaign
                </button>
              </div>
            ) : (
              <div className="campaigns-grid">
                {filteredCampaigns.map((camp) => (
                  <CampaignCard
                    key={camp.id}
                    campaign={camp}
                    onSelectCampaign={(c) => setSelectedCampaign(c)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: CREATE CAMPAIGN */}
        {currentView === "create" && (
          <CampaignForm
            signer={signer}
            account={account}
            isCorrectNetwork={isCorrectNetwork}
            onConnectWallet={handleWalletConnect}
            onCampaignCreated={() => {
              loadBlockchainData();
              setTimeout(() => setCurrentView("home"), 1500);
            }}
          />
        )}

        {/* VIEW: MY DONATIONS */}
        {currentView === "my-donations" && (
          <MyDonations
            campaigns={campaigns}
            account={account}
            signer={signer}
            onConnectWallet={handleWalletConnect}
            onSelectCampaign={(c) => {
              if (c) {
                setSelectedCampaign(c);
              } else {
                setCurrentView("home");
              }
            }}
            onRefresh={loadBlockchainData}
          />
        )}

        {/* VIEW: ABOUT */}
        {currentView === "about" && <AboutView />}

        {/* MODAL: CAMPAIGN DETAILS */}
        {selectedCampaign && (
          <CampaignDetails
            campaign={selectedCampaign}
            account={account}
            signer={signer}
            isCorrectNetwork={isCorrectNetwork}
            onClose={() => setSelectedCampaign(null)}
            onRefresh={loadBlockchainData}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-top">
            <div>
              <div className="footer-brand-title">TrustLedger</div>
              <p className="footer-desc">
                A decentralized charity transparency dApp engineered on Ethereum smart contracts.
                Eliminating intermediaries and ensuring mathematical accountability in humanitarian giving.
              </p>
            </div>

            <div>
              <div style={{ color: "white", fontWeight: 700, marginBottom: "0.5rem" }}>
                Platform Links
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.95rem" }}>
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView("home");
                  }}
                  style={{ color: "var(--color-pale-lavender)" }}
                >
                  Campaign Listing
                </a>
                <a
                  href="#create"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView("create");
                  }}
                  style={{ color: "var(--color-pale-lavender)" }}
                >
                  Create Campaign
                </a>
                <a
                  href="#my-donations"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView("my-donations");
                  }}
                  style={{ color: "var(--color-pale-lavender)" }}
                >
                  My Donations
                </a>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentView("about");
                  }}
                  style={{ color: "var(--color-pale-lavender)" }}
                >
                  Project &amp; Syllabus Details
                </a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              <strong>Computer Engineering Mini-Project</strong>: &ldquo;Develop a Blockchain based
              application for transparent and genuine charity&rdquo;
            </div>
            <div>
              Academic Demonstration • Test Network Only (Hardhat Local / Chain 31337)
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
