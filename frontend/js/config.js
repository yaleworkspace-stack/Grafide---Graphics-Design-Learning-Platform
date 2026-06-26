/* ============================================
   GRAFIDE — Frontend Config
   Place this at: frontend/js/config.js
   Load it FIRST in every HTML page,
   before main.js and all other scripts.

   For local dev:   leave as localhost
   For production:  change API_BASE_URL to
                    your Render backend URL

   Every other JS file uses window.GRAFIDE_API
   instead of hardcoding the URL.
   ============================================ */

window.GRAFIDE_CONFIG = {

  /* ---- Change this to your Render URL when deploying ---- */
  API_BASE_URL: 'https://grafide-backend.onrender.com/api',

  /* ---- Local dev override ---- */
  // API_BASE_URL: 'http://localhost:8080/api',

  APP_NAME:    'Grafide',
  APP_VERSION: '1.0.0',
};

/* Shorthand used across all JS files */
window.API = window.GRAFIDE_CONFIG.API_BASE_URL;
