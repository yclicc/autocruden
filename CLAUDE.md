# AutoCruden Project

AutoCruden is a modern Biblical concordance tool that combines traditional verse reference search with AI-powered semantic search capabilities. Named after Alexander Cruden's 1737 concordance, it provides a "concordance for the 21st Century."

## Project Structure
- `index.html` - Main search interface with AI-powered semantic search
- `visual.html` - Interactive visualization interface using OpenSeadragon
- `load_data.js` - Core data loading and vector operations
- `bsb.csv` - Biblical text data (BSB - Berean Study Bible)
- `web.csv` - Web-formatted biblical data (legacy)
- `bsbembedfast16.binary` - 16-bit binary embeddings file (384 dimensions)
- `webembed.binary` - Legacy web embeddings file
- `AlexanderCruden.jpg` - Loading screen image of Alexander Cruden
- `media/` - PNG images showing biblical text visualizations

## Key Features
- **Dual Search Modes**: Traditional verse reference search and AI semantic search
- **Real-time AI Search**: Uses Xenova/all-MiniLM-L6-v2 transformer model for semantic similarity
- **Infinite Scrolling**: Loads search results in batches for performance
- **Adaptive Performance**: Dynamic debouncing based on device performance
- **URL Parameters**: Shareable search queries with `?q=` parameter
- **Mobile Optimized**: Responsive design with mobile-specific layouts
- **Visual Bible Map**: Interactive similarity heatmap of all verses
- **Progress Tracking**: Real-time loading progress for AI model and embeddings

## Technical Implementation
- **Vector Embeddings**: 384-dimensional embeddings using all-mpnet model
- **Binary Format**: Float16 embeddings for efficient storage and loading
- **Trie Search**: Fast prefix matching for verse references
- **Cosine Similarity**: Vector dot products for semantic similarity scoring
- **Progressive Loading**: Async loading with visual progress indicators

## Search Capabilities
- Verse references (e.g., "John 3:16", "Genesis 1")
- Semantic text search (e.g., "God so loved the world")
- Most/least similar verse discovery
- Real-time search as you type with performance optimization

## Recent Updates
- Added query parameter support for shareable searches
- Implemented infinite scroll for better performance
- Enhanced progress bars with detailed loading information
- Added Alexander Cruden tribute on loading screen
- Improved mobile responsiveness and touch interactions