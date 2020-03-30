## Part 3: Exposing the HTTP Health-Check endpoint

In the last part we create an application that implemented the GRPC Service and method. The application also served a healh-check endpoint on `/health`. In this guide we learn how to use Istio to expose the application and how it differs from a Kubernetes Ingress Controller.

This guide assumes you have basic knowledge on Kubernetes and understand the following terms:

- **Deployment** - A Deployment provides declarative updates for Pods and ReplicaSets.
- **Pod** - A Pod encapsulates an application’s container... A Pod represents a unit of deployment: a single instance of an application in Kubernetes.
- **Service** - An abstract way to expose an application running on a set of Pods as a network service.

### Deploying the application and creating a service

Before we can get started with exposing the health-check endpoint, we need to have the application running in our cluster together with a Service. I have provided two files of which one is a deployment file and the other is the service. I assume you understand how these resources work and I will not go in-depth on them. For more information see [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) and [Services](https://kubernetes.io/docs/concepts/services-networking/service).

Apply both files to your cluster by running:

```
$ kubectl apply -f ./deployment.yaml
$ kubectl apply -f ./service.yaml
```

### Ingress traffic

Requests from outside the cluster can not just reach a pod or service because they are protected by a firewall and only have an internal IP address. This is where the Istio Ingress Gateway comes in play together with Virtual Services.

#### The Istio Ingress Gateway

The Ingress Gateway is an [Envoy Proxy](https://envoyproxy.io/) which acts as a middle-man for requests from outside your cluster to reach an application within your cluster (it does this with a little help from a Load-Balancer Service). This Gateway is responsible for receiving connection for certain hostnames and for TLS termination or just plain TCP connections. The Gateway is configured by creating `gateway` resources.

A simple Gateway resource is given below:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: workshop-gateway
spec:
  selector:
    app: istio-ingressgateway # This is a reference to what Ingress Gateway must be configured
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
```

#### Istio Virtual Services

Now that the gates are open and requests can enter the Ingress Gateway, we have to tell where the traffic has to be routed to. Virtual Services are responsible for this.

Virtual Service are the first resource that define how traffic should be routed; there are other resources that further route requests. To get started we will expose the `/health` endpoint, but rewrite it to `/api/health` endpoint. This will then be routed to the workshop-demo service we created a few steps back. The domain name for this service is `workshop-demo` although it is recommended to be verbose and use the FQDN.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: workshop-virtual-service
spec:
  gateways:
    - workshop-gateway
  hosts:
    - "*"
  http:
    # We add an HTTP Entry that matches to `/api/health` and
    # rewrites this to `/health`, it then proxies it to the
    # workshop-demo service.
    - match:
        - uri:
            exact: "/api/health"
      rewrite:
        uri: "/health"
      route:
        - destination:
            # This routes the the traffic to the following domain
            # which resolves in the service we created.
            host: worksworkshop-demo
            port:
              number: 3000
```

After the VirtualService comes `DestinationRule`s. DestinationRules are applied after VirtualServices and further routes traffic. With DestinationRules, environments can be seperated - such as production and staging - or one could apply A/B testing. There are a few examples given in the [Virtual Service documentation](https://istio.io/docs/reference/config/networking/virtual-service). But it won't be applied in this guide.
