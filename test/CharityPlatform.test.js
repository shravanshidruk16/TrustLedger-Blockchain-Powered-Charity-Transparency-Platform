const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TrustLedger - CharityPlatform Smart Contract", function () {
  let CharityPlatform;
  let charityPlatform;
  let admin, creator, donor1, donor2, unauthorizedUser;

  const ONE_DAY_IN_SECS = 24 * 60 * 60;
  const SEVEN_DAYS_IN_SECS = 7 * ONE_DAY_IN_SECS;

  beforeEach(async function () {
    [admin, creator, donor1, donor2, unauthorizedUser] = await ethers.getSigners();

    CharityPlatform = await ethers.getContractFactory("CharityPlatform");
    charityPlatform = await CharityPlatform.deploy();
    await charityPlatform.waitForDeployment();
  });

  describe("Deployment & Access Control", function () {
    it("Should deploy and set the deployer as admin", async function () {
      expect(await charityPlatform.admin()).to.equal(admin.address);
      expect(await charityPlatform.campaignCount()).to.equal(0);
    });
  });

  describe("Campaign Creation", function () {
    it("Should create a valid campaign successfully", async function () {
      const latestTime = await time.latest();
      const deadline = latestTime + SEVEN_DAYS_IN_SECS;
      const fundingGoal = ethers.parseEther("5");

      const tx = await charityPlatform.connect(creator).createCampaign(
        "Clean Water Initiative",
        "Providing clean drinking water to remote villages.",
        fundingGoal,
        deadline
      );

      await expect(tx)
        .to.emit(charityPlatform, "CampaignCreated")
        .withArgs(1, creator.address, "Clean Water Initiative", fundingGoal, deadline);

      expect(await charityPlatform.campaignCount()).to.equal(1);

      const campaign = await charityPlatform.getCampaign(1);
      expect(campaign.id).to.equal(1);
      expect(campaign.title).to.equal("Clean Water Initiative");
      expect(campaign.description).to.equal("Providing clean drinking water to remote villages.");
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.fundingGoal).to.equal(fundingGoal);
      expect(campaign.totalRaised).to.equal(0);
      expect(campaign.deadline).to.equal(deadline);
      expect(campaign.verified).to.equal(false);
      expect(campaign.withdrawn).to.equal(false);
    });

    it("Should reject an empty campaign title", async function () {
      const latestTime = await time.latest();
      const deadline = latestTime + SEVEN_DAYS_IN_SECS;

      await expect(
        charityPlatform.connect(creator).createCampaign(
          "",
          "Some description",
          ethers.parseEther("1"),
          deadline
        )
      ).to.be.revertedWith("TrustLedger: Title cannot be empty");
    });

    it("Should reject an empty campaign description", async function () {
      const latestTime = await time.latest();
      const deadline = latestTime + SEVEN_DAYS_IN_SECS;

      await expect(
        charityPlatform.connect(creator).createCampaign(
          "Valid Title",
          "",
          ethers.parseEther("1"),
          deadline
        )
      ).to.be.revertedWith("TrustLedger: Description cannot be empty");
    });

    it("Should reject an invalid funding goal of zero", async function () {
      const latestTime = await time.latest();
      const deadline = latestTime + SEVEN_DAYS_IN_SECS;

      await expect(
        charityPlatform.connect(creator).createCampaign(
          "Valid Title",
          "Valid description",
          0,
          deadline
        )
      ).to.be.revertedWith("TrustLedger: Funding goal must be greater than zero");
    });

    it("Should reject a deadline in the past or present", async function () {
      const latestTime = await time.latest();

      await expect(
        charityPlatform.connect(creator).createCampaign(
          "Valid Title",
          "Valid description",
          ethers.parseEther("1"),
          latestTime - 100
        )
      ).to.be.revertedWith("TrustLedger: Deadline must be in the future");
    });
  });

  describe("Campaign Verification", function () {
    let deadline;
    beforeEach(async function () {
      const latestTime = await time.latest();
      deadline = latestTime + SEVEN_DAYS_IN_SECS;
      await charityPlatform.connect(creator).createCampaign(
        "Medical Aid",
        "Emergency medical supplies.",
        ethers.parseEther("2"),
        deadline
      );
    });

    it("Should allow the administrator to verify a valid campaign", async function () {
      const tx = await charityPlatform.connect(admin).verifyCampaign(1);
      await expect(tx)
        .to.emit(charityPlatform, "CampaignVerified");

      const campaign = await charityPlatform.getCampaign(1);
      expect(campaign.verified).to.equal(true);
    });

    it("Should reject verification attempts from unauthorized accounts", async function () {
      await expect(
        charityPlatform.connect(unauthorizedUser).verifyCampaign(1)
      ).to.be.revertedWith("TrustLedger: Only platform administrator can perform this action");
    });

    it("Should reject re-verifying an already verified campaign", async function () {
      await charityPlatform.connect(admin).verifyCampaign(1);
      await expect(
        charityPlatform.connect(admin).verifyCampaign(1)
      ).to.be.revertedWith("TrustLedger: Campaign is already verified");
    });

    it("Should reject verification for a nonexistent campaign", async function () {
      await expect(
        charityPlatform.connect(admin).verifyCampaign(999)
      ).to.be.revertedWith("TrustLedger: Campaign does not exist");
    });
  });

  describe("Donations", function () {
    let deadline;
    const goal = ethers.parseEther("3");

    beforeEach(async function () {
      const latestTime = await time.latest();
      deadline = latestTime + SEVEN_DAYS_IN_SECS;
      await charityPlatform.connect(creator).createCampaign(
        "Education For All",
        "School supplies and books for students.",
        goal,
        deadline
      );
    });

    it("Should reject donations to unverified campaigns", async function () {
      await expect(
        charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("TrustLedger: Campaign must be verified by administrator before accepting donations");
    });

    it("Should accept a valid donation to a verified campaign and update state", async function () {
      await charityPlatform.connect(admin).verifyCampaign(1);

      const donationAmount = ethers.parseEther("1");
      const tx = await charityPlatform.connect(donor1).donate(1, { value: donationAmount });

      await expect(tx)
        .to.emit(charityPlatform, "DonationReceived");

      const campaign = await charityPlatform.getCampaign(1);
      expect(campaign.totalRaised).to.equal(donationAmount);

      const contribution = await charityPlatform.getContribution(1, donor1.address);
      expect(contribution).to.equal(donationAmount);

      const donors = await charityPlatform.getCampaignDonors(1);
      expect(donors.length).to.equal(1);
      expect(donors[0]).to.equal(donor1.address);
    });

    it("Should track multiple donations from different donors correctly", async function () {
      await charityPlatform.connect(admin).verifyCampaign(1);

      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") });
      await charityPlatform.connect(donor2).donate(1, { value: ethers.parseEther("1.5") });
      // Donor1 donates again
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("0.5") });

      const campaign = await charityPlatform.getCampaign(1);
      expect(campaign.totalRaised).to.equal(ethers.parseEther("3"));

      expect(await charityPlatform.getContribution(1, donor1.address)).to.equal(ethers.parseEther("1.5"));
      expect(await charityPlatform.getContribution(1, donor2.address)).to.equal(ethers.parseEther("1.5"));

      const donors = await charityPlatform.getCampaignDonors(1);
      expect(donors.length).to.equal(2);
    });

    it("Should reject zero-value donations", async function () {
      await charityPlatform.connect(admin).verifyCampaign(1);
      await expect(
        charityPlatform.connect(donor1).donate(1, { value: 0 })
      ).to.be.revertedWith("TrustLedger: Donation amount must be greater than zero");
    });

    it("Should reject donations to a nonexistent campaign", async function () {
      await expect(
        charityPlatform.connect(donor1).donate(999, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("TrustLedger: Campaign does not exist");
    });

    it("Should reject donations after the campaign deadline has passed", async function () {
      await charityPlatform.connect(admin).verifyCampaign(1);

      // Fast forward past deadline
      await time.increase(SEVEN_DAYS_IN_SECS + 10);

      await expect(
        charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("TrustLedger: Campaign funding deadline has passed");
    });
  });

  describe("Withdrawals", function () {
    let deadline;
    const goal = ethers.parseEther("4");

    beforeEach(async function () {
      const latestTime = await time.latest();
      deadline = latestTime + SEVEN_DAYS_IN_SECS;
      await charityPlatform.connect(creator).createCampaign(
        "Reforestation Project",
        "Planting 10,000 indigenous trees.",
        goal,
        deadline
      );
      await charityPlatform.connect(admin).verifyCampaign(1);
    });

    it("Should allow the creator to withdraw once the goal is reached", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("2") });
      await charityPlatform.connect(donor2).donate(1, { value: ethers.parseEther("2") });

      const initialCreatorBalance = await ethers.provider.getBalance(creator.address);

      const tx = await charityPlatform.connect(creator).withdrawFunds(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx).to.emit(charityPlatform, "FundsWithdrawn");

      const finalCreatorBalance = await ethers.provider.getBalance(creator.address);
      expect(finalCreatorBalance + gasUsed - initialCreatorBalance).to.equal(goal);

      const campaign = await charityPlatform.getCampaign(1);
      expect(campaign.withdrawn).to.equal(true);
    });

    it("Should reject withdrawal attempts before the funding goal is reached", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("2") }); // Only 2 of 4 ETH

      await expect(
        charityPlatform.connect(creator).withdrawFunds(1)
      ).to.be.revertedWith("TrustLedger: Funding goal has not been reached yet");
    });

    it("Should reject withdrawal attempts by non-creators", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: goal });

      await expect(
        charityPlatform.connect(unauthorizedUser).withdrawFunds(1)
      ).to.be.revertedWith("TrustLedger: Only campaign creator can withdraw funds");
    });

    it("Should prevent repeated withdrawals", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: goal });
      await charityPlatform.connect(creator).withdrawFunds(1);

      await expect(
        charityPlatform.connect(creator).withdrawFunds(1)
      ).to.be.revertedWith("TrustLedger: Funds have already been withdrawn");
    });

    it("Should reject donations after a campaign has been closed by withdrawal", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: goal });
      await charityPlatform.connect(creator).withdrawFunds(1);

      await expect(
        charityPlatform.connect(donor2).donate(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("TrustLedger: Campaign has already been completed and funds withdrawn");
    });
  });

  describe("Refunds", function () {
    let deadline;
    const goal = ethers.parseEther("5");

    beforeEach(async function () {
      const latestTime = await time.latest();
      deadline = latestTime + SEVEN_DAYS_IN_SECS;
      await charityPlatform.connect(creator).createCampaign(
        "Community Center",
        "Building a community library.",
        goal,
        deadline
      );
      await charityPlatform.connect(admin).verifyCampaign(1);
    });

    it("Should allow eligible donors to claim a refund if the deadline passed and goal was not reached", async function () {
      const donationAmount = ethers.parseEther("2");
      await charityPlatform.connect(donor1).donate(1, { value: donationAmount });

      // Advance time past deadline
      await time.increase(SEVEN_DAYS_IN_SECS + 50);

      const initialDonorBalance = await ethers.provider.getBalance(donor1.address);
      const tx = await charityPlatform.connect(donor1).claimRefund(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      await expect(tx)
        .to.emit(charityPlatform, "RefundClaimed")
        .withArgs(1, donor1.address, donationAmount, (val) => true);

      const finalDonorBalance = await ethers.provider.getBalance(donor1.address);
      expect(finalDonorBalance + gasUsed - initialDonorBalance).to.equal(donationAmount);

      // Contribution record should be reset to zero
      expect(await charityPlatform.getContribution(1, donor1.address)).to.equal(0);
    });

    it("Should reject refund claim before the campaign deadline passes", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") });

      await expect(
        charityPlatform.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("TrustLedger: Campaign deadline has not yet passed");
    });

    it("Should reject refund claim if the campaign reached its goal", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("5") });

      await time.increase(SEVEN_DAYS_IN_SECS + 50);

      await expect(
        charityPlatform.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("TrustLedger: Funding goal was reached; refunds not allowed");
    });

    it("Should reject repeat refund claims by the same donor", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS_IN_SECS + 50);

      await charityPlatform.connect(donor1).claimRefund(1);

      await expect(
        charityPlatform.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("TrustLedger: No eligible contribution found for refund");
    });

    it("Should reject refund claims by users who never contributed", async function () {
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") });
      await time.increase(SEVEN_DAYS_IN_SECS + 50);

      await expect(
        charityPlatform.connect(unauthorizedUser).claimRefund(1)
      ).to.be.revertedWith("TrustLedger: No eligible contribution found for refund");
    });
  });

  describe("Platform Stats & Batch Querying", function () {
    it("Should correctly return platform statistics and all campaigns", async function () {
      const latestTime = await time.latest();
      const deadline = latestTime + SEVEN_DAYS_IN_SECS;

      await charityPlatform.connect(creator).createCampaign("C1", "Desc1", ethers.parseEther("1"), deadline);
      await charityPlatform.connect(creator).createCampaign("C2", "Desc2", ethers.parseEther("2"), deadline);

      await charityPlatform.connect(admin).verifyCampaign(1);
      await charityPlatform.connect(donor1).donate(1, { value: ethers.parseEther("1") });

      const stats = await charityPlatform.getPlatformStats();
      expect(stats.totalCampaigns).to.equal(2);
      expect(stats.verifiedCampaigns).to.equal(1);
      expect(stats.totalDonatedWei).to.equal(ethers.parseEther("1"));
      expect(stats.successfulCampaigns).to.equal(1);

      const all = await charityPlatform.getAllCampaigns();
      expect(all.length).to.equal(2);
      expect(all[0].title).to.equal("C1");
      expect(all[1].title).to.equal("C2");
    });
  });
});
