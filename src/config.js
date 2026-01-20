// src/config.js
const config = {
  API_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://your-railway-backend-url.up.railway.app",
};

export default config;
