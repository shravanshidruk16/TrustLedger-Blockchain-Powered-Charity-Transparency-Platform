import React from "react";
import { CONTRACT_ADDRESS, PLATFORM_ADMIN_ADDRESS, RPC_URL, NETWORK_CHAIN_ID } from "../config/contractConfig";
import { shortenAddress } from "../services/wallet";

export default function AboutView() {
  return (
    <div className="about-container">
      <div className="about-header">
        <h1 className="about-h1">About TrustLedger</h1>
        <div className="about-meta">
          Fourth-Year Computer Engineering Mini-Project
        </div>
        <p style={{ marginTop: "0.5rem", fontStyle: "italic", color: "var(--color-text-secondary)" }}>
          Syllabus Title: &ldquo;Mini Project - Develop a Blockchain based application for transparent and genuine charity&rdquo;
        </p>
      </div>

      <div className="about-block">
        <h2 className="about-h2">1. Project Overview & Motivation</h2>
        <p className="about-p">
          Conventional charitable fundraising platforms often suffer from opacity, high administrative
          commissions, and donor skepticism. Donors rarely receive cryptographically verifiable proof of
          whether their donations reached the intended campaign, whether the campaign achieved its overall
          budget, or what happens if the campaign falls short.
        </p>
        <p className="about-p">
          <strong>TrustLedger</strong> addresses these challenges by making the Ethereum blockchain the
          single source of truth for:
        </p>
        <ul className="feature-list">
          <li>
            <strong>Campaign Creation & Escrow:</strong> Campaigns are registered as immutable smart-contract
            records with explicit funding targets and deadlines.
          </li>
          <li>
            <strong>Platform Verification Workflow:</strong> Only campaigns reviewed and verified on-chain by
            the platform administrator can receive donor funds.
          </li>
          <li>
            <strong>Cryptographic Financial Transparency:</strong> Every donation emits an unalterable event
            storing the donor&apos;s address, contributed amount, and block timestamp.
          </li>
          <li>
            <strong>Rule-Enforced Fund Release:</strong> Smart contracts prevent creators from withdrawing funds
            until the funding goal is fully met.
          </li>
          <li>
            <strong>Donor Refund Guarantee:</strong> If a campaign fails to reach its funding target before
            its deadline passes, donors can reclaim 100% of their contributions directly from the contract.
          </li>
        </ul>
      </div>

      <div className="about-block">
        <h2 className="about-h2">2. System Architecture</h2>
        <p className="about-p">
          TrustLedger eliminates traditional backends (such as Flask, Python, or SQL databases) for financial
          logic. All campaign balances, contribution ledgers, and access control rules reside inside
          the Solidity smart contract.
        </p>
        <div
          style={{
            background: "var(--color-warm-white)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "1.25rem",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            lineHeight: "1.6",
            marginBottom: "1.25rem",
          }}
        >
          <div><strong>Contract Address:</strong> {CONTRACT_ADDRESS}</div>
          <div><strong>Platform Administrator:</strong> {PLATFORM_ADMIN_ADDRESS}</div>
          <div><strong>Development Network:</strong> Hardhat Local Node (Chain ID {NETWORK_CHAIN_ID})</div>
          <div><strong>RPC Endpoint:</strong> {RPC_URL}</div>
        </div>
      </div>

      <div className="about-block">
        <h2 className="about-h2">3. Hardhat Local Network MetaMask Setup</h2>
        <p className="about-p">
          To test TrustLedger locally, configure your MetaMask browser extension with the Hardhat development
          network parameters:
        </p>
        <table className="history-table" style={{ marginBottom: "1.25rem" }}>
          <tbody>
            <tr>
              <td><strong>Network Name</strong></td>
              <td>Hardhat Local</td>
            </tr>
            <tr>
              <td><strong>New RPC URL</strong></td>
              <td><code>http://127.0.0.1:8545</code></td>
            </tr>
            <tr>
              <td><strong>Chain ID</strong></td>
              <td><code>31337</code></td>
            </tr>
            <tr>
              <td><strong>Currency Symbol</strong></td>
              <td><code>ETH</code></td>
            </tr>
          </tbody>
        </table>
        <p className="about-p" style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)" }}>
          Import one of the pre-funded development accounts provided by <code>npx hardhat node</code> into
          MetaMask to begin testing with test ETH. Never use real funds or import production private keys.
        </p>
      </div>

      <div className="disclaimer-card">
        <div className="disclaimer-title">
          Educational Demonstration &amp; Real-World Limitations
        </div>
        <p style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "var(--color-text-primary)" }}>
          <strong>Critical Clarification:</strong> While the blockchain guarantees mathematical precision,
          unalterable accounting, and automated refund enforcement, an on-chain verification flag indicates
          only that an authorized platform reviewer approved the listing within this application. The
          blockchain cannot independently authenticate real-world charity credentials, tax registrations, or
          physical fund expenditure after withdrawal. In a production environment, this must be paired with
          legal due diligence, multi-signature governance, and external auditor milestone attestations.
        </p>
      </div>
    </div>
  );
}
