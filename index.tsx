import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// REPAIR: Disable Service Worker to fix "Origin Mismatch" error in preview
// In this custom environment, we ensure registration is completely bypassed.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister();
  }).catch(() => {
    // Silent catch as we are forcing unregistration
  });
}