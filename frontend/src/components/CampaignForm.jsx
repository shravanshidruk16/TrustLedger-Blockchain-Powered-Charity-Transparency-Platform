import React, { useState } from "react";
import { createCampaignOnChain } from "../services/contract";
import TransactionStatus from "./TransactionStatus";

export default function CampaignForm({
  signer,
  account,
  isCorrectNetwork,
  onCampaignCreated,
  onConnectWallet,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [customDate, setCustomDate] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);

  const [txState, setTxState] = useState({
    status: "idle", // 'idle' | 'pending' | 'success' | 'error'
    message: "",
    txHash: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      setTxState({
        status: "error",
        message: "Please connect your MetaMask wallet before submitting a campaign.",
        txHash: null,
      });
      return;
    }

    if (!isCorrectNetwork) {
      setTxState({
        status: "error",
        message: "Your wallet is connected to the wrong network. Please switch to Hardhat Local (Chain 31337).",
        txHash: null,
      });
      return;
    }

    // Validation
    if (!title.trim()) {
      setTxState({ status: "error", message: "Campaign title cannot be empty.", txHash: null });
      return;
    }
    if (!description.trim()) {
      setTxState({ status: "error", message: "Campaign description cannot be empty.", txHash: null });
      return;
    }
    const goalNum = parseFloat(fundingGoal);
    if (isNaN(goalNum) || goalNum <= 0) {
      setTxState({ status: "error", message: "Funding goal must be a positive number of ETH.", txHash: null });
      return;
    }

    let deadlineUnix;
    if (useCustomDate && customDate) {
      const selected = new Date(customDate).getTime();
      if (selected <= Date.now()) {
        setTxState({ status: "error", message: "Custom deadline date must be in the future.", txHash: null });
        return;
      }
      deadlineUnix = Math.floor(selected / 1000);
    } else {
      const days = parseInt(durationDays, 10) || 7;
      deadlineUnix = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
    }

    try {
      setTxState({
        status: "pending",
        message: "Submitting campaign transaction to blockchain...",
        txHash: null,
      });

      const { tx, receipt } = await createCampaignOnChain(
        title.trim(),
        description.trim(),
        goalNum,
        deadlineUnix,
        signer
      );

      setTxState({
        status: "success",
        message:
          "Campaign created successfully on-chain! Note: Platform administrator verification is required before donations can be accepted.",
        txHash: tx.hash,
      });

      // Clear form
      setTitle("");
      setDescription("");
      setFundingGoal("");

      if (onCampaignCreated) {
        onCampaignCreated();
      }
    } catch (err) {
      console.error("Campaign creation error:", err);
      let userMsg = "Transaction failed or was rejected.";
      if (err.reason) {
        userMsg = err.reason;
      } else if (err.message && err.message.includes("user rejected action")) {
        userMsg = "Transaction was cancelled in MetaMask.";
      } else if (err.message) {
        userMsg = err.message;
      }

      setTxState({
        status: "error",
        message: userMsg,
        txHash: null,
      });
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2 className="form-title">Create a Charity Campaign</h2>
        <p className="form-subtitle">
          Deploy a transparent fundraising campaign with smart contract enforced goals and deadlines.
        </p>
      </div>

      <div className="info-banner">
        <strong>Important Smart Contract Rule:</strong> Newly created campaigns start in an
        <strong> unverified state</strong>. Only campaigns reviewed and verified by the designated
        platform administrator can accept donations. This prevents spam while maintaining transparent
        on-chain records.
      </div>

      <TransactionStatus
        status={txState.status}
        message={txState.message}
        txHash={txState.txHash}
        onDismiss={() => setTxState({ status: "idle", message: "", txHash: null })}
      />

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="title">
            Campaign Title *
          </label>
          <input
            id="title"
            className="form-input"
            type="text"
            placeholder="e.g. Clean Water and Sanitation for Rural Villages"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Campaign Purpose & Scope *
          </label>
          <textarea
            id="description"
            className="form-textarea"
            rows="4"
            placeholder="Describe the charitable objective, planned fund usage, and expected beneficiary impact..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="form-hint">
            Provide clear details so reviewers and potential donors understand the project.
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="goal">
              Funding Goal (ETH) *
            </label>
            <div className="input-with-addon">
              <input
                id="goal"
                className="form-input"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="e.g. 5.0"
                value={fundingGoal}
                onChange={(e) => setFundingGoal(e.target.value)}
                required
              />
              <span className="input-addon">ETH</span>
            </div>
            <div className="form-hint">Funds can only be withdrawn if this exact target is met.</div>
          </div>

          <div className="form-group">
            <label className="form-label">Campaign Duration *</label>
            {!useCustomDate ? (
              <div>
                <select
                  className="form-select"
                  value={durationDays}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setUseCustomDate(true);
                    } else {
                      setDurationDays(e.target.value);
                    }
                  }}
                >
                  <option value="3">3 Days (Fast track)</option>
                  <option value="7">7 Days (Standard)</option>
                  <option value="14">14 Days (Extended)</option>
                  <option value="30">30 Days (Full month)</option>
                  <option value="custom">Set Specific Custom Date & Time...</option>
                </select>
                <div className="form-hint">
                  If the goal is not met by the deadline, donors can claim refunds.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setUseCustomDate(false)}
                  >
                    Presets
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {!account ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem" }}
              onClick={onConnectWallet}
            >
              Connect Wallet to Create Campaign
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem" }}
              disabled={txState.status === "pending"}
              id="submit-campaign-btn"
            >
              {txState.status === "pending" ? (
                <>
                  <span className="spinner" />
                  <span>Submitting to Blockchain...</span>
                </>
              ) : (
                "Deploy Campaign to Blockchain"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
