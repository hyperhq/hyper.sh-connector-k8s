# Hyper.sh Container Connector for Kubernetes (experimental)

> Note:
>
>This project is inspired by and based on [aci-connector-k8s](https://github.com/Azure/aci-connector-k8s). We chose to create a new repo, instead of sending a PR, simply because that this is merely a quick change. In the future, a new open framework is desired to support all container-first infrastructure service with driver plugins, including [ACI](https://azure.microsoft.com/en-us/services/container-instances/) and [Hyper.sh](hyper.sh). 

The [Hyper.sh](https://hyper.sh/) Container Connector for Kubernetes allows Kubernetes clusters to deploy Hyper.sh Container.

This enables on-demand and nearly instantaneous container compute, orchestrated by Kubernetes, without having VM infrastructure to manage and while still leveraging the portable Kubernetes API. This will allow you to utilize both VMs and container simultaneously in the same Kubernetes cluster, giving you the best of both worlds.

Please note this software is experimental and should not be used for anything resembling a production workload.

## How does it Work

The Hyper.sh Connector roughly mimics the [Kubelet](https://kubernetes.io/docs/admin/kubelet/) interface by:

- Registering into the Kubernetes data plane as a `Node` with unlimited capacity
- Dispatching scheduled `Pods` to Hyper.sh Container instead of a VM-based container engine

Once the connector is registered as a node named `hyper-connector`, you can use `nodeName: hyper-connector` in your Pod spec to run the Pod via Hyper.sh Container. Pods without this node name will continue to be scheduled normally.  See below for instructions on how to use the Hyper.sh Connector with the Kubernetes scheduler [via taints and tolerations](#using-the-kubernetes-scheduler).

[![Hyper.sh Connector for Kubernetes Demo](https://asciinema.org/a/R0dd0t6klZDbBrxTS4qBX8fFR.png)](https://asciinema.org/a/R0dd0t6klZDbBrxTS4qBX8fFR)

## Requirements

 1. A working Hyper.sh account with credential
 2. A Kubernetes cluster with a working `kubectl`

## Quickstart

1. Edit `examples/hyper-connector.yaml` and supply environment variables
2. Run the Hyper.sh Connector with `kubectl create -f examples/hyper-connector.yaml`
3. Wait for `kubectl get nodes` to display the `hyper-connector` node
4. Run an NGINX pod via Hyper.sh using `kubectl create -f examples/nginx-pod.yaml`
5. Access the NGINX pod via its public address

## Usage

### Get Started with Hyper.sh

Follow the [instruction](https://docs.hyper.sh/GettingStarted/index.html) to get `Access Key` and `Secret Key` of Hyper.sh account.

Edit the `examples/hyper-connector.yaml` and input environment variables using the values above:

- HYPER_ACCESS_KEY: insert `Access Key`
- HYPER_SECRET_KEY: insert `Secret Key`

### Install the Hyper.sh Connector

```console
$ kubectl create -f examples/hyper-connector.yaml
deployment "hyper-connector" created

$ kubectl get pods
NAME                                   READY     STATUS    RESTARTS   AGE
hyper-connector-3791207804-gtc77       1/1       Running   0          2d

$ kubectl get nodes
NAME            STATUS    AGE       VERSION
hyper-connector Ready     2d        1.6.6
minikube        Ready     2d        v1.7.0
```

### Install the NGINX example

```console
$ kubectl create -f examples/nginx-pod.yaml 
pod "nginx" created

$ kubectl get pods -w -o wide
NAME                              READY     STATUS    RESTARTS   AGE       IP              NODE
hyper-connector-3791207804-gtc77  1/1       Running   1          2d        172.17.0.3      minikube
nginx                             1/1       Running   0          2d        205.233.66.72   hyper-connector
```

Note the pod is scheduled on the `hyper-connector` node.  It should now be accessible at the public IP listed.

### Using the Kubernetes scheduler

The example in [nginx-pod](examples/nginx-pod.yaml) hard codes the node name, but you can also use the Kubernetes scheduler.

The virtual `hyper` node, has a taint (`hyper.sh/container`) with a default effect
of `NoSchedule`. This means that by default Pods will not schedule onto
the `hyper` node unless they are explicitly placed there.

However, if you create a Pod that _tolerates_ this taint, it can be scheduled
to the `hyper` node by the Kubernetes scheduler.

Here is an [example](examples/nginx-pod-tolerations.yaml) of Pod with this
toleration.

To use this Pod, you can simply:

```sh
$ kubectl create -f examples/nginx-pod-toleration.yaml
```

Note that if you have other nodes in your cluster then this Pod may not
necessarily schedule onto the Hyper.sh Container.

To force a Pod onto Hyper.sh Container, you can either explicitly specify the NodeName as in the first example, or you can delete all of the other nodes in your cluster using `kubectl delete nodes <node-name>`. A third option is to fill your cluster with other workloads, then the scheduler will be obligated to schedule work to the Hyper.sh Container API.

## Development Instructions

### Local Development

```console
<edit source>
$ make clean
$ make build
$ node connector.js
```

### Docker Development

```console
make docker-build
docker tag <local-image> <remote-image>
docker push <remote-image>
```

Then edit `examples/hyper-connector.yaml` to point to the `remote-image`.

# TODO

- [ ] Full container parameter support
- [ ] Improve the status synchronization of node and pod
- [ ] Enhanced error checking and exception handling

# Contributing

https://github.com/hyperhq/hyper-connector-k8s
