// AutoCruden Logic Module
// Core functionality for Biblical search and visualization

// ============================================================================
// GLOBAL STATE VARIABLES
// ============================================================================

var bible = false;           // Biblical text data (BSB - Berean Study Bible)
var biblematrix = false;     // 384-dimensional embeddings matrix
var wasmModule = null;       // WebAssembly module for performance optimization

// ============================================================================
// COLOR SCHEMES FOR VISUALIZATIONS
// ============================================================================

// Fire color scheme (256 colors) - red/orange/yellow gradient for similarities
var fireColorScheme = ['#000000', '#060000', '#0d0000', '#120000', '#160000', '#190000', '#1c0000', '#1f0000', '#220000', '#240000', '#260000', '#280000', '#2b0000', '#2d0000', '#2e0000', '#300000', '#320000', '#340000', '#350000', '#370000', '#380000', '#3a0000', '#3b0000', '#3d0000', '#3e0000', '#400000', '#410000', '#430000', '#440000', '#460000', '#470000', '#490000', '#4a0000', '#4c0000', '#4d0000', '#4f0000', '#500000', '#520000', '#530000', '#550000', '#560000', '#580000', '#590100', '#5b0100', '#5d0100', '#5e0100', '#600100', '#610100', '#630100', '#650100', '#660100', '#680100', '#690100', '#6b0100', '#6d0100', '#6e0100', '#700100', '#710100', '#730100', '#750100', '#760100', '#780200', '#7a0200', '#7b0200', '#7d0200', '#7f0200', '#800200', '#820200', '#840200', '#850200', '#870200', '#890200', '#8a0200', '#8c0300', '#8e0300', '#900300', '#910300', '#930300', '#950300', '#960300', '#980300', '#9a0300', '#9c0300', '#9d0400', '#9f0400', '#a10400', '#a20400', '#a40400', '#a60400', '#a80400', '#a90400', '#ab0500', '#ad0500', '#af0500', '#b00500', '#b20500', '#b40500', '#b60600', '#b80600', '#b90600', '#bb0600', '#bd0600', '#bf0700', '#c00700', '#c20700', '#c40700', '#c60800', '#c80800', '#c90800', '#cb0800', '#cd0900', '#cf0900', '#d10900', '#d20a00', '#d40a00', '#d60a00', '#d80b00', '#da0b00', '#db0c00', '#dd0c00', '#df0d00', '#e10d00', '#e30e00', '#e40f00', '#e60f00', '#e81000', '#ea1100', '#eb1300', '#ed1400', '#ee1600', '#f01800', '#f11b00', '#f21d00', '#f32000', '#f52300', '#f62600', '#f62900', '#f72c00', '#f82f00', '#f93200', '#f93500', '#fa3800', '#fa3b00', '#fb3d00', '#fb4000', '#fb4300', '#fc4600', '#fc4900', '#fc4b00', '#fd4e00', '#fd5100', '#fd5300', '#fd5600', '#fd5800', '#fe5b00', '#fe5d00', '#fe5f00', '#fe6200', '#fe6400', '#fe6600', '#fe6800', '#fe6b00', '#fe6d00', '#fe6f00', '#fe7100', '#fe7300', '#fe7500', '#fe7700', '#fe7900', '#fe7c00', '#ff7e00', '#ff8000', '#ff8200', '#ff8300', '#ff8500', '#ff8700', '#ff8900', '#ff8b00', '#ff8d00', '#ff8f00', '#ff9100', '#ff9300', '#ff9400', '#ff9600', '#ff9800', '#ff9a00', '#ff9c00', '#ff9d00', '#ff9f00', '#ffa100', '#ffa300', '#ffa401', '#ffa601', '#ffa801', '#ffaa01', '#ffab01', '#ffad01', '#ffaf01', '#ffb001', '#ffb202', '#ffb402', '#ffb502', '#ffb702', '#ffb902', '#ffba02', '#ffbc03', '#ffbd03', '#ffbf03', '#ffc103', '#ffc204', '#ffc404', '#ffc604', '#ffc704', '#ffc905', '#ffca05', '#ffcc05', '#ffce06', '#ffcf06', '#ffd106', '#ffd207', '#ffd407', '#ffd508', '#ffd708', '#ffd909', '#ffda09', '#ffdc0a', '#ffdd0a', '#ffdf0b', '#ffe00b', '#ffe20c', '#ffe30d', '#ffe50e', '#ffe60f', '#ffe810', '#ffea11', '#ffeb12', '#ffed14', '#ffee17', '#fff01a', '#fff11e', '#fff324', '#fff42a', '#fff532', '#fff73b', '#fff847', '#fff953', '#fffb62', '#fffb72', '#fffc83', '#fffd95', '#fffea8', '#fffeba', '#fffecc', '#fffede', '#fffeee', '#ffffff'];

