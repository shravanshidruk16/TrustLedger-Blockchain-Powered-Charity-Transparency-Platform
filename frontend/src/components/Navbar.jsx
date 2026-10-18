import React from "react";
import WalletConnect from "./WalletConnect";

export default function Navbar({
  currentView,
  setCurrentView,
  account,
  chainId,
  isCorrectNetwork,
  onConnect,
  onDisconnect,
  onSwitchAccount,
  isConnecting,
}) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => setCurrentView("home")}>
          <div className="brand-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="brand-title">TrustLedger</span>
            <span className="brand-subtitle">Charity Transparency Protocol</span>
          </div>
        </div>

        {/* Navigation links */}
        <div className="nav-links">
          <button
            className={`nav-link ${currentView === "home" ? "active" : ""}`}
            onClick={() => setCurrentView("home")}
            id="nav-home"
          >
            Home / Campaigns
          </button>
          <button
            className={`nav-link ${currentView === "create" ? "active" : ""}`}
            onClick={() => setCurrentView("create")}
            id="nav-create"
          >
            Create Campaign
          </button>
          <button
            className={`nav-link ${currentView === "my-donations" ? "active" : ""}`}
            onClick={() => setCurrentView("my-donations")}
            id="nav-my-donations"
          >
            My Donations
          </button>
          <button
            className={`nav-link ${currentView === "about" ? "active" : ""}`}
            onClick={() => setCurrentView("about")}
            id="nav-about"
          >
            About
          </button>
        </div>

        {/* Actions / Wallet */}
        <div className="nav-actions">
          <WalletConnect
            account={account}
            chainId={chainId}
            isCorrectNetwork={isCorrectNetwork}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onSwitchAccount={onSwitchAccount}
            isConnecting={isConnecting}
          />
        </div>
      </div>
    </nav>
  );
}
