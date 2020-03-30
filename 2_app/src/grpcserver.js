const messages = require("./proto_js/helloworld_pb");
const services = require("./proto_js/helloworld_grpc_pb");
const grpc = require("grpc");
const grpcserver = {};

/**
 * This is the implementation of `Greeter.sayHello`,
 * which can be found in the protobuffer
 * @param {messages.HelloRequest} call
 */
function sayHello(call, callback) {
  // Get the name from the request (which is the HelloRequest message)
  const name = call.request.getName();

  // Create a reply (which is the HelloReply message)
  const reply = new messages.HelloReply();
  reply.setGreeting(`hello ${name}!`);

  // Respond
  return callback(null, reply);
}

/**
 * Create a new GRPC server
 */
grpcserver.start = async () => {
  // Create a GRPC Server
  const server = new grpc.Server();

  // Add our implementation
  server.addService(services.GreeterService, { sayHello: sayHello });

  // Listen without TLS on port 50051
  server.bind("0.0.0.0:50051", grpc.ServerCredentials.createInsecure());

  // Start listening
  server.start();

  return server;
};

module.exports = grpcserver;