// KBC color scheme (256 colors) - blue/teal gradient for comparison matrices
var kbcColorScheme = ['#00004e', '#000150', '#000152', '#000154', '#000255', '#000257', '#000259', '#00025b', '#00025d', '#00025f', '#010261', '#010263', '#020265', '#030267', '#030269', '#04026c', '#05026e', '#060270', '#060272', '#070274', '#080276', '#090178', '#09017a', '#0a017c', '#0b017e', '#0b0181', '#0c0183', '#0d0185', '#0d0187', '#0e0189', '#0e018b', '#0f018e', '#0f0190', '#0f0192', '#100194', '#100197', '#100199', '#10019b', '#10019d', '#1001a0', '#0f01a2', '#0f02a4', '#0e02a7', '#0e02a9', '#0d02ab', '#0c03ae', '#0b03b0', '#0a04b2', '#0a04b5', '#0904b7', '#0905b9', '#0806bb', '#0806bd', '#0707bf', '#0707c2', '#0708c4', '#0709c6', '#070ac8', '#070bca', '#080ccc', '#080dce', '#090dd0', '#0a0ed1', '#0b0fd3', '#0c10d5', '#0d11d7', '#0e12d9', '#0f13db', '#1014dc', '#1215de', '#1316e0', '#1417e1', '#1618e3', '#1719e5', '#181ae6', '#1a1be7', '#1b1ce9', '#1c1eea', '#1d1feb', '#1e20ed', '#1f22ee', '#2023ef', '#2124f0', '#2226f1', '#2327f2', '#2429f3', '#252af4', '#252cf5', '#262ef5', '#272ff6', '#2831f7', '#2832f7', '#2934f8', '#2a36f8', '#2a37f9', '#2b39f9', '#2b3bf9', '#2c3dfa', '#2c3efa', '#2d40fa', '#2d42fa', '#2d43fa', '#2d45fa', '#2e47fa', '#2e48fb', '#2e4afb', '#2e4cfb', '#2f4dfb', '#2f4ffb', '#2f50fb', '#2f52fb', '#2f53fb', '#2f55fb', '#2f57fb', '#2f58fb', '#2f5afc', '#2f5bfc', '#2f5dfc', '#2f5efc', '#2f5ffc', '#2f61fc', '#2f62fc', '#2e64fc', '#2e65fc', '#2e67fc', '#2e68fc', '#2d6afc', '#2d6bfd', '#2d6cfd', '#2c6efd', '#2c6ffd', '#2c71fd', '#2c72fd', '#2b73fd', '#2b75fd', '#2b76fd', '#2b77fd', '#2b79fd', '#2b7afd', '#2b7bfd', '#2b7dfd', '#2b7efd', '#2b7ffd', '#2b81fd', '#2c82fd', '#2c83fd', '#2c84fd', '#2c86fd', '#2d87fd', '#2d88fd', '#2e8afd', '#2e8bfd', '#2f8cfd', '#2f8dfd', '#308ffd', '#3090fd', '#3191fd', '#3292fd', '#3293fd', '#3395fd', '#3396fd', '#3497fd', '#3498fd', '#349afd', '#359bfc', '#359cfc', '#359dfc', '#359ffc', '#35a0fc', '#35a1fc', '#35a3fc', '#35a4fc', '#35a5fc', '#35a6fc', '#35a8fc', '#35a9fc', '#34aafc', '#34abfc', '#34adfc', '#33aefc', '#33affc', '#32b0fc', '#32b2fc', '#31b3fc', '#30b4fc', '#2fb6fc', '#2fb7fc', '#2eb8fc', '#2db9fc', '#2dbbfc', '#2cbcfc', '#2bbdfc', '#2bbffb', '#2ac0fb', '#2ac1fb', '#29c2fb', '#29c4fb', '#29c5fb', '#29c6fb', '#28c7fb', '#28c8fb', '#28cafb', '#28cbfb', '#28ccfb', '#28cdfb', '#29cffb', '#29d0fb', '#29d1fa', '#2ad2fa', '#2ad3fa', '#2bd5fa', '#2bd6fa', '#2cd7fa', '#2dd8fa', '#2ed9fa', '#30dbfa', '#32dcf9', '#35ddf9', '#38def9', '#3bdff9', '#3ee0f9', '#42e1f9', '#45e2f9', '#49e3f9', '#4ce4f9', '#50e5f9', '#53e6f8', '#57e7f8', '#5ae8f8', '#5ee9f8', '#61eaf8', '#65ebf8', '#68ecf8', '#6cecf8', '#6fedf8', '#73eef7', '#76eff7', '#79f0f7', '#7df1f7', '#80f2f7', '#83f2f7', '#87f3f7', '#8af4f7', '#8df5f6', '#90f6f6', '#93f7f6', '#97f7f6', '#9af8f6', '#9df9f6', '#a0faf6', '#a3faf6', '#a6fbf6', '#a9fcf5', '#adfdf5', '#b0fef5', '#b3fef5'];

// ============================================================================
// MATHEMATICAL OPERATIONS
// ============================================================================

/**
 * Computes the dot product of two vectors (cosine similarity for normalized vectors)
 * @param {number[]} vector1 - First vector
 * @param {number[]} vector2 - Second vector
 * @returns {number} Dot product result
 */
function computeDotProduct(vector1, vector2) {
  let result = 0;
  for (let i = 0; i < vector1.length; i++) {
    result += vector1[i] * vector2[i];
  }
  return result;
}

/**
 * Legacy inner product function that scales result to 0-255 range
 * Used for compatibility with existing visualization code
 * @param {number[]} vector1 - First vector
 * @param {number[]} vector2 - Second vector
 * @returns {number} Scaled inner product (0-255)
 */
function computeInnerProduct(vector1, vector2) {
  let result = 0;
  for (let i = 0; i < vector1.length; i++) {
    result += vector1[i] * vector2[i];
  }
  result = Math.floor((result + 1) * (255.0 / 2));
  return result;
}

