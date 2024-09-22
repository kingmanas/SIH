const express = require("express");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const { createHelia } = require("@helia/core");
const { unixfs } = require("@helia/unixfs");
const multer = require("multer");
const fs = require("fs");

dotenv.config();

const app = express();
const port = 3000;

// Setup file upload using multer
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// Polygon RPC provider and wallet setup
const provider = new ethers.providers.JsonRpcProvider(
  process.env.POLYGON_RPC_URL
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract ABI and address
const contractABI = [
  "function storeReport(string calldata category, string calldata subcategory, string calldata date, string calldata time, string calldata name, string calldata nearestPoliceStation, string calldata address, string calldata documentHash, string calldata userIdHash) external",
  "function getReportById(uint256 reportId) external view returns (string memory, string memory, string memory, string memory, string memory, string memory, string memory, string memory, string memory)",
];
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Initialize Helia node
const initializeHelia = async () => {
  const helia = await createHelia();
  const fs = unixfs(helia);
  return { helia, fs };
};

// API to upload user data and documents to Helia and store on-chain
// API to upload user data and documents to Helia and store on-chain
app.post(
  "/upload-report",
  upload.fields([{ name: "document" }, { name: "userId" }]),
  async (req, res) => {
    try {
      const {
        category,
        subcategory,
        date,
        time,
        name,
        nearestPoliceStation,
        userAddress,
      } = req.body; // userAddress instead of address
      const documentFile = req.files["document"][0];
      const userIdFile = req.files["userId"][0];

      // Initialize Helia
      const { fs: heliaFs } = await initializeHelia();

      // Upload document to Helia
      const documentBuffer = fs.readFileSync(documentFile.path);
      const documentResult = await heliaFs.addFile({ content: documentBuffer });
      const documentHash = documentResult.cid.toString();

      // Upload user ID to Helia
      const userIdBuffer = fs.readFileSync(userIdFile.path);
      const userIdResult = await heliaFs.addFile({ content: userIdBuffer });
      const userIdHash = userIdResult.cid.toString();

      // Store data on Polygon chain
      const tx = await contract.storeReport(
        category,
        subcategory,
        date,
        time,
        name,
        nearestPoliceStation,
        userAddress, // Use updated userAddress field here
        documentHash,
        userIdHash
      );
      await tx.wait();

      // Clean up uploaded files
      fs.unlinkSync(documentFile.path);
      fs.unlinkSync(userIdFile.path);

      res.status(200).json({
        message: "Report stored successfully on-chain",
        transactionHash: tx.hash,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to upload report" });
    }
  }
);

// API to retrieve report by ID
app.get("/get-report", async (req, res) => {
  try {
    const { reportId } = req.query;

    if (!reportId) {
      return res.status(400).json({ error: "Report ID is required" });
    }

    // Retrieve report data from contract
    const reportData = await contract.getReportById(reportId);

    res.status(200).json({
      reportId,
      category: reportData[0],
      subcategory: reportData[1],
      date: reportData[2],
      time: reportData[3],
      name: reportData[4],
      nearestPoliceStation: reportData[5],
      address: reportData[6],
      documentHash: reportData[7],
      userIdHash: reportData[8],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve report" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
