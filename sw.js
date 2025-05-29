// AutoCruden Service Worker
// Handles caching for offline functionality

const CACHE_NAME = 'autocruden-v1';
const STATIC_CACHE_NAME = 'autocruden-static-v1';
const DYNAMIC_CACHE_NAME = 'autocruden-dynamic-v1';

// Essential files that are always cached
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logic.js',
  '/manifest.json',
  '/AlexanderCruden.jpg',
  '/bsb.csv',
  '/bsbembedfast16.binary',
  '/favicon.ico'
];

// Optional files to cache on demand
const OPTIONAL_FILES = [
  '/dot_products.wasm'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('Caching static assets including CSV and binary files...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('Service worker installed successfully');
      // Force activation of new service worker
      self.skipWaiting();
    }).catch(error => {
      console.error('Service worker installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service worker activated');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests with caching strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(event.request.url)) {
    event.respondWith(handleStaticAsset(event.request));
  } else if (isOptionalFile(event.request.url)) {
    event.respondWith(handleOptionalFile(event.request));
  } else if (isCDNResource(event.request.url)) {
    event.respondWith(handleCDNResource(event.request));
  } else if (isTransformersModel(event.request.url)) {
    event.respondWith(handleTransformersModel(event.request));
  } else {
    event.respondWith(handleGenericRequest(event.request));
  }
});

// Check if request is for a static asset
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.endsWith(asset)) ||
         url.includes('/icons/');
}

// Check if request is for an optional file
function isOptionalFile(url) {
  return OPTIONAL_FILES.some(file => url.endsWith(file));
}

// Check if request is for a CDN resource
function isCDNResource(url) {
  return url.includes('cdn.jsdelivr.net') || 
         url.includes('unpkg.com') ||
         url.includes('cdnjs.cloudflare.com');
}

// Check if request is for Transformers.js model files
function isTransformersModel(url) {
  return url.includes('huggingface.co') ||
         url.includes('Xenova') ||
         url.includes('transformers') ||
         url.includes('.onnx') ||
         url.includes('tokenizer.json') ||
         url.includes('config.json');
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Serving static asset from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('Fetching static asset from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Error handling static asset:', error);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle optional files with cache-first strategy
async function handleOptionalFile(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Serving optional file from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('Fetching optional file from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('Cached optional file:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Error handling optional file:', error);
    return new Response('Optional file not available offline', { status: 404 });
  }
}

// Handle CDN resources with stale-while-revalidate strategy
async function handleCDNResource(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Return cached version immediately if available
    if (cachedResponse) {
      console.log('Serving CDN resource from cache:', request.url);
      
      // Update cache in background
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
          console.log('Updated CDN resource in cache:', request.url);
        }
      }).catch(error => {
        console.log('Failed to update CDN resource:', error);
      });
      
      return cachedResponse;
    }
    
    // No cached version, fetch from network
    console.log('Fetching CDN resource from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Error handling CDN resource:', error);
    return new Response('CDN resource not available offline', { status: 404 });
  }
}

// Handle Transformers.js model files with special caching
async function handleTransformersModel(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Serving model file from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('Fetching model file from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache model files aggressively as they're large and don't change often
      cache.put(request, networkResponse.clone());
      console.log('Cached model file:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Error handling model file:', error);
    return new Response('Model file not available offline', { status: 504 });
  }
}

// Handle generic requests with network-first strategy
async function handleGenericRequest(request) {
  try {
    console.log('Fetching generic request from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to serve from cache if network fails
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Serving generic request from cache (offline):', request.url);
      return cachedResponse;
    }
    
    console.error('Error handling generic request:', error);
    return new Response('Resource not available offline', { status: 404 });
  }
}

// Message handler for cache management
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data.action === 'clearCache') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  } else if (event.data.action === 'getCacheInfo') {
    getCacheInfo().then(info => {
      event.ports[0].postMessage(info);
    });
  }
});

// Utility function to clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Utility function to get cache information
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    info[cacheName] = {
      count: keys.length,
      urls: keys.map(req => req.url)
    };
  }
  
  return info;
}