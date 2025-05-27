var bible = false,
  biblematrix = false;

function innerProduct(vector1, vector2) {
  let result = 0;
  for (let i = 0; i < vector1.length; i++) {
    result += vector1[i] * vector2[i];
  }
  result = Math.floor((result + 1) * (255.0 / 2));
  return result;
}

// Function to compute the pairwise inner products and organize them into a grid
function computeInnerProductGrid(vectors) {
  let grid = [];
  for (let i = 0; i < vectors.length; i++) {
    grid[i] = new Uint8Array(vectors.length);
    for (let j = 0; j < vectors.length; j++) {
      if (j < i) {
        grid[i][j] = grid[j][i]; // Use previously computed product
      } else {
        grid[i][j] = innerProduct(vectors[i], vectors[j]);
      }
    }
  }
  return grid;
}

async function loadTable(url, sep, castfloat) {
  try {
    const response = await fetch(url);
    const csvData = await response.text();

    // Parse the CSV data
    const rows = csvData.split(/\r?\n/);
    const table = rows.map((row) =>
      row.split(sep).map(castfloat ? parseFloat : (val) => val),
    );

    return table;
  } catch (error) {
    throw new Error("Failed to load the table: " + error.message);
  }
}

function loadBinary(path = "./bsbembedfast16.binary", dimensions = 384, progressCallback = null) {
  return new Promise((resolve) => {
    let xhr = new XMLHttpRequest();
    xhr.open("get", path, true);
    xhr.responseType = "arraybuffer";
    
    // Add progress tracking
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
        let out = [];

        // Check if Float16Array is available
        if (typeof Float16Array !== "undefined") {
          // Use native Float16Array if available
          rawArray = new Float16Array(arrayBuffer);
          for (let i = 0; i < rawArray.length; i += dimensions) {
            out.push(Array.from(rawArray.slice(i, i + dimensions)));
          }
        } else {
          // Handle Float16 data manually if Float16Array is not available
          const dataView = new DataView(arrayBuffer);
          const length = arrayBuffer.byteLength / 2; // 2 bytes per Float16
          rawArray = new Float32Array(length);

          // Convert Float16 to Float32
          for (let i = 0; i < length; i++) {
            // Read the Float16 value at position i*2
            const uint16 = dataView.getUint16(i * 2, true); // true for little-endian

            // Convert Float16 to Float32
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
                float32 =
                  (sign ? -1 : 1) *
                  Math.pow(2, exponent - 25) *
                  (1 + fraction / 0x400);
              }
            } else if (exponent === 0x1f) {
              float32 = fraction ? NaN : sign ? -Infinity : Infinity;
            } else {
              // Normalized number
              float32 =
                (sign ? -1 : 1) *
                Math.pow(2, exponent - 15) *
                (1 + fraction / 0x400);
            }
            rawArray[i] = float32;
          }

          for (let i = 0; i < rawArray.length; i += dimensions) {
            out.push(rawArray.slice(i, i + dimensions));
          }
        }

        if (progressCallback) {
          progressCallback({
            status: 'complete',
            percent: 100
          });
        }
        
        resolve(out);
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

function loadAll(spoofMatrix = false, progressCallback = null) {
  loadTable("bsb.csv", "|", false).then((table) => {
    bible = table.slice(1);
  });

  if (spoofMatrix) {
    biblematrix = [[1, 2, 3]];
  } else {
    loadBinary("./bsbembedfast16.binary", 384, progressCallback).then((matrix) => {
      biblematrix = matrix;
    });
  }
}

var dot = (a, b) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);

function dotOneToMany(one, matrix) {
  const dotProducts = [];

  for (let i = 0; i < matrix.length; i++) {
    dotProducts.push(dot(one, matrix[i]));
  }
  return dotProducts;
}

function argsort(array, ascending = false) {
  // Create an array of indices [0, 1, 2, ..., n]
  const indices = array.map((value, index) => index);

  // Sort the indices based on the corresponding values in the array (we want descending order)
  if (ascending) {
    indices.sort((a, b) => array[a] - array[b]);
  } else {
    indices.sort((a, b) => array[b] - array[a]);
  }

  return indices;
}

// Trie data structure for fast prefix matching
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.itemIndex = null; // Store the index of the item
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, index) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.itemIndex = index; // Store the index of the item in the TrieNode
  }

  search(prefix, index = false) {
    let node = this.root;
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i];
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    let out = this._collectWords(node, prefix).sort(
      (a, b) => a.index - b.index,
    );
    if (!index) {
      return out.map((a) => a.word);
    } else {
      return out;
    }
  }

  _collectWords(node, prefix) {
    const words = [];
    if (node.isEndOfWord) {
      words.push({
        word: prefix,
        index: node.itemIndex, // Retrieve the index of the item from the TrieNode
      });
    }
    for (const char in node.children) {
      const childNode = node.children[char];
      words.push(
        ...this._collectWords(childNode, prefix + char),
      );
    }
    return words;
  }
}

// Search and similarity functions
function isVerseReference(text) {
  // Check if the text matches common Bible verse patterns
  const versePatterns = [
    /^\d?\s*[A-Za-z]+\s+\d+:\d+/, // "John 3:16", "1 John 3:16"
    /^[A-Za-z]+\s+\d+$/, // "Genesis 1"
    /^\d?\s*[A-Za-z]+$/, // "John", "1 John"
  ];

  return versePatterns.some((pattern) =>
    pattern.test(text.trim()),
  );
}

function findSim(index, ascending = false) {
  const sims = dotOneToMany(biblematrix[index], biblematrix);
  const allindexes = argsort(sims, ascending);
  let indexWithSim = [];
  allindexes.forEach((index) =>
    indexWithSim.push({
      index: index,
      sim: sims[index],
    }),
  );
  return indexWithSim;
}

// Performance measurement for adaptive debouncing
function measurePerformance() {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    return duration;
  };
}

// Adaptive debouncing system
function createAdaptiveDebouncer() {
  let performanceHistory = [];
  let adaptiveDebounce = window.innerWidth <= 768 ? 300 : 10; // 10ms for desktop, 300ms for mobile
  const isMobile = window.innerWidth <= 768;
  const minDebounce = isMobile ? 100 : 5;
  const maxDebounce = isMobile ? 1000 : 500;
  
  function updateDebounce(duration) {
    performanceHistory.push(duration);

    // Keep only last 5 measurements (same as git version)
    if (performanceHistory.length > 5) {
      performanceHistory.shift();
    }

    // Calculate on every measurement (same as git version)

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
