"use client";

import { useEffect } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  return <>{children}</>;
}

async function registerServiceWorker() {
  try {
    // In development, unregister all service workers and clear caches
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Unregistering all service workers and clearing caches');

      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered service worker:', registration.scope);
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('Cleared cache:', cacheName);
        }
      }

      console.log('Service Worker cleanup complete - app will load fresh content');
      return;
    }

    // In production, register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    console.log('Service Worker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log('New service worker available');

            // You could show a notification to the user here
            if (confirm('A new version of the app is available. Would you like to reload?')) {
              window.location.reload();
            }
          }
        });
      }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed');
      // The page will be reloaded automatically
    });

  } catch (error) {
    console.error('Service Worker operation failed:', error);
  }
}
