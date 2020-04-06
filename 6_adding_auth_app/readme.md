## Part 6: Adding authentication to our app

In this part of the guide we will be using Istio to add authentication to our app by verifying Json Web Tokens (JWT). This part will not go in to detail on how to authenticate a user by e-mail and password, and how to sign tokens. Although the new app version does provide a `/login` which signs a token. We will touch on using Json Web Keys (JWK) with JWT and Istio.  
At the end of this part you will have an application that serves public keys in JWK format, and an endpoint which is protected by Istio and only accessible with the right JWT.

### Asymmetric keys & terminology

Most JWT examples use a shared key to both sign and verify the token. This often works fine, however when someone else is required to verify a token. You must either share the key or create an endpoint for it. With Asymmetric keys, this is not the case. Asymmetric keys, such as RSA, comes with a public key and a private key. The private key will be used to sign tokens and must not be shared, but the public key can only be used to verify tokens. With this mechanic anyone can verify if a token is signed by the issuer.

Pretty much all big companies have there public keys up for grabbing. Want to see Google's? [Here it is](https://www.googleapis.com/oauth2/v3/certs). In fact, those are several public keys in JWK format. Now whenever someone comes to us with a JWT saying it is signed by google, we can actually verify that it is, but we can not modify it! It might sound familiar, well that is one of the ways how OAuth knows that some other provider authenticated you.

Some words you will see flying are:

- JWT: Json Web Token
- JWK: Json Web Key
- JWKS: Json Web Key Set
- KID: Key IDentifier
- RSA: an asymmetric encryption algorithm
- JOSE: Javascript Object Signing and Encryption

### Creating keys and a JWK

Creating asymmetric keys is not difficult, but you require some tools. We generate a private key in the PEM format from which you can extract the public key. Most linux systems come with OpenSSL installed. You can generate your keys with the following command. Make sure you do not provide a password.

```
$ openssl genrsa -out private.pem 1024
```

On windows you can use Putty to generate RSA keys. On the following download page, search for `puttygen.exe` and download it. ([Download here](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html)) Once you open puttygen you should be shown a simple gui, make sure to not provide a password and that you have RSA selected. Then press generate and save the private key.

**Optionally** you can save the public key as well, on linux run `openssl rsa -in private.pem -pubout -out public.pem` and on windows in puttygen click "save
public key".

We will be generating the JWK set (JWKS) at runtime using Cisco's Node-JOSE library. JOSE is an abbreviation for **J**avascript **O**bject **S**igning and **E**ncryption.

With Node-JOSE we will create a keystore which holds the currently active keys. Once we add our private key, the library will do the conversion to JWK and Public Key for you.

```js
// Import FileSystem with promises
const { promises: fs } = require("fs");
// Import JWK from node-jose
const { JWK } = require("node-jose");

// Create a keystore
const keystore = JWK.createKeyStore();

// Load our key
async function loadKeys() {
  // Load the key from the file
  const privateKeyPEM = await fs.readFile("./private.pem");
  // Add the key to the keystore,
  // specifying that it is in PEM format
  await keystore.add(privateKeyPEM, "pem");
}

// Load the keys, and after that print the JWKS
loadKeys().then(() => {
  // By default toJSON will only output the public keys in JWK format
  console.log(keystore.toJSON());
});
```

### Adding a JWKS endpoint to our app

As we have seen, loading keys is not difficult. I have rewritten the above code into [`keyProvider.js`](./src/keyprovider.js) which exposes two functions: `loadKeyFile` and `getJWKS`.

At first I load the keys before starting the GRPC or HTTP server:

```js
const keyProvider = require("./keyprovider");
...
async function main() {
  await keyProvider.loadKeyFile("./private.pem");
  console.log("Loaded keys!");
  ...
}
```

And in the `httpserver.js` I added the endpoint `/.well-known/jwks.json` which calls keyProvider.getJWKS.

```js
const keyProvider = require("./keyprovider");
...
function addRoutes(server) {
...
  // Register the `/.well-known/jwks.json` endpoint
  server.get("/.well-known/jwks.json", (req, res) => {
    const jwks = keyProvider.getJWKS();
    res.send(jwks);
  });
...
}
```

