const httpserver = require("./httpserver");
const grpcserver = require("./grpcserver");
const keyProvider = require("./keyprovider");

/**
 * Start the GRPCServer and then the HTTPServer
 */
async function main() {
  await keyProvider.loadKeyFile("./private.pem");
  console.log("Loaded keys!");
  await grpcserver.start();
  console.log("GRPC Server started!");
  httpserver.start();
  console.log("HTTP Server started!");
}

main();
