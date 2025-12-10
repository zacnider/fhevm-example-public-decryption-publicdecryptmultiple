// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./IEntropyOracle.sol";

/**
 * @title EntropyPublicDecryptMultiple
 * @notice Public decrypt multiple values using EntropyOracle and makePubliclyDecryptable
 * @dev Example demonstrating EntropyOracle integration: using entropy for public decryption of multiple values
 * 
 * This example shows:
 * - How to integrate with EntropyOracle
 * - Using entropy to enhance public decryption patterns for multiple values
 * - Combining entropy with public decryption for batch operations
 * - Entropy-based public key generation for multiple values
 */
contract EntropyPublicDecryptMultiple is ZamaEthereumConfig {
    // Entropy Oracle interface
    IEntropyOracle public entropyOracle;
    
    // Mapping to store multiple encrypted values by key (publicly decryptable)
    mapping(uint256 => euint64) private encryptedValues;
    
    // Track which keys have been initialized
    mapping(uint256 => bool) public isInitialized;
    
    // Track entropy requests
    mapping(uint256 => bool) public entropyRequests;
    
    // Total number of values stored
    uint256 public totalValues;
    
    event ValueStored(uint256 indexed key, address indexed user);
    event ValuesStoredBatch(uint256[] indexed keys, address indexed user);
    event ValueMadePubliclyDecryptable(uint256 indexed key);
    event EntropyRequested(uint256 indexed requestId, address indexed caller);
    event ValueStoredWithEntropy(uint256 indexed key, uint256 indexed requestId, address indexed user);
    event ValuesStoredBatchWithEntropy(uint256[] indexed keys, uint256 indexed requestId, address indexed user);
    
    /**
     * @notice Constructor - sets EntropyOracle address
     * @param _entropyOracle Address of EntropyOracle contract
     */
    constructor(address _entropyOracle) {
        require(_entropyOracle != address(0), "Invalid oracle address");
        entropyOracle = IEntropyOracle(_entropyOracle);
    }
    
    /**
     * @notice Store encrypted value and make it publicly decryptable
     * @param key Key/index for storing the value
     * @param encryptedInput Encrypted value from user
     * @param inputProof Input proof for encrypted value
     * @dev Makes value decryptable by anyone (use with caution)
     */
    function storeAndMakePublic(
        uint256 key,
        externalEuint64 encryptedInput,
        bytes calldata inputProof
    ) external {
        require(!isInitialized[key], "Key already initialized");
        
        // Convert external to internal
        euint64 internalValue = FHE.fromExternal(encryptedInput, inputProof);
        
        // Allow contract to use
        FHE.allowThis(internalValue);
        
        // Make publicly decryptable (anyone can decrypt)
        encryptedValues[key] = FHE.makePubliclyDecryptable(internalValue);
        isInitialized[key] = true;
        totalValues++;
        
        emit ValueStored(key, msg.sender);
        emit ValueMadePubliclyDecryptable(key);
    }
    
    /**
     * @notice Store multiple encrypted values and make them publicly decryptable
     * @param keys Array of keys for storing values
     * @param encryptedInputs Array of encrypted values from user
     * @param inputProofs Array of input proofs for encrypted values
     * @dev Batch operation to store and make multiple values publicly decryptable
     */
    function storeAndMakePublicBatch(
        uint256[] calldata keys,
        externalEuint64[] calldata encryptedInputs,
        bytes[] calldata inputProofs
    ) external {
        require(keys.length == encryptedInputs.length, "Keys and inputs length mismatch");
        require(keys.length == inputProofs.length, "Keys and proofs length mismatch");
        require(keys.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < keys.length; i++) {
            require(!isInitialized[keys[i]], "Key already initialized");
            
            // Convert external to internal
            euint64 internalValue = FHE.fromExternal(encryptedInputs[i], inputProofs[i]);
            FHE.allowThis(internalValue);
            
            // Make publicly decryptable
            encryptedValues[keys[i]] = FHE.makePubliclyDecryptable(internalValue);
            isInitialized[keys[i]] = true;
            totalValues++;
        }
        
        emit ValuesStoredBatch(keys, msg.sender);
    }
    
    /**
     * @notice Request entropy for enhanced public decryption
     * @param tag Unique tag for this request
     * @return requestId Request ID from EntropyOracle
     * @dev Requires 0.00001 ETH fee
     */
    function requestEntropy(bytes32 tag) external payable returns (uint256 requestId) {
        require(msg.value >= entropyOracle.getFee(), "Insufficient fee");
        
        requestId = entropyOracle.requestEntropy{value: msg.value}(tag);
        entropyRequests[requestId] = true;
        
        emit EntropyRequested(requestId, msg.sender);
        return requestId;
    }
    
    /**
     * @notice Store value with entropy enhancement and make publicly decryptable
     * @param key Key/index for storing the value
     * @param encryptedInput Encrypted value from user
     * @param inputProof Input proof for encrypted value
     * @param requestId Request ID from requestEntropy()
     */
    function storeAndMakePublicWithEntropy(
        uint256 key,
        externalEuint64 encryptedInput,
        bytes calldata inputProof,
        uint256 requestId
    ) external {
        require(!isInitialized[key], "Key already initialized");
        require(entropyRequests[requestId], "Invalid request ID");
        require(entropyOracle.isRequestFulfilled(requestId), "Entropy not ready");
        
        // Convert external to internal
        euint64 internalValue = FHE.fromExternal(encryptedInput, inputProof);
        FHE.allowThis(internalValue);
        
        // Get entropy
        euint64 entropy = entropyOracle.getEncryptedEntropy(requestId);
        FHE.allowThis(entropy);
        
        // Combine value with entropy
        euint64 enhancedValue = FHE.xor(internalValue, entropy);
        FHE.allowThis(enhancedValue);
        
        // Make enhanced value publicly decryptable
        encryptedValues[key] = FHE.makePubliclyDecryptable(enhancedValue);
        isInitialized[key] = true;
        totalValues++;
        
        entropyRequests[requestId] = false;
        emit ValueStoredWithEntropy(key, requestId, msg.sender);
        emit ValueMadePubliclyDecryptable(key);
    }
    
    /**
     * @notice Store multiple values with entropy enhancement and make publicly decryptable
     * @param keys Array of keys for storing values
     * @param encryptedInputs Array of encrypted values from user
     * @param inputProofs Array of input proofs for encrypted values
     * @param requestId Request ID from requestEntropy()
     * @dev Batch operation with entropy enhancement
     */
    function storeAndMakePublicBatchWithEntropy(
        uint256[] calldata keys,
        externalEuint64[] calldata encryptedInputs,
        bytes[] calldata inputProofs,
        uint256 requestId
    ) external {
        require(entropyRequests[requestId], "Invalid request ID");
        require(entropyOracle.isRequestFulfilled(requestId), "Entropy not ready");
        require(keys.length == encryptedInputs.length, "Keys and inputs length mismatch");
        require(keys.length == inputProofs.length, "Keys and proofs length mismatch");
        require(keys.length > 0, "Empty arrays");
        
        // Get entropy once for all values
        euint64 entropy = entropyOracle.getEncryptedEntropy(requestId);
        FHE.allowThis(entropy);
        
        for (uint256 i = 0; i < keys.length; i++) {
            require(!isInitialized[keys[i]], "Key already initialized");
            
            // Convert external to internal
            euint64 internalValue = FHE.fromExternal(encryptedInputs[i], inputProofs[i]);
            FHE.allowThis(internalValue);
            
            // Combine with entropy
            euint64 enhancedValue = FHE.xor(internalValue, entropy);
            FHE.allowThis(enhancedValue);
            
            // Make enhanced value publicly decryptable
            encryptedValues[keys[i]] = FHE.makePubliclyDecryptable(enhancedValue);
            isInitialized[keys[i]] = true;
            totalValues++;
        }
        
        entropyRequests[requestId] = false;
        emit ValuesStoredBatchWithEntropy(keys, requestId, msg.sender);
    }
    
    /**
     * @notice Get encrypted value at a specific key (publicly decryptable)
     * @param key Key/index to retrieve
     * @return Encrypted value (euint64) - anyone can decrypt this
     * @dev Anyone can use FHEVM SDK publicDecrypt to decrypt this value
     */
    function getEncryptedValue(uint256 key) external view returns (euint64) {
        require(isInitialized[key], "Key not initialized");
        return encryptedValues[key];
    }
    
    /**
     * @notice Check if a key is initialized
     * @param key Key to check
     * @return true if initialized, false otherwise
     */
    function isKeyInitialized(uint256 key) external view returns (bool) {
        return isInitialized[key];
    }
    
    /**
     * @notice Get total number of values stored
     * @return Total count of initialized values
     */
    function getTotalValues() external view returns (uint256) {
        return totalValues;
    }
    
    /**
     * @notice Get EntropyOracle address
     */
    function getEntropyOracle() external view returns (address) {
        return address(entropyOracle);
    }
}

