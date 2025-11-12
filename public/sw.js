// Service Worker for Leave Tracker App
// Provides offline caching and performance improvements
// DISABLED: This service worker is currently disabled to prevent caching issues in development

// Immediately unregister this service worker if it's active
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('Service Worker disabled and caches cleared');
        return self.registration.unregister();
      })
      .then(() => self.clients.claim())
  );
});

// Disable fetch interception - let all requests go to network
self.addEventListener('fetch', () => {
  // Do nothing - let the browser handle all fetches normally
});

/*
// ORIGINAL CODE - DISABLED
const CACHE_NAME = 'leave-tracker-v1';
const STATIC_CACHE = 'leave-tracker-static-v1';
const API_CACHE = 'leave-tracker-api-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  '/_next/static/css/',
  '/_next/static/js/',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/leave/balance',
  '/api/admin/stats',
  '/api/ping',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(asset => !asset.endsWith('/')));
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with cache-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                // Return cached response immediately
                console.log('Serving API from cache:', url.pathname);
                
                // Update cache in background
                fetch(request)
                  .then((networkResponse) => {
                    if (networkResponse.ok) {
                      cache.put(request, networkResponse.clone());
                    }
                  })
                  .catch(() => {
                    // Network failed, but we have cached response
                  });
                
                return cachedResponse;
              }

              // No cached response, fetch from network
              return fetch(request)
                .then((networkResponse) => {
                  if (networkResponse.ok) {
                    // Cache successful responses
                    cache.put(request, networkResponse.clone());
                  }
                  return networkResponse;
                })
                .catch((error) => {
                  console.error('Network request failed:', error);
                  throw error;
                });
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/static/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.jpeg') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.svg')) {
    
    event.respondWith(
      caches.open(STATIC_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Serving static asset from cache:', url.pathname);
                return cachedResponse;
              }

              return fetch(request)
                .then((networkResponse) => {
                  if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone());
                  }
                  return networkResponse;
                });
            });
        })
    );
    return;
  }

  // Handle page requests with network-first strategy
  if (url.pathname === '/' || 
      url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/leave') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/calendar')) {
    
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            // Cache successful page responses
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, networkResponse.clone());
              });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.log('Network failed, trying cache for page:', url.pathname);
          
          // Fallback to cache if network fails
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match(request)
                .then((cachedResponse) => {
                  if (cachedResponse) {
                    return cachedResponse;
                  }
                  
                  // Return offline page if available
                  return cache.match('/offline')
                    .then((offlineResponse) => {
                      return offlineResponse || new Response('Offline', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                          'Content-Type': 'text/plain',
                        }),
                      });
                    });
                });
            });
        })
    );
    return;
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'leave-request-sync') {
    event.waitUntil(
      // Handle offline leave request submissions
      syncLeaveRequests()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Leave Tracker',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'leave-tracker-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Leave Tracker', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Helper function for syncing leave requests
async function syncLeaveRequests() {
  try {
    // Get pending requests from IndexedDB or localStorage
    const pendingRequests = await getPendingRequests();
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch('/api/leave/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request.data),
        });

        if (response.ok) {
          // Remove from pending requests
          await removePendingRequest(request.id);
          console.log('Successfully synced leave request:', request.id);
        }
      } catch (error) {
        console.error('Failed to sync leave request:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingRequests() {
  // Implementation would depend on how you store offline requests
  return [];
}

async function removePendingRequest(id) {
  // Implementation would depend on how you store offline requests
  console.log('Removing pending request:', id);
}
*/
