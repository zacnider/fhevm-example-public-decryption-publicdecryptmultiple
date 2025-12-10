import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Example } from "../types";

/**
 * @title Example Tests
 * @notice Comprehensive tests for Example contract
 * @chapter basic
 */
describe("Example", function () {
  /**
   * @notice Deploy contract fixture
   * @dev Reusable deployment function for tests
   */
  async function deployContractFixture() {
    const [owner, user1, user2] = await hre.ethers.getSigners();
    
    const ContractFactory = await hre.ethers.getContractFactory("Example");
    const contract = await ContractFactory.deploy();
    await contract.waitForDeployment();
    
    // Get contract address
    const contractAddress = await contract.getAddress();
    
    // Assert coprocessor is initialized (this sets up the FHEVM environment)
    await hre.fhevm.assertCoprocessorInitialized(contract, "Example");
    
    return { contract, owner, user1, user2, contractAddress };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.getAddress()).to.be.properAddress;
    });
  });

  // TODO: Add your test cases here
  describe("Functionality", function () {
    it("Should work correctly", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      // TODO: Add test implementation
      // Example: Create encrypted input using hre.fhevm
      // const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
      // input.add64(42);
      // const encryptedInput = await input.encrypt();
    });
  });
});
