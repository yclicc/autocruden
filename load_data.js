var web = false, webmatrix = false;

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

function loadAll(spoofMatrix = false) {

	loadTable("web.csv", "|", false)
	  .then(table => {web = table.slice(1);});
	  
	if (spoofMatrix) {
		webmatrix = [[1,2,3]];
	} else {
		loadTable("webembed.csv", ",", true)
		  .then(matrix => {webmatrix = matrix.slice(1);});
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