/**
 * Computes dot product of one vector against many vectors (batch operation)
 * Automatically uses WASM optimization when available and beneficial
 * @param {number[]} queryVector - Single query vector
 * @param {number[][]} vectorMatrix - Matrix of vectors to compare against
 * @param {Function} progressCallback - Optional progress callback for large operations
 * @returns {number[]} Array of dot products
 */
function computeOneToManyDotProducts(queryVector, vectorMatrix, progressCallback = null) {
  // Use WASM optimization for large matrices
  if (wasmModule && wasmModule.available && vectorMatrix.length > 100) {
    return computeOneToManyWasm(queryVector, vectorMatrix, progressCallback);
  }
  
  // JavaScript implementation with progress for large operations
  const dotProducts = [];
  const showProgress = progressCallback && vectorMatrix.length > 5000;
  
  for (let i = 0; i < vectorMatrix.length; i++) {
    dotProducts.push(computeDotProduct(queryVector, vectorMatrix[i]));
    
    // Report progress for large JavaScript operations
    if (showProgress && i % 1000 === 0) {
      const progress = (i / vectorMatrix.length) * 100;
      progressCallback(progress);
    }
  }
  
  // Final progress update
  if (showProgress) {
    progressCallback(100);
  }
  
  return dotProducts;
}

/**
 * Sorts array indices by corresponding values (descending by default)
 * @param {number[]} values - Array of values to sort by
 * @param {boolean} ascending - Whether to sort in ascending order
 * @returns {number[]} Array of sorted indices
 */
function sortIndicesByValues(values, ascending = false) {
  // Create array of indices [0, 1, 2, ..., n]
  const indices = values.map((value, index) => index);

  // Sort indices based on corresponding values
  if (ascending) {
    indices.sort((a, b) => values[a] - values[b]);
  } else {
    indices.sort((a, b) => values[b] - values[a]); // Descending order (default)
  }

  return indices;
}

// ============================================================================
// DATA LOADING AND INITIALIZATION
// ============================================================================

/**
 * Loads CSV/TSV data from a URL
 * @param {string} url - URL to fetch data from
 * @param {string} separator - Column separator ("|" for BSB data)
 * @param {boolean} parseNumbers - Whether to parse values as floats
 * @returns {Promise<Array[]>} Parsed table data
 */
async function loadTableData(url, separator, parseNumbers) {
  try {
    const response = await fetch(url);
    const csvData = await response.text();

    // Parse CSV data into rows and columns
    const rows = csvData.split(/\r?\n/);
    const table = rows.map((row) =>
      row.split(separator).map(parseNumbers ? parseFloat : (val) => val),
    );

    return table;
  } catch (error) {
    throw new Error("Failed to load table data: " + error.message);
  }
}

/**
 * Loads binary embedding data with progress tracking
 * Supports both native Float16Array and manual Float16 conversion
 * @param {string} path - Path to binary embeddings file
 * @param {number} dimensions - Vector dimensions (384 for current model)
 * @param {Function} progressCallback - Progress update callback
 * @returns {Promise<number[][]>} Matrix of embedding vectors
 */
function loadBinaryEmbeddings(path = "./bsbembedfast16.binary", dimensions = 384, progressCallback = null) {
  return new Promise((resolve) => {
    let xhr = new XMLHttpRequest();
    xhr.open("get", path, true);
    xhr.responseType = "arraybuffer";
    
    // Track download progress
    if (progressCallback) {
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const loadedMB = (event.loaded / 1024 / 1024).toFixed(1);
          const totalMB = (event.total / 1024 / 1024).toFixed(1);
          progressCallback({
            status: 'downloading',
            loaded: event.loaded,
            total: event.total,
            percent: percent,
            loadedMB: loadedMB,
            totalMB: totalMB
          });
        } else {
          progressCallback({
            status: 'downloading',
            loaded: event.loaded,
            total: null,
            percent: null,
            loadedMB: (event.loaded / 1024 / 1024).toFixed(1),
            totalMB: null
          });
        }
      };
    }
    
    xhr.onload = () => {
      const arrayBuffer = xhr.response;
      if (arrayBuffer) {
        if (progressCallback) {
          progressCallback({
            status: 'processing',
            percent: 100
          });
        }
        
        let rawArray;
        let outputMatrix = [];

        // Use native Float16Array if available (modern browsers)
        if (typeof Float16Array !== "undefined") {
          rawArray = new Float16Array(arrayBuffer);
          for (let i = 0; i < rawArray.length; i += dimensions) {
            outputMatrix.push(Array.from(rawArray.slice(i, i + dimensions)));
          }
        } else {
          // Manual Float16 to Float32 conversion for older browsers
          const dataView = new DataView(arrayBuffer);
          const length = arrayBuffer.byteLength / 2; // 2 bytes per Float16
          rawArray = new Float32Array(length);

          // Convert each Float16 value to Float32
          for (let i = 0; i < length; i++) {
            // Read Float16 value (little-endian)
            const uint16 = dataView.getUint16(i * 2, true);

            // Extract Float16 components
            const sign = (uint16 >> 15) & 0x1;
            let exponent = (uint16 >> 10) & 0x1f;
            let fraction = uint16 & 0x3ff;

            let float32;
            if (exponent === 0) {
              if (fraction === 0) {
                float32 = sign ? -0 : 0;
              } else {
                // Denormalized number
                exponent = 1;
                while ((fraction & 0x400) === 0) {
                  fraction <<= 1;
                  exponent--;
                }
                fraction &= 0x3ff;
                float32 = (sign ? -1 : 1) * Math.pow(2, exponent - 25) * (1 + fraction / 0x400);
              }
            } else if (exponent === 0x1f) {
              float32 = fraction ? NaN : sign ? -Infinity : Infinity;
            } else {
              // Normalized number
              float32 = (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 0x400);
            }
            rawArray[i] = float32;
          }

          // Split into matrix of vectors
          for (let i = 0; i < rawArray.length; i += dimensions) {
            outputMatrix.push(rawArray.slice(i, i + dimensions));
          }
        }

        if (progressCallback) {
          progressCallback({
            status: 'complete',
            percent: 100
          });
        }
        
        resolve(outputMatrix);
      }
    };
    
    xhr.onerror = () => {
      if (progressCallback) {
        progressCallback({
          status: 'error',
          percent: 0
        });
      }
    };
    
    xhr.send();
  });
}

