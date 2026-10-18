import React, { useState, useEffect } from "react";
import { getDonorContribution, claimRefundOnChain } from "../services/contract";
import TransactionStatus from "./TransactionStatus";

export default function MyDonations({
  campaigns,
  account,
  signer,
  onConnectWallet,
  onSelectCampaign,
  onRefresh,
}) {
  const [userContributions, setUserContributions] = useState([]);
  const [totalContributed, setTotalContributed] = useState("0");
  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState({
    status: "idle",
    message: "",
    txHash: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadUserContributions() {
      if (!account || !campaigns || campaigns.length === 0) {
        if (isMounted) {
          setUserContributions([]);
          setTotalContributed("0");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        let sum = 0;
        const list = [];

        for (const camp of campaigns) {
          const contrib = await getDonorContribution(camp.id, account);
          const val = parseFloat(contrib.eth);
          if (val > 0) {
            sum += val;
            list.push({
              campaign: camp,
              amountEth: contrib.eth,
            });
          }
        }

        if (isMounted) {
          setUserContributions(list);
          setTotalContributed(sum.toFixed(4));
        }
      } catch (err) {
        console.error("Failed to load user contributions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserContributions();
    return () => {
      isMounted = false;
    };
  }, [account, campaigns]);

  const handleClaimRefund = async (campaignId, amount) => {
    try {
      setTxState({
        status: "pending",
        message: "Submitting refund claim to smart contract...",
        txHash: null,
      });

      const { tx } = await claimRefundOnChain(campaignId, signer);

      setTxState({
        status: "success",
        message: `Refund of ${amount} ETH successfully reclaimed!`,
        txHash: tx.hash,
      });

      onRefresh();
    } catch (err) {
      console.error("Refund failed:", err);
      setTxState({
        status: "error",
        message: err.reason || err.message || "Failed to claim refund.",
        txHash: null,
      });
    }
  };

  if (!account) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Wallet Not Connected</h3>
        <p className="empty-state-desc">
          Connect your MetaMask wallet to inspect your on-chain donation history and refund claims.
        </p>
        <button className="btn btn-primary" onClick={onConnectWallet}>
          Connect MetaMask Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">My On-Chain Donations</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem" }}>
            Verifiable record of your contributions queried directly from the smart contract.
          </p>
        </div>
        <div
          style={{
            backgroundColor: "white",
            padding: "0.75rem 1.25rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            Total Donated:
          </span>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-primary-purple)" }}>
            {totalContributed} ETH
          </div>
        </div>
      </div>

      <TransactionStatus
        status={txState.status}
        message={txState.message}
        txHash={txState.txHash}
        onDismiss={() => setTxState({ status: "idle", message: "", txHash: null })}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <span className="spinner" style={{ borderColor: "#E6DDEA", borderTopColor: "#7450C8" }} />
          <p style={{ marginTop: "1rem", color: "var(--color-text-secondary)" }}>
            Scanning smart contract contributions...
          </p>
        </div>
      ) : userContributions.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-state-title">No Recorded Donations</h3>
          <p className="empty-state-desc">
            You have not made any test ETH donations yet from account <code>{account}</code>.
          </p>
          <button className="btn btn-primary" onClick={() => onSelectCampaign(null)}>
            Explore Verified Campaigns
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {userContributions.map(({ campaign, amountEth }) => {
            const goal = parseFloat(campaign.fundingGoal);
            const raised = parseFloat(campaign.totalRaised);
            const isGoalReached = raised >= goal;
            const isExpired = Date.now() >= campaign.deadline * 1000;
            const canRefund = isExpired && !isGoalReached && !campaign.withdrawn;

            return (
              <div
                key={campaign.id}
                style={{
                  background: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1.25rem",
                  boxShadow: "var(--shadow-subtle)",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span className="badge badge-verified">Campaign #{campaign.id}</span>
                    {campaign.withdrawn ? (
                      <span className="badge badge-status-withdrawn">Withdrawn</span>
                    ) : isGoalReached ? (
                      <span className="badge badge-status-funded">Goal Reached</span>
                    ) : isExpired ? (
                      <span className="badge badge-status-expired">Expired</span>
                    ) : (
                      <span className="badge badge-status-active">Active</span>
                    )}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: "700",
                      color: "var(--color-aubergine)",
                      cursor: "pointer",
                    }}
                    onClick={() => onSelectCampaign(campaign)}
                  >
                    {campaign.title}
                  </h3>
                  <div style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                    Campaign Goal: <strong>{campaign.fundingGoal} ETH</strong> | Total Raised:{" "}
                    <strong>{campaign.totalRaised} ETH</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                      Your Contribution
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--color-aubergine)" }}>
                      {amountEth} ETH
                    </div>
                  </div>

                  {canRefund ? (
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={() => handleClaimRefund(campaign.id, amountEth)}
                      disabled={txState.status === "pending"}
                    >
                      Claim Refund
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectCampaign(campaign)}
                    >
                      View Campaign
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
