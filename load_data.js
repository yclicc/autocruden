var web = false, webmatrix = false, webmatrixpca = false;

function innerProduct(vector1, vector2) {
    let result = 0;
    for (let i = 0; i < vector1.length; i++) {
        result += vector1[i] * vector2[i];
    }
    result = Math.floor((result + 1) * (255.0 / 2))
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
		const table = rows.map(row => row.split(sep).map(castfloat ? parseFloat : val => val));
		
		return table
	} catch (error) {
		throw new Error("Failed to load the table: " + error.message);
	}
}

const fetchBinaryArray = () => new Promise((resolve) => {
	let xhr = new XMLHttpRequest();
	xhr.open('get', './bsbembedtrunc16.binary', true);
	xhr.responseType = 'arraybuffer';
	xhr.onLoad = () => {
		if (xhr.status === 200) {
			resolve(xhr.response);
		}
	}
	xhr.onError = () => { reject(); }
	xhr.send();
})

function loadBinary(path = './bsbembedtrunc16.binary', dimensions = 384) {
	return new Promise(resolve => {
		let xhr = new XMLHttpRequest();
		xhr.open('get', path, true);
		xhr.responseType = 'arraybuffer';
		xhr.onload = (event) => {
			const arrayBuffer = xhr.response;
			if (arrayBuffer) {
				const rawArray = new Float16Array(arrayBuffer)
				var out = []
				for (let i = 0; i < rawArray.length; i+= dimensions) {
					out.push(rawArray.slice(i, i + dimensions))
				}
				resolve(out)
			}
		}
		xhr.send();
	});
}

function loadAll(spoofMatrix = false) {

	loadTable("bsb.csv", "|", false)
	  .then(table => {web = table.slice(1);});
	  
	if (spoofMatrix) {
		webmatrix = [[1,2,3]];
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
		loadBinary().then(matrix => {webmatrix = matrix})
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

function argsort(array, ascending=false) {
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
