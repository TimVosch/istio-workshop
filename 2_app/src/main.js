const httpserver = require("./httpserver");
const grpcserver = require("./grpcserver");

/**
 * Start the GRPCServer and then the HTTPServer
 */
async function main() {
  await grpcserver.start();
  console.log("GRPC Server started!");
  httpserver.start();
  console.log("HTTP Server started!");
}

main();
