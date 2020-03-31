## Part 4: Mapping GRPC to HTTP/JSON Endpoints

In this part of the guide we are going to be mapping GRPC endpoints to HTTP/JSON endpoints with HTTP Verbs as a restful API would have.

### Requirements

Both files contain a `google` folder, extract it and merge the two folders. These folders contain imports required for extensions to function.

- In _Protobuf_ at `includes/google/`
- In _Googleapis_ at `/google/`

- **Protobuf includes** - You should have this save from before otherwise download the release _protoc-xxx.zip_ at [protobuf github](https://github.com/protocolbuffers/protobuf/releases/)
- **Google apis** - Clone or download the repository at [here](https://github.com/googleapis/googleapis)

### Updating the protobuffer

```protobuf
import "google/api/annotations.proto";

// The greeting service definition.
service Greeter {
  // Sends a greeting
  rpc SayHello (HelloRequest) returns (HelloReply) {
    option (google.api.http).get = "/get/{name}";
  }
}
```
