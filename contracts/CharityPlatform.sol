// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CharityPlatform (TrustLedger)
 * @author Computer Engineering Mini-Project
 * @notice Transparent and genuine charity donation platform on Ethereum.
 * @dev Enforces campaign creation, platform verification, transparent donations,
 *      goal-contingent creator withdrawals, and donor refunds for unsuccessful campaigns.
 */
contract CharityPlatform {
    // -------------------------------------------------------------
    // DATA STRUCTURES
    // -------------------------------------------------------------

    struct Campaign {
        uint256 id;
        string title;
        string description;
        address payable creator;
        uint256 fundingGoal; // in wei
        uint256 totalRaised; // in wei
        uint256 deadline;    // Unix timestamp in seconds
        bool verified;       // Marked true only by platform administrator
        bool withdrawn;      // Marked true when creator successfully withdraws
        bool exists;         // Guard to verify campaign existence
    }

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    /// @notice Address of the platform administrator (contract deployer)
    address public immutable admin;

    /// @notice Total number of campaigns created
    uint256 public campaignCount;

    /// @notice Mapping from campaign ID to Campaign details
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Mapping from campaign ID => donor address => contributed amount in wei
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /// @notice List of donor addresses for each campaign (for donor transparency)
    mapping(uint256 => address[]) private campaignDonors;

    /// @notice Helper to avoid duplicate addresses in campaignDonors
    mapping(uint256 => mapping(address => bool)) private hasDonated;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------

    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 fundingGoal,
        uint256 deadline
    );

    event CampaignVerified(
        uint256 indexed id,
        address indexed admin,
        uint256 timestamp
    );

    event DonationReceived(
        uint256 indexed id,
        address indexed donor,
        uint256 amount,
        uint256 newTotalRaised,
        uint256 timestamp
    );

    event FundsWithdrawn(
        uint256 indexed id,
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    event RefundClaimed(
        uint256 indexed id,
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "TrustLedger: Only platform administrator can perform this action");
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCount && campaigns[_campaignId].exists, "TrustLedger: Campaign does not exist");
        _;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------

    constructor() {
        admin = msg.sender;
    }

    // -------------------------------------------------------------
    // CORE FUNCTIONS
    // -------------------------------------------------------------

    /**
     * @notice Create a new fundraising campaign.
     * @param _title Title of the charity campaign
     * @param _description Brief description of the campaign and its objective
     * @param _fundingGoal Target funding amount in wei
     * @param _deadline Unix timestamp when funding ends (must be in the future)
     * @return campaignId The unique ID assigned to the new campaign
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _fundingGoal,
        uint256 _deadline
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "TrustLedger: Title cannot be empty");
        require(bytes(_description).length > 0, "TrustLedger: Description cannot be empty");
        require(_fundingGoal > 0, "TrustLedger: Funding goal must be greater than zero");
        require(_deadline > block.timestamp, "TrustLedger: Deadline must be in the future");

        campaignCount++;
        uint256 newId = campaignCount;

        campaigns[newId] = Campaign({
            id: newId,
            title: _title,
            description: _description,
            creator: payable(msg.sender),
            fundingGoal: _fundingGoal,
            totalRaised: 0,
            deadline: _deadline,
            verified: false,
            withdrawn: false,
            exists: true
        });

        emit CampaignCreated(newId, msg.sender, _title, _fundingGoal, _deadline);

        return newId;
    }

    /**
     * @notice Mark a campaign as verified by the platform administrator.
     * @dev Only verified campaigns can accept donations.
     * @param _campaignId The ID of the campaign to verify
     */
    function verifyCampaign(uint256 _campaignId) external onlyAdmin campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.verified, "TrustLedger: Campaign is already verified");

        campaign.verified = true;

        emit CampaignVerified(_campaignId, msg.sender, block.timestamp);
    }

    /**
     * @notice Donate test ETH to a verified campaign.
     * @param _campaignId The ID of the campaign to support
     */
    function donate(uint256 _campaignId) external payable campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];

        require(campaign.verified, "TrustLedger: Campaign must be verified by administrator before accepting donations");
        require(block.timestamp < campaign.deadline, "TrustLedger: Campaign funding deadline has passed");
        require(!campaign.withdrawn, "TrustLedger: Campaign has already been completed and funds withdrawn");
        require(msg.value > 0, "TrustLedger: Donation amount must be greater than zero");

        // Checks-Effects
        campaign.totalRaised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;

        if (!hasDonated[_campaignId][msg.sender]) {
            hasDonated[_campaignId][msg.sender] = true;
            campaignDonors[_campaignId].push(msg.sender);
        }

        emit DonationReceived(_campaignId, msg.sender, msg.value, campaign.totalRaised, block.timestamp);
    }

    /**
     * @notice Withdraw funds once funding goal has been achieved.
     * @dev Only the campaign creator can withdraw. Checks-Effects-Interactions pattern enforced.
     * @param _campaignId The ID of the campaign
     */
    function withdrawFunds(uint256 _campaignId) external campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];

        require(msg.sender == campaign.creator, "TrustLedger: Only campaign creator can withdraw funds");
        require(campaign.totalRaised >= campaign.fundingGoal, "TrustLedger: Funding goal has not been reached yet");
        require(!campaign.withdrawn, "TrustLedger: Funds have already been withdrawn");

        uint256 amountToWithdraw = campaign.totalRaised;
        campaign.withdrawn = true;

        emit FundsWithdrawn(_campaignId, campaign.creator, amountToWithdraw, block.timestamp);

        // Safe external transfer
        (bool sent, ) = campaign.creator.call{value: amountToWithdraw}("");
        require(sent, "TrustLedger: Withdrawal transfer failed");
    }

    /**
     * @notice Claim a refund if the campaign expired without reaching its funding goal.
     * @dev Donors can withdraw their proportional contributions. Checks-Effects-Interactions pattern enforced.
     * @param _campaignId The ID of the expired campaign
     */
    function claimRefund(uint256 _campaignId) external campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];

        require(block.timestamp >= campaign.deadline, "TrustLedger: Campaign deadline has not yet passed");
        require(campaign.totalRaised < campaign.fundingGoal, "TrustLedger: Funding goal was reached; refunds not allowed");
        require(!campaign.withdrawn, "TrustLedger: Funds already withdrawn");

        uint256 refundAmount = contributions[_campaignId][msg.sender];
        require(refundAmount > 0, "TrustLedger: No eligible contribution found for refund");

        // Zero out before transfer to prevent reentrancy
        contributions[_campaignId][msg.sender] = 0;

        emit RefundClaimed(_campaignId, msg.sender, refundAmount, block.timestamp);

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "TrustLedger: Refund transfer failed");
    }

    // -------------------------------------------------------------
    // VIEW / GETTER FUNCTIONS
    // -------------------------------------------------------------

    /**
     * @notice Get full details of a specific campaign.
     */
    function getCampaign(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (
            uint256 id,
            string memory title,
            string memory description,
            address creator,
            uint256 fundingGoal,
            uint256 totalRaised,
            uint256 deadline,
            bool verified,
            bool withdrawn
        )
    {
        Campaign storage c = campaigns[_campaignId];
        return (
            c.id,
            c.title,
            c.description,
            c.creator,
            c.fundingGoal,
            c.totalRaised,
            c.deadline,
            c.verified,
            c.withdrawn
        );
    }

    /**
     * @notice Get all campaigns in a single query for efficient frontend loading.
     */
    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignCount);
        for (uint256 i = 1; i <= campaignCount; i++) {
            allCampaigns[i - 1] = campaigns[i];
        }
        return allCampaigns;
    }

    /**
     * @notice Get contribution of a specific donor to a campaign.
     */
    function getContribution(uint256 _campaignId, address _donor)
        external
        view
        campaignExists(_campaignId)
        returns (uint256)
    {
        return contributions[_campaignId][_donor];
    }

    /**
     * @notice Get list of unique donor addresses for a campaign.
     */
    function getCampaignDonors(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (address[] memory)
    {
        return campaignDonors[_campaignId];
    }

    /**
     * @notice Get platform-wide summary statistics derived directly from contract state.
     */
    function getPlatformStats()
        external
        view
        returns (
            uint256 totalCampaigns,
            uint256 verifiedCampaigns,
            uint256 totalDonatedWei,
            uint256 successfulCampaigns
        )
    {
        uint256 verifiedCount = 0;
        uint256 totalWei = 0;
        uint256 successfulCount = 0;

        for (uint256 i = 1; i <= campaignCount; i++) {
            if (campaigns[i].verified) {
                verifiedCount++;
            }
            totalWei += campaigns[i].totalRaised;
            if (campaigns[i].totalRaised >= campaigns[i].fundingGoal) {
                successfulCount++;
            }
        }

        return (campaignCount, verifiedCount, totalWei, successfulCount);
    }
}