Now using [httpie](https://httpie.org/) I can send a GET request to the endpoint and we should receive the public key:

```json
$ http get :3000/.well-known/jwks.json
...
{
    "keys": [
        {
            "e": "AQAB",
            "kid": "5hi5m4OL-aF_m43tW_j5TOIkUyWXyghpsc24Wq1L11M",
            "kty": "RSA",
            "n": "2BMRH3w8T64Bxqvvh_W7sLhnU6labdvKpEKQ_--qtZnCB7LUsITH2rqU6zVZhf9Y-FoS4zltbiUAczm8MFVWtXKL8yKjWxyW7ylK4mGZE9-Iu8uSmWvsLUoSkSlsDj8T3qghJbf2LmMJpy2rq0uj5_9ntyL3s5reKGusDSMJWeA2tuVlsQV3hL6V1-HP88HAW-KixoUX6FvYLBM2Gk5h-KprIVVGYKnuZvSvVFYxh4
WyNC5YNUGVv71mFIcG2YEJKUK7E0fPoxO0KN3lNWiXLFuRWcSU7JsogB_rHdDGcYDVUSCATHhnyD17_lwSb8lRjuO82xT1C_k7YIw_1H9kDQ"
        }
    ]
}
```

## Configuring Istio

Remember that authentication is the process of identifying who is making the request, and authorization is the process of verifying that the requester has access to do the requested operation. Istio provides both, although you will most likely still require authorization in your app for resource-level access control.

### Request Authentication

`RequestAuthentication` Is the first Kubernetes resource provided by Istio that we will look at. It, as the name suggests, authenticated requests for a specified service. It requires atleast a JWKS endpoint and an issuer (an issuer is the service that signed the token). After configuring the resource, only requests with a valid JWT or without a JWT are allowed. The latter is because we are not authorizing requests yet. If a JWT is invalid, we reject the request because the identity could not be established.

Our application is serving the public JWKS, therefore the `jwksUri` will point towards our application. However, a common pitfall is to only use the service name as domain instead of the [FQDN](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/). This will not work, because Istiod is in the istio-system namespace and does not understand that your app is in the default namespace. (Istiod is the Istio Daemon which is responsible for passing the generated configuration to the proxies, therefore the Istio Daemon must be able to make the JwksUri request.)

```yaml
apiVersion: "security.istio.io/v1beta1"
kind: "RequestAuthentication"
metadata:
  name: workshop-demo
spec:
  selector:
    matchLabels:
      app: workshop-demo
  jwtRules:
    - issuer: "app"
      jwksUri: "http://workshop-demo.default.svc:3000/.well-known/jwks.json"
```

**Note**: As you can see the jwksUri points to port 3000, that is because we are point to our service not our Virtual Service. The latter redirects port 80 to 3000, but the service does not. That also means that no rewriting or grpc-json transcoding is happening.

If you want to test this configuration, apply the above yaml to your cluster and make a request to the `/health` endpoint:

- Without a JWT: Success
- With a valid JWT obtained through `/login`: Success
- With an invalid JWT: Fail

### Authorization Policies

Besides authenticating, we most likely want to specify what endpoints should be allowed to be visit while authenticated and which not. We can do this with an `AuthroizationPolicy`. Authorization Policies define when what is allowed. There are two types of policies: `action: ALLOW` and `action: DENY`. When the action is ALLOW, only that what is defined is allowed and the rest will be denied. When the action is DENY, only that what is specified will be denied and the rest will be allowed.

The policy below applies to our app and has two rules. The first rule only has a `to` keyword. Which means that any traffic to the given paths is allowed. The second rule specifies that only the traffic with a requestPrincipal is allowed on the `/health` path. A requestPrincipal is created from the JWT its issuer and subject keys: `iss/sub`. In our case the issuer will always be `app` and the subject is `demo-user` thus the requestPrincipal will be `app/demo-user`. When a request does not contain a JWT, there will be no requestPrincipal and thus the latter rule will fail, denying the request.

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: workshop-demo
spec:
  selector:
    matchLabels:
      app: workshop-demo
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/login", "/.well-known/jwks.json"]
    - to:
        - operation:
            paths: ["/health"]
      from:
        - source:
            requestPrincipals: ["*"]
```

## Testing

Start by applying both the patched virtual-service.yaml and then the authz.yaml. The former adds the new URIs to the virtual-service, such as `/api/login`. After applying both files, you should be able to reach `http://<cluster-ip>/.well-known/jwks.json` and geta JWKS response.

Now try reaching the health-endpoint at `http://<cluster-ip>/api/health`. You should be met with a `403 Forbidden: RBAC: access denied`. That is because in our AuthorizationPolicy we have specified that a JWT is required for the health endpoint. So create a JWT by making a request to `http://<cluster-ip>/api/login`. Then add make a request back to the health-check endpoint, but this time with the header: `Authorization: Bearer <your-jwt-token>`. You should get a proper response.

**Note**: Changes in the RequestAuthentication and AuthorizationPolicies can take up to a minute before fully processed in the cluster.
