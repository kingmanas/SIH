// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserReportStorage {
    struct UserReport {
        string category;
        string subcategory;
        string date;
        string time;
        string name;
        string nearestPoliceStation;
        string userAddress;    
        string documentHash;   // CID from Helia for documents/evidence
        string userIdHash;     // CID from Helia for user ID (Aadhar, etc.)
    }

    // Mapping of reports by user address and an auto-incrementing ID
    mapping(address => mapping(uint256 => UserReport)) private reports;
    mapping(address => uint256) private reportCount;

    event ReportStored(address indexed user, uint256 reportId, string category, string documentHash);

    // Function to store a new report
    function storeReport(
        string calldata category,
        string calldata subcategory,
        string calldata date,
        string calldata time,
        string calldata name,
        string calldata nearestPoliceStation,
        string calldata userAddress,  
        string calldata documentHash,
        string calldata userIdHash
    ) external {
        uint256 currentReportId = reportCount[msg.sender];
        reports[msg.sender][currentReportId] = UserReport(
            category,
            subcategory,
            date,
            time,
            name,
            nearestPoliceStation,
            userAddress, 
            documentHash,
            userIdHash
        );
        reportCount[msg.sender] += 1;

        emit ReportStored(msg.sender, currentReportId, category, documentHash);
    }

    // Function to retrieve a report by ID
    function getReportById(uint256 reportId) external view returns (
        string memory category,
        string memory subcategory,
        string memory date,
        string memory time,
        string memory name,
        string memory nearestPoliceStation,
        string memory userAddress, 
        string memory documentHash,
        string memory userIdHash
    ) {
        UserReport storage report = reports[msg.sender][reportId];
        return (
            report.category,
            report.subcategory,
            report.date,
            report.time,
            report.name,
            report.nearestPoliceStation,
            report.userAddress,  
            report.documentHash,
            report.userIdHash
        );
    }
}
