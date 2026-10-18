import React, { useState } from "react";

export default function TransactionStatus({ status, message, txHash, onDismiss }) {
  const [copied, setCopied] = useState(false);

  if (!status || status === "idle") return null;

  const handleCopy = () => {
    if (!txHash) return;
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`tx-alert ${status}`} role="alert">
      {status === "pending" && (
        <span
          className="spinner"
          style={{ borderColor: "rgba(178, 106, 0, 0.3)", borderTopColor: "#B26A00" }}
        />
      )}

      {status === "success" && (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )}

      {status === "error" && (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>
          {status === "pending" && "Transaction Mining in Progress..."}
          {status === "success" && "Transaction Confirmed on Blockchain!"}
          {status === "error" && "Transaction Error"}
        </div>
        <div style={{ fontSize: "0.95rem", marginTop: "2px" }}>{message}</div>

        {txHash && (
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>Tx Hash:</span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.85rem",
                wordBreak: "break-all",
                background: "rgba(0,0,0,0.05)",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {txHash}
            </span>
            <button
              onClick={handleCopy}
              className="copy-btn"
              title="Copy Transaction Hash"
              style={{ fontSize: "0.8rem", textDecoration: "underline" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.2rem",
            lineHeight: 1,
            opacity: 0.7,
            padding: "2px 6px",
          }}
          title="Dismiss notice"
        >
          ×
        </button>
      )}
    </div>
  );
}
