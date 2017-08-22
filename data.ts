import api = require('@kubernetes/typescript-node')

export function newNode(transition: Date): api.V1Node {
  return {
      apiVersion: "v1",
      kind: "Node",
      metadata: {
          name: "hyper-connector"
      } as api.V1ObjectMeta,
      spec: {
          taints: [
              {
                key: "hyper.sh/container",
                effect: "NoSchedule"
              } as api.V1Taint
          ] as Array<api.V1Taint>
      } as api.V1NodeSpec,
      status: {
        conditions: [
            {
                lastHeartbeatTime: new Date(),
                lastTransitionTime: transition,
                message: "kubelet is posting ready",
                reason: "KubeletReady",
                status: "True",
                type: "Ready"
            } as api.V1NodeCondition,
            {
                lastHeartbeatTime: new Date(),
                lastTransitionTime: transition,
                message: "kubelet has sufficient disk space available",
                reason: "KubeletHasSufficientDisk",
                status: "False",
                type: "OutOfDisk"
            } as api.V1NodeCondition
        ] as Array<api.V1NodeCondition>,
        nodeInfo: {
            kubeletVersion: "1.6.6"
        } as api.V1NodeSystemInfo
    } as api.V1NodeStatus
  } as api.V1Node
}

export function updatedNode(transition: Date): api.V1Node {
  const node = newNode(transition)
  node.status.allocatable = {
    "cpu": "20",
    "memory": "100Gi",
    "pods": "20"
  }
  node.status.capacity = node.status.allocatable
  return node
}

export interface NewPodOpts {
  name: string,
  ip: string,
  startDate: Date,
  running: boolean,
  containers: Array<api.V1Container>
}

export interface NewContainerOpts {
  name: string,
  image: string,
  startDate: string
}

export function newContainer(opts: NewContainerOpts): api.V1Container {
  return {
    name: opts.name,
    image: opts.image
  } as api.V1Container
}

export function newPod(opts: NewPodOpts): api.V1Pod {
  const pod = {
      apiVersion: 'v1',
      metadata: {
          name: opts.name,
          namespace: 'default'
      } as api.V1ObjectMeta,
      spec: {
          nodeName: 'hyper-connector'
      } as api.V1PodSpec,
      status: {
          podIP: opts.ip || null,
          phase: "Running",
          startTime: opts.startDate,
          conditions: [
              {
                  lastTransitionTime: opts.startDate,
                  status: "True",
                  type: "Initialized"
              } as api.V1PodCondition,
              {
                  lastTransitionTime: opts.startDate,
                  status: "True",
                  type: "PodScheduled"
              } as api.V1PodCondition,
              {
                  lastTransitionTime: opts.startDate,
                  status: "True",
                  type: "Ready"
              } as api.V1PodCondition
          ] as Array<api.V1PodCondition>
      } as api.V1PodStatus
  } as api.V1Pod
  const containers = new Array<api.V1Container>()
  const containerStatuses = new Array<api.V1ContainerStatus>()
  for (const container of opts.containers) {
    containers.push(
      {
        name: container.name,
        image: container.image
      } as api.V1Container
    )
    containerStatuses.push(
      {
        name: container.name,
        image: container.image,
        ready: opts.running,
        state: {
          running: {
            startedAt: opts.startDate
          } as api.V1ContainerStateRunning
        } as api.V1ContainerState
      } as api.V1ContainerStatus
    )
  }
  pod.spec.containers = containers
  pod.status.containerStatuses = containerStatuses
  return pod
}
