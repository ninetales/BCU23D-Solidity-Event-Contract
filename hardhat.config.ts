import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" }); // Ensure .env is loaded

// Correct the environment variables
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ETHERSCAN_API = process.env.ETHERSCAN_API_KEY;

// Ensure the required environment variables are defined
if (!INFURA_API_KEY) {
  throw new Error("INFURA_API_KEY is not defined");
}

if (!SEPOLIA_PRIVATE_KEY) {
  throw new Error("SEPOLIA_PRIVATE_KEY is not defined");
}

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [`0x${SEPOLIA_PRIVATE_KEY}`],  // Add '0x' prefix to private key
    },
  },
  etherscan: {
    apiKey: {
      sepolia: `${ETHERSCAN_API}`
    }
  },
  sourcify: {
    enabled: true
  },
};

export default config;