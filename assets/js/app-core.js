const manifestData = {
  name: "Grow Matic Dashboard",
  short_name: "Grow Matic",
  start_url: "https://growmatic.tifpsdku.com/index.html",
  display: "standalone",
  background_color: "#00BFA5", // Sesuaikan dengan tema warna Anda
  theme_color: "#00BFA5",
  icons: [
        {
            "src": "/assets/images/logo.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/assets/images/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
};

// Hanya jalankan di client side
if (typeof window !== 'undefined') {
  const manifestBlob = new Blob([JSON.stringify(manifestData)], {
    type: "application/json",
  });
  const manifestURL = URL.createObjectURL(manifestBlob);
  const manifestElement = document.getElementById("manifest-placeholder") || 
                         document.createElement('link');
  
  manifestElement.setAttribute("href", manifestURL);
  manifestElement.setAttribute("rel", "manifest");
  
  if (!document.getElementById("manifest-placeholder")) {
    document.head.appendChild(manifestElement);
  }
}

/*********************
 * SERVICE WORKER
 *********************/
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
        
        // Periksa update setiap kali halaman dimuat
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found:', newWorker);
        });
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  }
}

// Versi lebih baik dari sw.js
const CACHE_NAME = 'grow-matic-v1';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/dashboard.html',
  '/dashboard2.html',
  '/dashboard3.html',
  '/dashboard4.html',
  '/settings.html',
  '/profile.html',
  '/assets/css/style.css',
  '/assets/css/loader.css',
  '/assets/css/login.css',
  '/assets/css/profile.css',
  '/assets/css/setting.css',
  '/assets/js/login.js',
  '/assets/js/profile.js',
  '/assets/js/script.js',
  '/assets/js/script2.js',
  '/assets/js/script3.js',
  '/assets/js/script4.js',
  '/assets/js/setting.js',
  '/assets/js/sidebar.js',
  '/assets/images/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Inisialisasi saat halaman dimuat
if (typeof window !== 'undefined') {
  window.addEventListener('load', registerServiceWorker);
}