/**
 * Initializes all core data (Bible text, embeddings, WASM module)
 * @param {boolean} spoofMatrix - Whether to use dummy data for testing
 * @param {Function} progressCallback - Progress update callback
 */
async function initializeAllData(spoofMatrix = false, progressCallback = null) {
  // Load WASM module for performance optimization
  wasmModule = await loadWasmModule();
  
  // Load Biblical text data (BSB format)
  loadTableData("bsb.csv", "|", false).then((table) => {
    bible = table.slice(1); // Remove header row
  });

  // Load embedding vectors or use dummy data
  if (spoofMatrix) {
    biblematrix = [[1, 2, 3]]; // Minimal dummy data for testing
  } else {
    loadBinaryEmbeddings("./bsbembedfast16.binary", 384, progressCallback).then((matrix) => {
      biblematrix = matrix;
    });
  }
}

// Legacy alias for backward compatibility
var dot = computeDotProduct;

// ============================================================================
// WEBASSEMBLY OPTIMIZATION MODULE
// ============================================================================

/**
 * Loads and initializes WebAssembly module for optimized computations
 * @returns {Promise<Object>} WASM module object with instance and memory
 */
async function loadWasmModule() {
  try {
    const wasmResponse = await fetch('./dot_products.wasm');
    const wasmBytes = await wasmResponse.arrayBuffer();
    
    // Create shared memory for WASM operations
    const memory = new WebAssembly.Memory({ initial: 1000 });
    
    // Progress callback storage for WASM to call
    let currentProgressCallback = null;
    
    const wasmModule = await WebAssembly.instantiate(wasmBytes, {
      env: {
        memory: memory,
        // Progress callback that WASM can call
        progress_callback: (completed) => {
          if (currentProgressCallback) {
            currentProgressCallback(completed);
          }
        }
      }
    });
    
    return {
      instance: wasmModule.instance,
      memory: memory,
      available: true,
      setProgressCallback: (callback) => {
        currentProgressCallback = callback;
      },
      clearProgressCallback: () => {
        currentProgressCallback = null;
      }
    };
  } catch (error) {
    console.warn("WASM module failed to load, falling back to JavaScript:", error);
    return { available: false };
  }
}

/**
 * Optimized dot product using WASM (single vector pair)
 * @param {number[]} vectorA - First vector
 * @param {number[]} vectorB - Second vector
 * @returns {number} Dot product result
 */
function computeDotProductWasm(vectorA, vectorB) {
  if (!wasmModule || !wasmModule.available) {
    return computeDotProduct(vectorA, vectorB); // Fallback to JavaScript
  }
  
  const dimension = vectorA.length;
  const bytesPerFloat = 4;
  const vec1Size = dimension * bytesPerFloat;
  const vec2Size = dimension * bytesPerFloat;
  
  // Memory allocation pointers
  const vec1Ptr = 0;
  const vec2Ptr = vec1Size;
  
  // Ensure sufficient memory
  const totalNeeded = vec1Size + vec2Size;
  const currentPages = wasmModule.memory.buffer.byteLength / (64 * 1024);
  const neededPages = Math.ceil(totalNeeded / (64 * 1024));
  if (neededPages > currentPages) {
    wasmModule.memory.grow(neededPages - currentPages);
  }
  
  // Copy vectors to WASM memory
  const memoryView = new Float32Array(wasmModule.memory.buffer);
  memoryView.set(vectorA, vec1Ptr / bytesPerFloat);
  memoryView.set(vectorB, vec2Ptr / bytesPerFloat);
  
  // Execute WASM dot product function
  return wasmModule.instance.exports.dot_product(vec1Ptr, vec2Ptr, dimension);
}

/**
 * Optimized batch dot product using WASM (one-to-many)
 * @param {number[]} queryVector - Single query vector
 * @param {number[][]} vectorMatrix - Matrix of vectors to compare against
 * @param {Function} progressCallback - Optional progress callback
 * @returns {number[]} Array of dot products
 */
