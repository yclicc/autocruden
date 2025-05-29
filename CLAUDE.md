# AutoCruden Project

AutoCruden is a modern Biblical concordance tool that combines traditional verse reference search with AI-powered semantic search capabilities. Named after Alexander Cruden's 1737 concordance, it provides a "concordance for the 21st Century."

## Project Structure
- `index.html` - Main search interface with AI-powered semantic search
- `logic.js` - Core data loading, vector operations, and visualization engine
- `sw.js` - Service worker for PWA offline functionality
- `manifest.json` - PWA manifest with app metadata and icons
- `bsb.csv` - Biblical text data (BSB - Berean Study Bible)
- `bsbembedfast16.binary` - 16-bit binary embeddings file (384 dimensions)
- `dot_products.wasm` - WebAssembly module for optimized vector operations
- `AlexanderCruden.jpg` - Loading screen image of Alexander Cruden
- `icons/` - PWA icon set (16x16 to 1024x1024)
- `media/` - PNG images showing biblical text visualizations

## Key Features
- **Dual Search Modes**: Traditional verse reference search and AI semantic search
- **Real-time AI Search**: Uses Xenova/all-MiniLM-L6-v2 transformer model for semantic similarity
- **Progressive Web App**: Installable with offline functionality and native app experience
- **Infinite Scrolling**: Loads search results in batches for performance
- **Adaptive Performance**: Dynamic debouncing based on device performance
- **URL Parameters**: Shareable search queries with `?q=` parameter
- **Mobile Optimized**: Responsive design with mobile-specific touch interactions
- **Visual Bible Map**: Interactive similarity heatmap with zoom/pan controls
- **Progress Tracking**: Real-time loading progress for AI model and embeddings

## Technical Implementation
- **Vector Embeddings**: 384-dimensional embeddings using all-mpnet model
- **Binary Format**: Float16 embeddings for efficient storage and loading
- **WebAssembly Optimization**: WASM module for high-performance dot product calculations
- **Service Worker**: Offline caching and background sync for PWA functionality
- **Trie Search**: Fast prefix matching for verse references
- **Cosine Similarity**: Vector dot products for semantic similarity scoring
- **Progressive Loading**: Async loading with visual progress indicators

## Search Capabilities
- Verse references (e.g., "John 3:16", "Genesis 1")
- Semantic text search (e.g., "God so loved the world")
- Visualization queries with * (e.g., "Philippians 2 *", "Ezra * Nehemiah *")
- Most/least similar verse discovery
- Real-time search as you type with performance optimization
- Chapter and book similarity heatmaps with interactive zoom/pan

## Recent Updates
- **PWA Implementation**: Full Progressive Web App with offline support and installation
- **Service Worker**: Background caching and update management
- **WebAssembly**: WASM optimization for vector calculations
- **Enhanced Mobile**: Fixed zoom tooltip positioning and improved touch interactions
- **Visualization Engine**: Interactive similarity heatmaps with pan/zoom controls
- **Query Parameters**: Shareable search URLs with `?q=` parameter
- **Infinite Scrolling**: Batch loading for improved performance
- **Alexander Cruden Tribute**: Historical context on loading screen