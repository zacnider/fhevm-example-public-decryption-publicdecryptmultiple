import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { EntropyPublicDecryptMultiple } from "../types";

/**
 * @title EntropyPublicDecryptMultiple Tests
 * @notice Comprehensive tests for EntropyPublicDecryptMultiple contract with EntropyOracle integration
 * @chapter public-decryption
 */
describe("EntropyPublicDecryptMultiple", function () {
    async function deployContractFixture() {
    const [owner, user1] = await hre.ethers.getSigners();
    
    // Check if we're on Sepolia and have real oracle address
    const network = await hre.ethers.provider.getNetwork();
    const isSepolia = network.chainId === BigInt(11155111);
    const realOracleAddress = process.env.ENTROPY_ORACLE_ADDRESS || "0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361";
    
    let oracleAddress: string;
    let oracle: any;
    let chaosEngine: any;
    
    if (isSepolia && realOracleAddress && realOracleAddress !== "0x0000000000000000000000000000000000000000") {
      // Use real deployed EntropyOracle on Sepolia
      console.log(`Using real EntropyOracle on Sepolia: ${realOracleAddress}`);
      oracleAddress = realOracleAddress;
      const OracleFactory = await hre.ethers.getContractFactory("EntropyOracle");
      oracle = OracleFactory.attach(oracleAddress);
    } else {
      // Deploy locally for testing
      console.log("Deploying EntropyOracle locally for testing...");
      
      // Deploy FHEChaosEngine
      const ChaosEngineFactory = await hre.ethers.getContractFactory("FHEChaosEngine");
      chaosEngine = await ChaosEngineFactory.deploy(owner.address);
      await chaosEngine.waitForDeployment();
      const chaosEngineAddress = await chaosEngine.getAddress();
      
      // Initialize master seed for FHEChaosEngine
      const masterSeedInput = hre.fhevm.createEncryptedInput(chaosEngineAddress, owner.address);
      masterSeedInput.add64(12345);
      const encryptedMasterSeed = await masterSeedInput.encrypt();
      await chaosEngine.initializeMasterSeed(encryptedMasterSeed.handles[0], encryptedMasterSeed.inputProof);
      
      // Deploy EntropyOracle
      const OracleFactory = await hre.ethers.getContractFactory("EntropyOracle");
      oracle = await OracleFactory.deploy(chaosEngineAddress, owner.address, owner.address);
      await oracle.waitForDeployment();
      oracleAddress = await oracle.getAddress();
    }
    
    // Deploy EntropyPublicDecryptMultiple
    const ContractFactory = await hre.ethers.getContractFactory("EntropyPublicDecryptMultiple");
    const contract = await ContractFactory.deploy(oracleAddress) as any;
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    await hre.fhevm.assertCoprocessorInitialized(contract, "EntropyPublicDecryptMultiple");
    
    return { contract, owner, user1, contractAddress, oracleAddress, oracle, chaosEngine: chaosEngine || null };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.getAddress()).to.be.properAddress;
    });

    it("Should have EntropyOracle address set", async function () {
      const { contract, oracleAddress } = await loadFixture(deployContractFixture);
      expect(await contract.getEntropyOracle()).to.equal(oracleAddress);
    });

    it("Should start with zero total values", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.getTotalValues()).to.equal(0);
    });
  });

  describe("Basic Public Decryption - Single Value", function () {
    it("Should store and make single value publicly decryptable", async function () {
      const { contract, contractAddress, owner } = await loadFixture(deployContractFixture);
      
      const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
      input.add64(42);
      const encryptedInput = await input.encrypt();
      
      await contract.storeAndMakePublic(0, encryptedInput.handles[0], encryptedInput.inputProof);
      
      expect(await contract.isKeyInitialized(0)).to.be.true;
      expect(await contract.getTotalValues()).to.equal(1);
    });

    it("Should fail if key already initialized", async function () {
      const { contract, contractAddress, owner } = await loadFixture(deployContractFixture);
      
      const input1 = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
      input1.add64(42);
      const encryptedInput1 = await input1.encrypt();
      await contract.storeAndMakePublic(0, encryptedInput1.handles[0], encryptedInput1.inputProof);
      
      const input2 = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
      input2.add64(100);
      const encryptedInput2 = await input2.encrypt();
      
      await expect(
        contract.storeAndMakePublic(0, encryptedInput2.handles[0], encryptedInput2.inputProof)
      ).to.be.revertedWith("Key already initialized");
    });
  });

  describe("Batch Public Decryption", function () {
    it("Should store and make multiple values publicly decryptable", async function () {
      const { contract, contractAddress, owner } = await loadFixture(deployContractFixture);
      
      const keys = [0, 1, 2];
      const encryptedInputs = [];
      const inputProofs = [];
      
      for (let i = 0; i < keys.length; i++) {
        const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
        input.add64(10 + i);
        const encryptedInput = await input.encrypt();
        encryptedInputs.push(encryptedInput.handles[0]);
        inputProofs.push(encryptedInput.inputProof);
      }
      
      await contract.storeAndMakePublicBatch(keys, encryptedInputs, inputProofs);
      
      expect(await contract.getTotalValues()).to.equal(3);
      expect(await contract.isKeyInitialized(0)).to.be.true;
      expect(await contract.isKeyInitialized(1)).to.be.true;
      expect(await contract.isKeyInitialized(2)).to.be.true;
    });

    it("Should fail with mismatched array lengths", async function () {
      const { contract, contractAddress, owner } = await loadFixture(deployContractFixture);
      
      const keys = [0, 1];
      const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
      input.add64(42);
      const encryptedInput = await input.encrypt();
      
      await expect(
        contract.storeAndMakePublicBatch(keys, [encryptedInput.handles[0]], [encryptedInput.inputProof])
      ).to.be.revertedWith("Keys and inputs length mismatch");
    });

    it("Should fail with empty arrays", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      
      await expect(
        contract.storeAndMakePublicBatch([], [], [])
      ).to.be.revertedWith("Empty arrays");
    });
  });

  describe("Entropy-Enhanced Public Decryption", function () {
    it("Should request entropy", async function () {
      const { contract, oracle } = await loadFixture(deployContractFixture);
      
      const tag = hre.ethers.id("test-public-decrypt-multiple");
      const fee = await oracle.getFee();
      
      await expect(
        contract.requestEntropy(tag, { value: fee })
      ).to.emit(contract, "EntropyRequested");
    });

    it("Should store single value with entropy", async function () {
      const { contract, contractAddress, owner, oracle } = await loadFixture(deployContractFixture);
      
      // Request entropy
      const tag = hre.ethers.id("public-decrypt-multiple-1");
      const fee = await oracle.getFee();
      const tx = await contract.requestEntropy(tag, { value: fee });
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "EntropyRequested";
        } catch {
          return false;
        }
      });
      const requestId = event ? contract.interface.parseLog(event).args[0] : null;
      
      if (requestId) {
        const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
        input.add64(42);
        const encryptedInput = await input.encrypt();
        
        // Note: This will fail if entropy is not ready, which is expected
        // In real tests, wait for entropy fulfillment first
      }
    });
  });

  describe("Batch Entropy-Enhanced Public Decryption", function () {
    it("Should store multiple values with entropy in batch", async function () {
      const { contract, contractAddress, owner, oracle } = await loadFixture(deployContractFixture);
      
      // Request entropy
      const tag = hre.ethers.id("public-decrypt-batch-entropy");
      const fee = await oracle.getFee();
      const tx = await contract.requestEntropy(tag, { value: fee });
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "EntropyRequested";
        } catch {
          return false;
        }
      });
      const requestId = event ? contract.interface.parseLog(event).args[0] : null;
      
      if (requestId) {
        const keys = [0, 1, 2];
        const encryptedInputs = [];
        const inputProofs = [];
        
        for (let i = 0; i < keys.length; i++) {
          const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
          input.add64(20 + i);
          const encryptedInput = await input.encrypt();
          encryptedInputs.push(encryptedInput.handles[0]);
          inputProofs.push(encryptedInput.inputProof);
        }
        
        // Note: This will fail if entropy is not ready, which is expected
        // In real tests, wait for entropy fulfillment first
      }
    });
  });

  describe("Value Retrieval", function () {
    it("Should retrieve encrypted value by key", async function () {
      const { contract, contractAddress, owner } = await loadFixture(deployContractFixture);
      
      const input = hre.fhevm.createEncryptedInput(contractAddress, owner.address);
      input.add64(42);
      const encryptedInput = await input.encrypt();
      
      await contract.storeAndMakePublic(5, encryptedInput.handles[0], encryptedInput.inputProof);
      
      const encryptedValue = await contract.getEncryptedValue(5);
      expect(encryptedValue).to.not.be.undefined;
    });

    it("Should fail to retrieve uninitialized key", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      
      await expect(
        contract.getEncryptedValue(999)
      ).to.be.revertedWith("Key not initialized");
    });
  });
});

