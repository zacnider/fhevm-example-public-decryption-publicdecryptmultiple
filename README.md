# EntropyPublicDecryptMultiple

Public decrypt multiple values using EntropyOracle and makePubliclyDecryptable

## 🚀 Quick Start

1. **Clone this repository:**
   ```bash
   git clone https://github.com/zacnider/fhevm-example-public-decryption-publicdecryptmultiple.git
   cd fhevm-example-public-decryption-publicdecryptmultiple
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Setup environment:**
   ```bash
   npm run setup
   ```
   Then edit `.env` file with your credentials:
   - `SEPOLIA_RPC_URL` - Your Sepolia RPC endpoint
   - `PRIVATE_KEY` - Your wallet private key (for deployment)
   - `ETHERSCAN_API_KEY` - Your Etherscan API key (for verification)

4. **Compile contracts:**
   ```bash
   npm run compile
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

6. **Deploy to Sepolia:**
   ```bash
   npm run deploy:sepolia
   ```

7. **Verify contract (after deployment):**
   ```bash
   npm run verify <CONTRACT_ADDRESS>
   ```

**Alternative:** Use the [Examples page](https://entrofhe.vercel.app/examples) for browser-based deployment and verification.

---

## 🚀 Standard workflow
- Install (first run): `npm install --legacy-peer-deps`
- Compile: `npx hardhat compile`
- Test (local FHE + local oracle/chaos engine auto-deployed): `npx hardhat test`
- Deploy (frontend Deploy button): constructor arg is fixed to EntropyOracle `0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361`
- Verify: `npx hardhat verify --network sepolia <contractAddress> 0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361`

## 📋 Overview

This example demonstrates **public decrypting multiple values** in FHEVM with **EntropyOracle integration**:
- Integrating with EntropyOracle for batch operations
- Storing multiple encrypted values that are publicly decryptable
- Using entropy to enhance public decryption patterns for multiple values
- Batch operations for efficient multi-value public decryption

## 🎯 What This Example Teaches

This tutorial will teach you:

1. **How to store multiple encrypted values** that are publicly decryptable
2. **How to make multiple values decryptable by anyone** using makePubliclyDecryptable
3. **How to perform batch operations** for multiple values
4. **How to enhance multiple values with entropy** from EntropyOracle
5. **The importance of `FHE.makePubliclyDecryptable()`** for public decryption in batch operations

## 💡 Why This Matters

Batch public decryption is essential for efficient FHEVM operations. With EntropyOracle, you can:
- **Process multiple values** in a single transaction
- **Add randomness** to multiple encrypted values without revealing them
- **Enhance security** by mixing entropy with user-encrypted data in batch
- **Reduce gas costs** by batching operations
- **Learn efficient patterns** for handling multiple publicly decryptable values

## 🔍 How It Works

### Contract Structure

The contract has four main components:

1. **Basic Single Storage**: Store and make a single value publicly decryptable at a specific key
2. **Batch Storage**: Store and make multiple values publicly decryptable at once
3. **Entropy Request**: Request randomness from EntropyOracle
4. **Entropy-Enhanced Storage**: Combine user values with entropy (single and batch)

### Key Functions

#### 1. Single Value Storage

```solidity
function storeAndMakePublic(
    uint256 key,
    externalEuint64 encryptedInput,
    bytes calldata inputProof
) external {
    euint64 internalValue = FHE.fromExternal(encryptedInput, inputProof);
    FHE.allowThis(internalValue);
    encryptedValues[key] = FHE.makePubliclyDecryptable(internalValue);  // Make public
}
```

#### 2. Batch Storage

```solidity
function storeAndMakePublicBatch(
    uint256[] calldata keys,
    externalEuint64[] calldata encryptedInputs,
    bytes[] calldata inputProofs
) external {
    for (uint256 i = 0; i < keys.length; i++) {
        euint64 internalValue = FHE.fromExternal(encryptedInputs[i], inputProofs[i]);
        FHE.allowThis(internalValue);
        encryptedValues[keys[i]] = FHE.makePubliclyDecryptable(internalValue);  // Make public
    }
}
```

#### 3. Entropy-Enhanced Batch

```solidity
function storeAndMakePublicBatchWithEntropy(
    uint256[] calldata keys,
    externalEuint64[] calldata encryptedInputs,
    bytes[] calldata inputProofs,
    uint256 requestId
) external {
    euint64 entropy = entropyOracle.getEncryptedEntropy(requestId);
    FHE.allowThis(entropy);
    
    for (uint256 i = 0; i < keys.length; i++) {
        euint64 internalValue = FHE.fromExternal(encryptedInputs[i], inputProofs[i]);
        FHE.allowThis(internalValue);
        euint64 enhancedValue = FHE.xor(internalValue, entropy);
        FHE.allowThis(enhancedValue);
        encryptedValues[keys[i]] = FHE.makePubliclyDecryptable(enhancedValue);  // Make public
    }
}
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

The tests cover:
- Single value storage and make public
- Batch storage and make public
- Entropy-enhanced storage (single and batch)
- Error handling (mismatched arrays, empty arrays, duplicate keys)
- Value retrieval by key

## 📚 Related Examples

- [EntropyPublicDecryption (Single)](../public-decryption-publicdecryptsingle/) - Single value public decryption
- [EntropyEncryptMultiple](../encryption-encryptmultiple/) - Encrypt multiple values
- [EntropyUserDecryptMultiple](../user-decryption-userdecryptmultiple/) - User decrypt multiple values

## 🔗 Links

- [EntropyOracle Documentation](https://entrofhe.vercel.app)
- [FHEVM Documentation](https://docs.zama.org/protocol)
- [Examples Hub](https://entrofhe.vercel.app/examples)

## 📝 License

BSD-3-Clause-Clear
