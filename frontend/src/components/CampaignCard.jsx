import React, { useState } from "react";
import { shortenAddress } from "../services/wallet";

export default function CampaignCard({ campaign, onSelectCampaign }) {
  const [copied, setCopied] = useState(false);

  const goal = parseFloat(campaign.fundingGoal) || 0;
  const raised = parseFloat(campaign.totalRaised) || 0;
  const progressPercent = goal > 0 ? ((raised / goal) * 100).toFixed(1) : "0.0";
  const displayProgress = Math.min(100, Math.max(0, parseFloat(progressPercent)));

  const isGoalReached = raised >= goal && goal > 0;
  const nowMs = Date.now();
  const deadlineMs = campaign.deadline * 1000;
  const isExpired = nowMs >= deadlineMs;

  const handleCopyCreator = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(campaign.creator);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format deadline readable
  const deadlineFormatted = new Date(deadlineMs).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Calculate days/hours remaining
  const msRemaining = deadlineMs - nowMs;
  let timeRemainingText = "Expired";
  if (!isExpired) {
    const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) {
      timeRemainingText = `${days} day${days > 1 ? "s" : ""} left`;
    } else {
      timeRemainingText = `${hours} hour${hours > 1 ? "s" : ""} left`;
    }
  }

  return (
    <div className="campaign-card">
      <div>
        <div className="card-top">
          <div className="campaign-badge-group">
            {campaign.verified ? (
              <span className="badge badge-verified" title="Verified by Platform Administrator">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Verified
              </span>
            ) : (
              <span className="badge badge-unverified" title="Awaiting Administrator Approval">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Pending Verification
              </span>
            )}

            {campaign.withdrawn ? (
              <span className="badge badge-status-withdrawn">Funds Withdrawn</span>
            ) : isGoalReached ? (
              <span className="badge badge-status-funded">Goal Reached</span>
            ) : isExpired ? (
              <span className="badge badge-status-expired">Campaign Ended</span>
            ) : (
              <span className="badge badge-status-active">Active</span>
            )}
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            #{campaign.id}
          </span>
        </div>

        <h3 className="campaign-card-title">{campaign.title}</h3>
        <p className="campaign-card-desc">{campaign.description}</p>

        <div className="creator-info">
          <span>Creator:</span>
          <span className="address-code">{shortenAddress(campaign.creator)}</span>
          <button
            className="copy-btn"
            onClick={handleCopyCreator}
            title="Copy full creator address"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Progress */}
        <div className="progress-container">
          <div className="progress-labels">
            <div>
              <span className="progress-raised">{campaign.totalRaised} ETH</span>
              <span className="progress-goal"> raised</span>
            </div>
            <span style={{ fontWeight: 700, color: "var(--color-dark-purple)" }}>
              {progressPercent}%
            </span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${displayProgress}%` }} />
          </div>
        </div>

        <div className="card-footer-info">
          <div>
            <span>Goal: </span>
            <strong style={{ color: "var(--color-aubergine)" }}>{campaign.fundingGoal} ETH</strong>
          </div>
          <div title={`Deadline: ${deadlineFormatted}`}>
            <span>Deadline: </span>
            <strong style={{ color: isExpired ? "var(--color-error)" : "inherit" }}>
              {timeRemainingText}
            </strong>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={() => onSelectCampaign(campaign)}
        >
          {campaign.verified && !campaign.withdrawn && !isExpired
            ? "View & Donate"
            : "View Details"}
        </button>
      </div>
    </div>
  );
}