function computeOneToManyWasm(queryVector, vectorMatrix, progressCallback = null) {
  if (!wasmModule || !wasmModule.available) {
    return computeOneToManyDotProducts(queryVector, vectorMatrix); // Fallback
  }
  
  const dimension = queryVector.length;
  const numVectors = vectorMatrix.length;
  const bytesPerFloat = 4;
  
  const querySize = dimension * bytesPerFloat;
  const matrixSize = numVectors * dimension * bytesPerFloat;
  const resultsSize = numVectors * bytesPerFloat;
  
  // Memory allocation
  const queryPtr = 0;
  const matrixPtr = querySize;
  const resultsPtr = querySize + matrixSize;
  
  // Ensure sufficient memory
  const totalNeeded = querySize + matrixSize + resultsSize;
  const currentPages = wasmModule.memory.buffer.byteLength / (64 * 1024);
  const neededPages = Math.ceil(totalNeeded / (64 * 1024));
  if (neededPages > currentPages) {
    wasmModule.memory.grow(neededPages - currentPages);
  }
  
  // Copy data to WASM memory
  const memoryView = new Float32Array(wasmModule.memory.buffer);
  memoryView.set(queryVector, queryPtr / bytesPerFloat);
  
  // Copy matrix data
  let offset = matrixPtr / bytesPerFloat;
  for (let i = 0; i < vectorMatrix.length; i++) {
    memoryView.set(vectorMatrix[i], offset);
    offset += dimension;
  }
  
  // Set up progress callback if provided
  if (progressCallback && numVectors > 1000) { // Only use progress for large operations
    const progressInterval = Math.max(100, Math.floor(numVectors / 50)); // Update every ~2%
    
    wasmModule.setProgressCallback((completed) => {
      const progress = (completed / numVectors) * 100;
      progressCallback(progress);
    });
    
    // Execute WASM batch operation with progress
    wasmModule.instance.exports.dot_product_batch_with_progress(
      queryPtr, matrixPtr, numVectors, dimension, resultsPtr, progressInterval
    );
    
    wasmModule.clearProgressCallback();
  } else {
    // Execute standard WASM batch operation
    wasmModule.instance.exports.dot_product_batch(queryPtr, matrixPtr, numVectors, dimension, resultsPtr);
  }
  
  // Read results back
  const results = new Array(numVectors);
  for (let i = 0; i < numVectors; i++) {
    results[i] = memoryView[resultsPtr / bytesPerFloat + i];
  }
  
  return results;
}

// ============================================================================
// SEARCH AND SIMILARITY FUNCTIONS
// ============================================================================

/**
 * Trie data structure for fast prefix matching of Bible verses
 */
class BiblicalTrie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Insert a verse reference into the trie
   * @param {string} verseReference - Bible verse reference (e.g., "John 3:16")
   * @param {number} index - Index in the Bible array
   */
  insert(verseReference, index) {
    let node = this.root;
    for (let i = 0; i < verseReference.length; i++) {
      const char = verseReference[i];
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.itemIndex = index;
  }

  /**
   * Search for verses matching a prefix
   * @param {string} prefix - Search prefix
   * @param {boolean} includeIndex - Whether to include array indices in results
   * @returns {Array} Matching verse references
   */
  search(prefix, includeIndex = false) {
    let node = this.root;
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i];
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    
    let results = this._collectWords(node, prefix).sort((a, b) => a.index - b.index);
    
    if (!includeIndex) {
      return results.map((item) => item.word);
    } else {
      return results;
    }
  }

  /**
   * Recursively collect all words from a trie node
   * @private
   */
  _collectWords(node, prefix) {
    const words = [];
    if (node.isEndOfWord) {
      words.push({
        word: prefix,
        index: node.itemIndex,
      });
    }
    for (const char in node.children) {
      const childNode = node.children[char];
      words.push(...this._collectWords(childNode, prefix + char));
    }
    return words;
  }
}

/**
 * Individual trie node
 */
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.itemIndex = null;
  }
}

/**
 * Checks if text appears to be a Bible verse reference
 * @param {string} text - Input text to analyze
 * @returns {boolean} True if it looks like a verse reference
 */
function isVerseReference(text) {
  const versePatterns = [
    /^\d?\s*[A-Za-z]+\s+\d+:\d+/, // "John 3:16", "1 John 3:16"
    /^[A-Za-z]+\s+\d+$/,          // "Genesis 1"
    /^\d?\s*[A-Za-z]+$/,          // "John", "1 John"
  ];

  return versePatterns.some((pattern) => pattern.test(text.trim()));
}

/**
 * Finds most/least similar verses to a given verse
 * @param {number} verseIndex - Index of the reference verse
 * @param {boolean} ascending - Whether to sort by least similar first
 * @returns {Array} Array of objects with {index, similarity}
 */
function findSimilarVerses(verseIndex, ascending = false) {
  const similarities = computeOneToManyDotProducts(biblematrix[verseIndex], biblematrix);
  const sortedIndices = sortIndicesByValues(similarities, ascending);
  
  let resultsWithSimilarity = [];
  sortedIndices.forEach((index) =>
    resultsWithSimilarity.push({
      index: index,
      sim: similarities[index],
    }),
  );
  return resultsWithSimilarity;
}

// ============================================================================
// PERFORMANCE AND ADAPTIVE SYSTEMS
// ============================================================================

/**
 * Creates a performance measurement closure
 * @returns {Function} Function that returns elapsed time when called
 */
function createPerformanceMeasurement() {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    return duration;
  };
}

/**
 * Creates an adaptive debouncing system that adjusts delays based on device performance
 * @returns {Object} Object with updateDebounce and getDebounceDelay methods
 */
