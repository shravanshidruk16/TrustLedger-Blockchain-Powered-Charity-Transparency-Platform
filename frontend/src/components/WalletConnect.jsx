import React from "react";
import { shortenAddress, switchToHardhatNetwork } from "../services/wallet";
import { PLATFORM_ADMIN_ADDRESS } from "../config/contractConfig";

export default function WalletConnect({
  account,
  chainId,
  isCorrectNetwork,
  onConnect,
  onDisconnect,
  onSwitchAccount,
  isConnecting,
}) {
  const isAdmin =
    account &&
    PLATFORM_ADMIN_ADDRESS &&
    account.toLowerCase() === PLATFORM_ADMIN_ADDRESS.toLowerCase();

  return (
    <div className="wallet-box">
      {account ? (
        <>
          {/* Network indicator */}
          <div
            className={`network-pill ${isCorrectNetwork ? "hardhat" : "wrong"}`}
            title={`Chain ID: ${chainId}`}
          >
            <span
              className={`network-indicator ${!isCorrectNetwork ? "wrong" : ""}`}
            />
            {isCorrectNetwork ? "Hardhat Local (31337)" : "Wrong Network"}
          </div>

          {!isCorrectNetwork && (
            <button
              className="btn btn-accent btn-sm"
              onClick={switchToHardhatNetwork}
              title="Switch to Hardhat Local Network"
            >
              Switch Network
            </button>
          )}

          {/* Account Pill */}
          <div className="account-pill" title={`Connected: ${account}`}>
            <span>{shortenAddress(account)}</span>
            {isAdmin && <span className="admin-badge">Admin</span>}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onSwitchAccount}
            title="Switch between Admin, Donor, or other accounts in MetaMask"
          >
            Switch Account
          </button>

          <button
            className="btn-disconnect"
            onClick={onDisconnect}
            title="Disconnect application session"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          className="btn btn-primary"
          onClick={onConnect}
          disabled={isConnecting}
          id="connect-wallet-btn"
        >
          {isConnecting ? (
            <>
              <span className="spinner" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
              </svg>
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
