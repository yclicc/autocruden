# AutoCruden Project

This project appears to be a Biblical text analysis and visualization tool with embedded vector search capabilities.

## Project Structure
- `index.html` - Main HTML interface
- `visual.html` - Visualization interface
- `load_data.js` - JavaScript for data loading and processing
- `bsb.csv` - Biblical text data (BSB - Berean Study Bible)
- `web.csv` - Web-formatted biblical data
- `bsbembedfast16.binary` - Binary embeddings file (fast 16-bit)
- `webembed.binary` - Web embeddings file
- `media/` - Contains PNG images of biblical visualizations

## Key Features
- Vector embeddings for biblical text search
- Interactive visualization of biblical passages
- Support for BSB (Berean Study Bible) text
- Binary embedding files for efficient search

## Development Notes
- Uses binary embedding files for fast vector similarity search
- Supports 384-length truncation of all-mpnet embedding data
- Recently updated to BSB format with bug fixes