function createAdaptiveDebouncer() {
  let performanceHistory = [];
  let adaptiveDebounce = window.innerWidth <= 768 ? 300 : 10; // Start with mobile/desktop defaults
  const isMobile = window.innerWidth <= 768;
  const minDebounce = isMobile ? 100 : 5;
  const maxDebounce = isMobile ? 1000 : 500;
  
  function updateDebounce(duration) {
    performanceHistory.push(duration);

    // Keep only last 5 measurements for rolling average
    if (performanceHistory.length > 5) {
      performanceHistory.shift();
    }

    // Calculate average performance
    const avgDuration = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;

    // Adapt debounce based on performance
    if (avgDuration < 100) {
      // Fast device - shorter debounce
      adaptiveDebounce = Math.max(minDebounce, adaptiveDebounce * 0.9);
    } else if (avgDuration > 500) {
      // Slow device - longer debounce
      adaptiveDebounce = Math.min(maxDebounce, adaptiveDebounce * 1.2);
    } else {
      // Medium performance - adjust gradually
      const targetDebounce = Math.max(minDebounce, Math.min(maxDebounce, avgDuration * 0.8));
      adaptiveDebounce = (adaptiveDebounce + targetDebounce) / 2;
    }

    // Round to nearest 5ms for smoother experience
    adaptiveDebounce = Math.round(adaptiveDebounce / 5) * 5;
  }
  
  function getDebounceDelay() {
    return adaptiveDebounce;
  }
  
  return { updateDebounce, getDebounceDelay };
}

// ============================================================================
// VISUALIZATION FUNCTIONS
// ============================================================================

/**
 * Checks if query is requesting a visualization (ends with *)
 * @param {string} text - Query text
 * @returns {boolean} True if it's a visualization query
 */
function isVisualizationQuery(text) {
  const trimmed = text.trim();
  return trimmed.endsWith('*') && (
    /^(\d+\s+)?[A-Za-z]+(\s+\d+)?\s*\*$/.test(trimmed) ||
    /^(\d+\s+)?[A-Za-z]+(\s+\d+)?\s*\*\s*(\d+\s+)?[A-Za-z]+(\s+\d+)?\s*\*$/.test(trimmed)
  );
}

/**
 * Parses visualization query into structured format
 * @param {string} text - Query text with * markers
 * @returns {Object|null} Parsed query object or null if invalid
 */
function parseVisualizationQuery(text) {
  const trimmed = text.trim();
  
  // Check for comparison query (two * separated sections)
  const comparisonMatch = trimmed.match(/^(.+?)\s*\*\s*(.+?)\s*\*\s*$/);
  if (comparisonMatch) {
    const [, source, target] = comparisonMatch;
    return {
      type: 'comparison',
      source: parseVisualizationQuery(source + ' *'),
      target: parseVisualizationQuery(target + ' *')
    };
  }
  
  // Regular single visualization query
  const cleanText = trimmed.replace(/\s*\*\s*$/, '');
  const parts = cleanText.split(/\s+/);
  
  if (parts.length === 1) {
    // Book only (e.g., "Matthew")
    return { book: parts[0], chapter: null, type: 'book' };
  } else if (parts.length === 2 && /^\d+$/.test(parts[0])) {
    // Numbered book without chapter (e.g., "1 Peter")
    return { book: parts[0] + ' ' + parts[1], chapter: null, type: 'book' };
  } else if (parts.length === 2) {
    // Book and chapter (e.g., "Psalm 5")
    return { book: parts[0], chapter: parseInt(parts[1]), type: 'chapter' };
  } else if (parts.length === 3 && /^\d+$/.test(parts[0])) {
    // Numbered book with chapter (e.g., "1 John 3")
    return { book: parts[0] + ' ' + parts[1], chapter: parseInt(parts[2]), type: 'chapter' };
  }
  
  return null;
}

/**
 * Extracts verses within a book/chapter range for visualization
 * @param {string} book - Book name
 * @param {number|null} chapter - Chapter number (null for entire book)
 * @returns {Object} Object with verses and chapters arrays
 */
function extractVersesByRange(book, chapter = null) {
  if (!bible) return { verses: [], chapters: [] };
  
  const verses = [];
  const chapters = [];
  
  for (let i = 0; i < bible.length; i++) {
    const verse = bible[i];
    const verseRef = verse[0];
    
    // Parse verse reference (e.g., "Matthew 1:1", "1 Peter 1:1")
    const match = verseRef.match(/^((?:\d+\s+)?[A-Za-z]+)\s+(\d+):(\d+)$/);
    if (!match) continue;
    
    const verseBook = match[1].trim();
    const verseChapter = parseInt(match[2]);
    const verseNumber = parseInt(match[3]);
    
    // Handle "Psalms" vs "Psalm" normalization
    const normalizedVerseBook = verseBook.toLowerCase();
    const normalizedSearchBook = book.toLowerCase() === 'psalms' ? 'psalm' : book.toLowerCase();
    
    if (normalizedVerseBook === normalizedSearchBook) {
      if (chapter === null) {
        // Entire book
        verses.push({
          index: i,
          book: verseBook,
          chapter: verseChapter,
          verse: verseNumber,
          text: verse[1],
          ref: verseRef
        });
        
        if (!chapters.find(c => c.chapter === verseChapter)) {
          chapters.push({ chapter: verseChapter, startIndex: verses.length - 1 });
        }
      } else if (verseChapter === chapter) {
        // Specific chapter
        verses.push({
          index: i,
          book: verseBook,
          chapter: verseChapter,
          verse: verseNumber,
          text: verse[1],
          ref: verseRef
        });
      }
    }
  }
  
  return { verses, chapters };
}

