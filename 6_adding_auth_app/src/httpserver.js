const express = require("express");
const keyProvider = require("./keyprovider");
const PORT = process.env.PORT || 3000;
const httpserver = {};

/**
 * Add the `/health` route to the express server
 * @param {express.Express} server
 */
function addRoutes(server) {
  // Register the `/health` endpoint
  server.get("/health", (req, res) => {
    res.send({
      healthy: true,
    });
  });

  // Register the `/.well-known/jwks.json` endpoint
  server.get("/.well-known/jwks.json", (req, res) => {
    const jwks = keyProvider.getJWKS();
    res.send(jwks);
  });

  return server;
}

/**
 * Starts and sets up a new Express server
 */
httpserver.start = async () => {
  // Create a new express server
  const server = express();

  // Add the health-check route
  addRoutes(server);

  /**
   * Create a promise that returns the created express server
   * only after it has started listening.
   */
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
};

module.exports = httpserver;
