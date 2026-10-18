import React, { useState, useEffect } from "react";
import { shortenAddress } from "../services/wallet";
import {
  donateToCampaignOnChain,
  verifyCampaignOnChain,
  withdrawFundsOnChain,
  claimRefundOnChain,
  fetchCampaignDonations,
  getDonorContribution,
} from "../services/contract";
import { PLATFORM_ADMIN_ADDRESS } from "../config/contractConfig";
import TransactionStatus from "./TransactionStatus";

export default function CampaignDetails({
  campaign,
  account,
  signer,
  isCorrectNetwork,
  onClose,
  onRefresh,
}) {
  const [donationAmount, setDonationAmount] = useState("");
  const [donations, setDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [userContribution, setUserContribution] = useState("0");
  const [copiedAddress, setCopiedAddress] = useState(null);

  const [txState, setTxState] = useState({
    status: "idle",
    message: "",
    txHash: null,
  });

  const isAdmin =
    account &&
    PLATFORM_ADMIN_ADDRESS &&
    account.toLowerCase() === PLATFORM_ADMIN_ADDRESS.toLowerCase();

  const isCreator =
    account &&
    campaign.creator &&
    account.toLowerCase() === campaign.creator.toLowerCase();

  const goal = parseFloat(campaign.fundingGoal) || 0;
  const raised = parseFloat(campaign.totalRaised) || 0;
  const isGoalReached = raised >= goal && goal > 0;
  const nowMs = Date.now();
  const deadlineMs = campaign.deadline * 1000;
  const isExpired = nowMs >= deadlineMs;

  const progressPercent = goal > 0 ? ((raised / goal) * 100).toFixed(1) : "0.0";
  const displayProgress = Math.min(100, Math.max(0, parseFloat(progressPercent)));

  // Load donation history and user contribution
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoadingDonations(true);
        const history = await fetchCampaignDonations(campaign.id);
        if (isMounted) setDonations(history);

        if (account) {
          const contrib = await getDonorContribution(campaign.id, account);
          if (isMounted) setUserContribution(contrib.eth);
        }
      } catch (err) {
        console.error("Failed to load campaign details data:", err);
      } finally {
        if (isMounted) setLoadingDonations(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [campaign.id, campaign.totalRaised, account]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(key);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!account) {
      setTxState({
        status: "error",
        message: "Please connect your MetaMask wallet to donate.",
        txHash: null,
      });
      return;
    }
    if (!isCorrectNetwork) {
      setTxState({
        status: "error",
        message: "Wrong network! Please switch MetaMask to Hardhat Local (Chain 31337).",
        txHash: null,
      });
      return;
    }
    const val = parseFloat(donationAmount);
    if (isNaN(val) || val <= 0) {
      setTxState({
        status: "error",
        message: "Please enter a valid donation amount greater than 0 ETH.",
        txHash: null,
      });
      return;
    }

    try {
      setTxState({
        status: "pending",
        message: `Broadcasting donation of ${donationAmount} ETH...`,
        txHash: null,
      });

      const { tx } = await donateToCampaignOnChain(campaign.id, donationAmount, signer);

      setTxState({
        status: "success",
        message: `Donation confirmed! Thank you for contributing ${donationAmount} ETH.`,
        txHash: tx.hash,
      });

      setDonationAmount("");
      onRefresh();
    } catch (err) {
      console.error("Donation failed:", err);
      setTxState({
        status: "error",
        message: err.reason || err.message || "Donation transaction reverted.",
        txHash: null,
      });
    }
  };

  const handleVerify = async () => {
    try {
      setTxState({
        status: "pending",
        message: "Submitting administrator verification...",
        txHash: null,
      });

      const { tx } = await verifyCampaignOnChain(campaign.id, signer);

      setTxState({
        status: "success",
        message: "Campaign has been verified by the administrator! Donations are now unlocked.",
        txHash: tx.hash,
      });

      onRefresh();
    } catch (err) {
      console.error("Verification failed:", err);
      setTxState({
        status: "error",
        message: err.reason || err.message || "Verification transaction failed.",
        txHash: null,
      });
    }
  };

  const handleWithdraw = async () => {
    try {
      setTxState({
        status: "pending",
        message: "Withdrawing raised funds to creator address...",
        txHash: null,
      });

      const { tx } = await withdrawFundsOnChain(campaign.id, signer);

      setTxState({
        status: "success",
        message: `Successfully withdrawn ${campaign.totalRaised} ETH to creator wallet!`,
        txHash: tx.hash,
      });

      onRefresh();
    } catch (err) {
      console.error("Withdrawal failed:", err);
      setTxState({
        status: "error",
        message: err.reason || err.message || "Withdrawal failed.",
        txHash: null,
      });
    }
  };

  const handleClaimRefund = async () => {
    try {
      setTxState({
        status: "pending",
        message: "Processing refund claim on-chain...",
        txHash: null,
      });

      const { tx } = await claimRefundOnChain(campaign.id, signer);

      setTxState({
        status: "success",
        message: `Refund of ${userContribution} ETH sent to your wallet!`,
        txHash: tx.hash,
      });

      setUserContribution("0");
      onRefresh();
    } catch (err) {
      console.error("Refund claim failed:", err);
      setTxState({
        status: "error",
        message: err.reason || err.message || "Refund claim failed.",
        txHash: null,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="campaign-badge-group" style={{ marginBottom: "6px" }}>
              {campaign.verified ? (
                <span className="badge badge-verified">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Verified by Admin
                </span>
              ) : (
                <span className="badge badge-unverified">
                  Pending Admin Verification
                </span>
              )}

              {campaign.withdrawn ? (
                <span className="badge badge-status-withdrawn">Withdrawn</span>
              ) : isGoalReached ? (
                <span className="badge badge-status-funded">Goal Achieved</span>
              ) : isExpired ? (
                <span className="badge badge-status-expired">Campaign Closed</span>
              ) : (
                <span className="badge badge-status-active">Active</span>
              )}

              <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", alignSelf: "center" }}>
                Campaign #{campaign.id}
              </span>
            </div>
            <h2 className="modal-title">{campaign.title}</h2>
          </div>
          <button className="btn-close" onClick={onClose} title="Close window">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <TransactionStatus
            status={txState.status}
            message={txState.message}
            txHash={txState.txHash}
            onDismiss={() => setTxState({ status: "idle", message: "", txHash: null })}
          />

          {/* Description */}
          <div className="detail-section">
            <h3 className="detail-section-title">Campaign Purpose & Scope</h3>
            <p style={{ fontSize: "1.05rem", lineHeight: "1.7", color: "var(--color-text-primary)" }}>
              {campaign.description}
            </p>
            <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
              <strong>Campaign Creator:</strong>{" "}
              <span className="address-code">{shortenAddress(campaign.creator)}</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(campaign.creator, "creator")}
              >
                {copiedAddress === "creator" ? "Copied" : "Copy full address"}
              </button>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="detail-metrics-grid">
            <div className="metric-box">
              <div className="metric-box-label">Funding Goal</div>
              <div className="metric-box-val">{campaign.fundingGoal} ETH</div>
            </div>
            <div className="metric-box">
              <div className="metric-box-label">Total Raised</div>
              <div className="metric-box-val" style={{ color: "var(--color-primary-purple)" }}>
                {campaign.totalRaised} ETH
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-box-label">Funding Progress</div>
              <div className="metric-box-val">{progressPercent}%</div>
            </div>
            <div className="metric-box">
              <div className="metric-box-label">Deadline</div>
              <div className="metric-box-val" style={{ fontSize: "1.1rem" }}>
                {new Date(campaign.deadline * 1000).toLocaleDateString()}
              </div>
              <span style={{ fontSize: "0.75rem", color: isExpired ? "var(--color-error)" : "inherit" }}>
                {isExpired ? "Funding period expired" : "Active fundraising"}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-container" style={{ marginBottom: "2rem" }}>
            <div className="progress-track" style={{ height: "12px" }}>
              <div className="progress-fill" style={{ width: `${displayProgress}%` }} />
            </div>
          </div>

          {/* ADMIN VERIFICATION ACTION */}
          {isAdmin && !campaign.verified && (
            <div
              style={{
                backgroundColor: "var(--color-pale-lavender)",
                border: "2px solid var(--color-primary-purple)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <strong style={{ color: "var(--color-dark-purple)", fontSize: "1.1rem" }}>
                  Platform Administrator Action
                </strong>
                <p style={{ fontSize: "0.9rem", color: "var(--color-aubergine)" }}>
                  As platform administrator, verify this campaign to permit donors to contribute on-chain.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleVerify}
                disabled={txState.status === "pending"}
              >
                Verify Campaign Now
              </button>
            </div>
          )}

          {/* CREATOR WITHDRAW ACTION */}
          {isCreator && isGoalReached && !campaign.withdrawn && (
            <div
              style={{
                backgroundColor: "var(--color-success-bg)",
                border: "2px solid var(--color-success)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <strong style={{ color: "var(--color-success)", fontSize: "1.1rem" }}>
                  Funding Goal Reached!
                </strong>
                <p style={{ fontSize: "0.9rem", color: "#1B5E20" }}>
                  You are the creator of this campaign. The full goal of {campaign.fundingGoal} ETH has been met.
                  You can now withdraw the raised funds ({campaign.totalRaised} ETH).
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: "var(--color-success)", borderColor: "#1B5E20" }}
                onClick={handleWithdraw}
                disabled={txState.status === "pending"}
              >
                Withdraw {campaign.totalRaised} ETH
              </button>
            </div>
          )}

          {/* DONOR REFUND ACTION */}
          {isExpired && !isGoalReached && parseFloat(userContribution) > 0 && !campaign.withdrawn && (
            <div
              style={{
                backgroundColor: "var(--color-warning-bg)",
                border: "2px solid var(--color-warning)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <strong style={{ color: "var(--color-warning)", fontSize: "1.1rem" }}>
                  Campaign Expired Without Reaching Goal
                </strong>
                <p style={{ fontSize: "0.9rem", color: "#663C00" }}>
                  You contributed <strong>{userContribution} ETH</strong>. The smart contract allows you to
                  claim a 100% refund of your contributions.
                </p>
              </div>
              <button
                className="btn btn-accent"
                onClick={handleClaimRefund}
                disabled={txState.status === "pending"}
              >
                Claim Refund ({userContribution} ETH)
              </button>
            </div>
          )}

          {/* DONATE BOX */}
          {campaign.verified && !campaign.withdrawn && !isExpired ? (
            <div className="donation-box">
              <h3 className="donation-box-title">Make a Transparent Blockchain Donation</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                Your donation of test ETH goes directly to the smart contract escrow. Funds are locked until
                the creator reaches the goal, or refunded if the deadline expires.
              </p>

              <form onSubmit={handleDonate}>
                <div className="quick-amount-buttons">
                  {["0.05", "0.1", "0.5", "1.0"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="quick-amount-btn"
                      onClick={() => setDonationAmount(preset)}
                    >
                      {preset} ETH
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div className="input-with-addon" style={{ flex: 1 }}>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      className="form-input"
                      placeholder="Enter amount in ETH"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      required
                    />
                    <span className="input-addon">ETH</span>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={txState.status === "pending"}
                  >
                    {txState.status === "pending" ? (
                      <>
                        <span className="spinner" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Confirm Donation"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : !campaign.verified ? (
            <div className="info-banner" style={{ marginBottom: "2rem" }}>
              <strong>Donations Locked:</strong> This campaign is pending administrator verification.
              Once approved, donors will be able to contribute test ETH.
            </div>
          ) : campaign.withdrawn ? (
            <div className="info-banner" style={{ marginBottom: "2rem" }}>
              <strong>Campaign Completed:</strong> Funding goal was reached and funds have been withdrawn by
              the creator. No further donations are accepted.
            </div>
          ) : (
            <div className="info-banner" style={{ marginBottom: "2rem" }}>
              <strong>Campaign Concluded:</strong> The fundraising deadline has passed.
            </div>
          )}

          {/* ON-CHAIN DONATION HISTORY */}
          <div className="detail-section">
            <h3 className="detail-section-title">
              On-Chain Donation Ledger ({donations.length} {donations.length === 1 ? "Contribution" : "Contributions"})
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
              All donations are recorded as immutable Solidity events on the Ethereum blockchain.
            </p>

            {loadingDonations ? (
              <div style={{ textAlign: "center", padding: "1.5rem" }}>
                <span className="spinner" style={{ borderColor: "#E6DDEA", borderTopColor: "#7450C8" }} />
                <span style={{ marginLeft: "8px", color: "var(--color-text-secondary)" }}>
                  Scanning blockchain events...
                </span>
              </div>
            ) : donations.length === 0 ? (
              <div
                style={{
                  padding: "1.5rem",
                  background: "var(--color-warm-white)",
                  border: "1px dashed var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                  color: "var(--color-text-secondary)",
                }}
              >
                No donations recorded yet on the blockchain. Be the first contributor!
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Donor Address</th>
                      <th>Amount</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td>{d.timestamp.toLocaleString()}</td>
                        <td>
                          <span className="address-code">{shortenAddress(d.donor)}</span>
                          <button
                            className="copy-btn"
                            onClick={() => handleCopy(d.donor, d.id + "-donor")}
                            title="Copy donor address"
                          >
                            {copiedAddress === d.id + "-donor" ? "Copied" : "Copy"}
                          </button>
                        </td>
                        <td>
                          <strong style={{ color: "var(--color-aubergine)" }}>{d.amountEth} ETH</strong>
                        </td>
                        <td>
                          <span className="address-code" style={{ fontSize: "0.8rem" }}>
                            {shortenAddress(d.transactionHash)}
                          </span>
                          <button
                            className="copy-btn"
                            onClick={() => handleCopy(d.transactionHash, d.id + "-tx")}
                            title="Copy transaction hash"
                          >
                            {copiedAddress === d.id + "-tx" ? "Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
