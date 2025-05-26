var bible = false,
  biblematrix = false,
  biblematrixpca = false;

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
    // This is old and slow
    // loadTable("webembed.csv", ",", true)
    //   .then(matrix => {webmatrix = matrix.slice(1);});

    // This is smart and fast
    // let xhr = new XMLHttpRequest();
    // xhr.open('get', './webembed.binary', true);
    // xhr.responseType = 'arraybuffer';
    // xhr.onload = (event) => {
    // 	const arrayBuffer = xhr.response;
    // 	if (arrayBuffer) {
    // 		const rawArray = new Float32Array(arrayBuffer)
    // 		webmatrix = []
    // 		const dimensions = 768;
    // 		for (let i = 0; i < rawArray.length; i+= dimensions) {
    // 			webmatrix.push(rawArray.slice(i, i + dimensions))
    // 		}
    // 	}
    // }
    // xhr.send();
    loadBinary("./bsbembedfast16.binary", 384, progressCallback).then((matrix) => {
      biblematrix = matrix;
    });
    // loadBinary("./webembedpca50.binary", 50).then(matrix => {webmatrixpca = matrix})
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