/**
 * Maps similarity value to fire color scheme
 * @param {number} value - Similarity value (-1 to 1)
 * @returns {string} Hex color code
 */
function getFireColor(value) {
  // Map value from [-1, 1] to [0, 1] then to colormap index
  const normalized = Math.max(0, Math.min(1, (value + 1) / 2));
  const index = Math.round(normalized * (fireColorScheme.length - 1));
  return fireColorScheme[index];
}

/**
 * Maps similarity value to KBC color scheme
 * @param {number} value - Similarity value (-1 to 1)
 * @returns {string} Hex color code
 */
function getKbcColor(value) {
  // Map value from [-1, 1] to [0, 1] then to colormap index
  const normalized = Math.max(0, Math.min(1, (value + 1) / 2));
  const index = Math.round(normalized * (kbcColorScheme.length - 1));
  return kbcColorScheme[index];
}

/**
 * Computes similarity matrix with progress tracking and WASM optimization
 * @param {Array} verses - Array of verse objects
 * @param {Function} progressCallback - Progress update callback
 * @param {string} taskId - Unique task identifier
 * @param {string} currentVisualizationId - Current visualization ID for cancellation
 * @returns {Promise<Object|null>} Object with similarities matrix and dot product count
 */
async function computeSimilarityMatrix(verses, progressCallback, taskId, currentVisualizationId) {
  const size = verses.length;
  const similarities = [];
  const totalCalculations = (size * (size + 1)) / 2;
  let completed = 0;
  let dotProductCount = 0;

  const useWasm = wasmModule && wasmModule.available;

  // Initialize matrix
  for (let i = 0; i < size; i++) {
    similarities[i] = [];
  }

  // Try WASM optimization for large matrices
  if (useWasm && size > 10) {
    try {
      const nonDividerVerses = verses.filter(v => !v.isDivider);
      if (nonDividerVerses.length > 5) {
        // Create mapping from verse indices to matrix positions
        const verseIndexMap = new Map();
        nonDividerVerses.forEach((verse, idx) => {
          verseIndexMap.set(verse.index, idx);
        });
        
        // Extract embeddings for computation
        const embeddings = nonDividerVerses.map(verse => biblematrix[verse.index]);
        
        // Use WASM for computation
        const result = await computeSimilarityMatrixWasm(
          embeddings, 
          progressCallback, 
          taskId, 
          currentVisualizationId
        );
        
        if (result) {
          // Map WASM results back to full similarity matrix
          for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              const verse1 = verses[i];
              const verse2 = verses[j];
              
              if (verse1.isDivider || verse2.isDivider) {
                similarities[i][j] = -1; // Black for dividers
              } else {
                const wasmI = verseIndexMap.get(verse1.index);
                const wasmJ = verseIndexMap.get(verse2.index);
                similarities[i][j] = result.similarities[wasmI][wasmJ];
              }
            }
          }
          
          return { similarities, dotProductCount: result.dotProductCount };
        }
      }
    } catch (error) {
      console.warn("WASM similarity computation failed, falling back to JavaScript:", error);
      // Fall through to JavaScript implementation
    }
  }

  // JavaScript fallback implementation
  for (let i = 0; i < size; i++) {
    for (let j = i; j < size; j++) {
      const verse1 = verses[i];
      const verse2 = verses[j];

      let sim;
      if (verse1.isDivider || verse2.isDivider) {
        sim = -1; // Black for dividers
      } else {
        // Use WASM for individual dot products if available
        sim = useWasm ? 
          computeDotProductWasm(biblematrix[verse1.index], biblematrix[verse2.index]) : 
          computeDotProduct(biblematrix[verse1.index], biblematrix[verse2.index]);
        dotProductCount++;
      }
      
      similarities[i][j] = sim;
      similarities[j][i] = sim; // Use symmetry

      completed++;

      // Progress updates
      if (completed % 100 === 0 || completed === totalCalculations) {
        if (taskId !== currentVisualizationId) {
          return null; // Task cancelled
        }
        
        if (progressCallback) {
          const progress = (completed / totalCalculations) * 100;
          progressCallback(progress);
        }

        // Allow UI updates
        if (completed % 500 === 0 || completed === totalCalculations) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
  }

  return { similarities, dotProductCount };
}

/**
 * WASM-optimized similarity matrix calculation with progress reporting
 * @param {number[][]} embeddings - Matrix of embeddings
 * @param {Function} progressCallback - Progress callback
 * @param {string} taskId - Task identifier
 * @param {string} currentVisualizationId - Current visualization ID
 * @returns {Promise<Object|null>} Similarity results or null if failed
 */
async function computeSimilarityMatrixWasm(embeddings, progressCallback, taskId, currentVisualizationId) {
  if (!wasmModule || !wasmModule.available) {
    return null;
  }
  
  const size = embeddings.length;
  const dimension = embeddings[0].length;
  const totalCalculations = (size * (size + 1)) / 2;
  
  const bytesPerFloat = 4;
  const matrixSize = size * dimension * bytesPerFloat;
  const resultsSize = size * size * bytesPerFloat;
  
  // Memory allocation
  const matrixPtr = 0;
  const resultsPtr = matrixSize;
  
  // Ensure sufficient memory
  const totalNeeded = matrixSize + resultsSize;
  const currentPages = wasmModule.memory.buffer.byteLength / (64 * 1024);
  const neededPages = Math.ceil(totalNeeded / (64 * 1024));
  if (neededPages > currentPages) {
    wasmModule.memory.grow(neededPages - currentPages);
  }
  
  // Copy matrix data to WASM memory
  const memoryView = new Float32Array(wasmModule.memory.buffer);
  let offset = matrixPtr / bytesPerFloat;
  for (let i = 0; i < size; i++) {
    memoryView.set(embeddings[i], offset);
    offset += dimension;
  }
  
  // Use progress-enabled WASM function for larger matrices
  if (size > 20 && progressCallback) {
    // Set up progress callback
    let lastReportedProgress = 0;
    wasmModule.setProgressCallback((completed) => {
      // Check if task was cancelled
      if (taskId !== currentVisualizationId) {
        return;
      }
      
      const progress = (completed / totalCalculations) * 100;
      // Only update if progress has changed significantly (reduce callback frequency)
      if (progress - lastReportedProgress >= 1) {
        progressCallback(progress);
        lastReportedProgress = progress;
      }
    });
    
    // Calculate progress interval (report every ~1% of progress)
    const progressInterval = Math.max(50, Math.floor(totalCalculations / 100));
    
    // Execute WASM similarity matrix with progress
    wasmModule.instance.exports.similarity_matrix_with_progress(
      matrixPtr, size, dimension, resultsPtr, progressInterval
    );
    
    wasmModule.clearProgressCallback();
    
    // Final check for cancellation
    if (taskId !== currentVisualizationId) {
      return null;
    }
  } else {
    // Small matrices - compute directly without progress updates
    wasmModule.instance.exports.similarity_matrix(matrixPtr, size, dimension, resultsPtr);
  }
  
  // Read results back into JavaScript matrix
  const similarities = [];
  for (let i = 0; i < size; i++) {
    similarities[i] = [];
    for (let j = 0; j < size; j++) {
      const index = i * size + j;
      similarities[i][j] = memoryView[resultsPtr / bytesPerFloat + index];
    }
  }
  
  return { 
    similarities, 
    dotProductCount: totalCalculations 
  };
}

/**
 * Draws heatmap visualization on canvas
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {number[][]} similarities - Similarity matrix
 * @param {Array} verses - Verse objects
 * @param {number} cellSize - Size of each cell in pixels
 * @param {string} type - Visualization type ('default', 'comparison')
 * @param {number|null} sourceSize - Size of source section for comparisons
 */
function drawSimilarityHeatmap(canvas, similarities, verses, cellSize, type = 'default', sourceSize = null) {
  const ctx = canvas.getContext('2d');
  
  // Disable image smoothing for crisp pixel rendering
  ctx.imageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  
  const size = verses.length;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const similarity = similarities[i][j];
      
      if (type === 'comparison' && sourceSize !== null) {
        // Different color schemes for comparison quadrants
        const isSourceI = i < sourceSize;
        const isSourceJ = j < sourceSize;

        if ((isSourceI && isSourceJ) || (!isSourceI && !isSourceJ)) {
          ctx.fillStyle = getFireColor(similarity);
        } else {
          ctx.fillStyle = getKbcColor(similarity);
        }
      } else {
        if (similarity === -1) {
          ctx.fillStyle = "black";
        } else {
          ctx.fillStyle = getFireColor(similarity);
        }
      }

      ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
    }
  }
}

