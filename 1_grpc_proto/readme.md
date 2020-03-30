## Part 1: Creating a GRPC Protobuffer

This part will have you create a simple Protobuffer that includes a GRPC service.

### What is a Protobuffer?

Protobuffers describe data objects, you decide what data is held and whether it is required. Then the proto compiler will scaffold ready to use source-code for your language that will serialize your data into a binary stream. The serialized data is very efficient and compact. This is due to the fact that the serialized data is non-self-descriptive. Unlike JSON and XML, the data does not describe a property or its type.

In google its words:

```
Protocol buffers are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data – think XML, but smaller, faster, and simpler. You define how you want your data to be structured once, then you can use special generated source code to easily write and read your structured data to and from a variety of data streams and using a variety of languages.
```

\- https://developers.google.com/protocol-buffers

### Requirements

To compile your `.proto` files you need the proto compiler otherwise known as `protoc`. The compiler can be downloaded from [the protobuffer repository](https://github.com/protocolbuffers/protobuf/releases/). Make sure to download `protoc-xxxx.zip` and keep the `include` folder as well, you\'re going to need it in a later step.

Make sure the `protoc` binary is accessible from your PATH environment variable.

### Designing a protobuffer

A single `.proto` file can contain multiple data objects. These data objects are called messages. Below is an example:

```protobuf
message Person {
  required string name = 1;
  required int32 id = 2;
  optional string email = 3;
}
```

Most of the message is self-explanatory. Every property starts with `required` or `optional` followed by a datatype. ([A list available here](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf))

Beside the obvious stuff, every property is assigned some number. This number is NOT the value of the property, but rather the ID of the property. Since the serialized data is non-self-descriptive, it means that somehow the serialized data must be matched with a property. This is what the ID is for.

### Designing a GRPC service

Now we know how to make a simple message. However, messages do not describe functionality instead they are more like parameters. To describe functionality we create a `service`. A service is like a class containing only methods, because inside a service are `rpc` statements which represent methods. Note that the service and rpc statements **describe** functionality. They do not implement it, that is up for your application to do.

Let us start out with writing two messages, one will be the parameter (the request data) of the method and the other will be the reply. Note that an rpc method can only have one message as parameter, so make sure everything you need is inside the request message.  
In the end we want a service which greets a user by its name. So we send `John` and the response will be `Hello John!`

```protobuf
// The request message containing the user's name.
message HelloRequest {
  string name = 1;
}

// The response message containing the greetings
message HelloReply {
  string greeting = 1;
}
```

Now that the request and reply messages are defined, we have to define the service with the rpc methods. The service will be called `Greeter` with one method called `SayHello`.

```protobuf
// The greeting service definition.
service Greeter {
  // Sends a greeting
  rpc SayHello (HelloRequest) returns (HelloReply)
}
```

Last thing we have to do is throw it all in a single file called `helloworld.proto`, add a `package` and `syntax` keyword. The latter instructs the compiler what protobuffer version to use.

**The final file (helloword.proto)**

```protobuf
syntax = "proto3";

package helloworld;

// The greeting service definition.
service Greeter {
  // Sends a greeting
  rpc SayHello (HelloRequest) returns (HelloReply);
}

// The request message containing the user's name.
message HelloRequest {
  string name = 1;
}

// The response message containing the greetings
message HelloReply {
  string greeting = 1;
}
```

That is it! We defined a protobuffer containing our messages and a service definition, it is now ready to be compiled for your language. I am going with `Node.JS` for this tutorial.

### Compiling protobuffers

Compiling just protobuffers is nothing more than running `protoc` with an output for your language specified:

```
$ protoc --js_out=. helloworld.proto
```

However, this does not include the GRPC service and methods since GRPC is an extension to Protobuffers. There are different ways to compile for your language, have a look at [the official GRPC examples repository](https://github.com/grpc/grpc/tree/master/examples) and the accompanying readme's.

For Node.JS we use the `grpc-tools` package and compile:

```
$ npm install grpc-tools
$ `npm bin`/grpc_tools_node_protoc
    --js_out=import_style=commonjs,binary:./proto_js/
    --grpc_out=./proto_js/
    --plugin=protoc-gen-grpc=`npm bin`/grpc_tools_node_protoc_plugin
    helloworld.proto
```

In one line (for copy-paste purposes)

```
$(npm bin)/grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./proto_js/ --grpc_out=./proto_js/ --plugin=protoc-gen-grpc=$(npm bin)/grpc_tools_node_protoc_plugin helloworld.proto
```

## [Part 2: Implementing the GRPC Service in an Application](../2_app)
