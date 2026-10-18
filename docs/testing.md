# TrustLedger — Automated Testing Report

**Test Framework:** Hardhat, Mocha, Chai, `@nomicfoundation/hardhat-network-helpers`  
**Test File:** `test/CharityPlatform.test.js`  
**Total Tests:** 27  
**Passing Tests:** 27  
**Failing Tests:** 0  

---

## 1. Test Suite Categories

The test suite covers the entire lifecycle of the `CharityPlatform` smart contract, testing both expected success paths and malicious/reverting edge cases.

### Category 1: Deployment & Access Control
- `Should deploy and set the deployer as admin`: Confirms `admin` state variable is properly initialized to deployer address and `campaignCount` starts at zero.

### Category 2: Campaign Creation
- `Should create a valid campaign successfully`: Verifies `CampaignCreated` event emission, ID incrementation, and exact struct field values.
- `Should reject an empty campaign title`: Ensures revert with `"TrustLedger: Title cannot be empty"`.
- `Should reject an empty campaign description`: Ensures revert with `"TrustLedger: Description cannot be empty"`.
- `Should reject an invalid funding goal of zero`: Ensures revert with `"TrustLedger: Funding goal must be greater than zero"`.
- `Should reject a deadline in the past or present`: Ensures revert with `"TrustLedger: Deadline must be in the future"`.

### Category 3: Campaign Verification
- `Should allow the administrator to verify a valid campaign`: Admin verifies campaign, emitting `CampaignVerified` and setting `verified = true`.
- `Should reject verification attempts from unauthorized accounts`: Reverts if a non-admin calls `verifyCampaign`.
- `Should reject re-verifying an already verified campaign`: Prevents redundant duplicate calls.
- `Should reject verification for a nonexistent campaign`: Prevents modifying uninitialized indices.

### Category 4: Donations
- `Should reject donations to unverified campaigns`: Validates that unverified campaigns cannot receive ETH.
- `Should accept a valid donation to a verified campaign and update state`: Confirms `totalRaised`, individual `contributions`, unique donor arrays, and `DonationReceived` event.
- `Should track multiple donations from different donors correctly`: Verifies independent donor balances and additive cumulative raised amount.
- `Should reject zero-value donations`: Ensures revert if `msg.value == 0`.
- `Should reject donations to a nonexistent campaign`: Ensures revert if campaign ID is invalid.
- `Should reject donations after the campaign deadline has passed`: Uses `time.increase` to warp past the deadline and confirms the contract rejects late donations.

### Category 5: Withdrawals
- `Should allow the creator to withdraw once the goal is reached`: Creator withdraws when `totalRaised >= fundingGoal`. Checks that creator wallet balance increases by the exact raised amount (accounting for gas) and `withdrawn` becomes `true`.
- `Should reject withdrawal attempts before the funding goal is reached`: Prevents early fund release.
- `Should reject withdrawal attempts by non-creators`: Confirms caller authorization.
- `Should prevent repeated withdrawals`: Prevents double withdrawals on the same campaign.
- `Should reject donations after a campaign has been closed by withdrawal`: Confirms completed campaigns are closed to future contributions.

### Category 6: Refunds
- `Should allow eligible donors to claim a refund if the deadline passed and goal was not reached`: Simulates an expired campaign with `time.increase(SEVEN_DAYS + 50)`. Verifies donor receives their exact contributed ETH back and their contribution balance is zeroed out.
- `Should reject refund claim before the campaign deadline passes`: Prevents early withdrawal before the campaign has had its full duration.
- `Should reject refund claim if the campaign reached its goal`: Protects successful campaigns from donor cancellations.
- `Should reject repeat refund claims by the same donor`: Prevents double claiming.
- `Should reject refund claims by users who never contributed`: Protects contract balance against unauthorized claims.

### Category 7: Platform Statistics & Batch Querying
- `Should correctly return platform statistics and all campaigns`: Verifies that `getPlatformStats()` and `getAllCampaigns()` return accurate platform aggregates for frontend consumption.

---

## 2. Actual Test Execution Output

```text
  TrustLedger - CharityPlatform Smart Contract
    Deployment & Access Control
      √ Should deploy and set the deployer as admin (46ms)
    Campaign Creation
      √ Should create a valid campaign successfully
      √ Should reject an empty campaign title (48ms)
      √ Should reject an empty campaign description
      √ Should reject an invalid funding goal of zero
      √ Should reject a deadline in the past or present
    Campaign Verification
      √ Should allow the administrator to verify a valid campaign
      √ Should reject verification attempts from unauthorized accounts
      √ Should reject re-verifying an already verified campaign
      √ Should reject verification for a nonexistent campaign
    Donations
      √ Should reject donations to unverified campaigns
      √ Should accept a valid donation to a verified campaign and update state
      √ Should track multiple donations from different donors correctly
      √ Should reject zero-value donations
      √ Should reject donations to a nonexistent campaign
      √ Should reject donations after the campaign deadline has passed
    Withdrawals
      √ Should allow the creator to withdraw once the goal is reached
      √ Should reject withdrawal attempts before the funding goal is reached
      √ Should reject withdrawal attempts by non-creators
      √ Should prevent repeated withdrawals
      √ Should reject donations after a campaign has been closed by withdrawal
    Refunds
      √ Should allow eligible donors to claim a refund if the deadline passed and goal was not reached
      √ Should reject refund claim before the campaign deadline passes
      √ Should reject refund claim if the campaign reached its goal
      √ Should reject repeat refund claims by the same donor
      √ Should reject refund claims by users who never contributed
    Platform Stats & Batch Querying
      √ Should correctly return platform statistics and all campaigns

  27 passing (2s)
```