/**
 * Creates a progress manager object for visualization progress
 * @param {HTMLElement} progressContainer - Progress container element
 * @param {HTMLElement} progressFill - Progress fill element
 * @param {HTMLElement} progressPercent - Progress percentage text element
 * @param {string} taskId - Task identifier
 * @returns {Object} Progress manager with show/hide/update methods
 */
function createVisualizationProgressManager(progressContainer, progressFill, progressPercent, taskId) {
  return {
    show: () => {
      if (progressContainer) progressContainer.style.display = "flex";
    },
    hide: () => {
      if (progressContainer) progressContainer.style.display = "none";
    },
    update: (progress) => {
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
    }
  };
}

// ============================================================================
// LEGACY FUNCTION ALIASES (for backward compatibility)
// ============================================================================

// Keep existing function names for compatibility with index.html
var loadAll = initializeAllData;
var loadBinary = loadBinaryEmbeddings;
var loadTable = loadTableData;
var loadWasm = loadWasmModule;
var dotWasm = computeDotProductWasm;
var dotOneToManyWasm = computeOneToManyWasm;
var dotOneToMany = computeOneToManyDotProducts;
var argsort = sortIndicesByValues;
var Trie = BiblicalTrie;
var findSim = findSimilarVerses;
var measurePerformance = createPerformanceMeasurement;
var drawHeatmap = drawSimilarityHeatmap;
var createProgressManager = createVisualizationProgressManager;
var innerProduct = computeInnerProduct;
var computeInnerProductGrid = function(vectors) {
  // Legacy function - computes pairwise inner products
  let grid = [];
  for (let i = 0; i < vectors.length; i++) {
    grid[i] = new Uint8Array(vectors.length);
    for (let j = 0; j < vectors.length; j++) {
      if (j < i) {
        grid[i][j] = grid[j][i]; // Use symmetry
      } else {
        grid[i][j] = computeInnerProduct(vectors[i], vectors[j]);
      }
    }
  }
  return grid;
};

// Color scheme aliases
var fire = fireColorScheme;
var kbc = kbcColorScheme;