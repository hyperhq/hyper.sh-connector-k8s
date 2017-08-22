import R = require('ramda')
import client from './client'
import data = require('./data')
import Hyper from './hyper'
import api = require('@kubernetes/typescript-node')

const hyper = new Hyper(process.env.HYPER_ACCESS_KEY, process.env.HYPER_SECRET_KEY)

export async function create() {
  try {
    const podMap = await hyper.listPod()
    for (const name of Object.keys(podMap)) {
      const _container = podMap[name][0]
      let found = true
      try {
        await client.readNamespacedPod(name, 'default')
      } catch (err) {
        if (err.body.code !== 404) {
          throw err
        } else {
          found = false
        }
      }
      const container = data.newContainer({
        name: _container.Names[0].slice(1),
        image: _container.Image,
        startDate: _container.Created
      })
      const newPodOpts = {
        name,
        ip: _container.Labels['sh.hyper.fip'],
        startDate: new Date(_container.Created * 1000),
        running: false,
        containers: [container]
      }
      if (!found) {
        const pod = data.newPod(newPodOpts)
        await client.createNamespacedPod('default', pod)
      } else {
        newPodOpts.running = await hyper.isRunning(name)
        const pod = data.newPod(newPodOpts)
        await client.replaceNamespacedPodStatus(name, 'default', pod)
      }
    }
  } catch(err) {
    console.error(err)
  }
  setTimeout(create, 5000)
}

export async function sync() {
  try {
    const [hyperPodMap, pods] = await Promise.all([
      hyper.listPod(),
      client.listNamespacedPod('default')
    ])

    const k8sPodMap = []
    pods.body.items.forEach((pod) => {
      const podName = pod.metadata.name
      if (pod.spec.nodeName === 'hyper-connector' && !hyperPodMap[podName] && !pod.metadata.deletionTimestamp) {
        k8sPodMap[podName] = pod
      }
    })

    for (const name of Object.keys(k8sPodMap)) {
      const pod = k8sPodMap[name]
      const container = pod.spec.containers[0]
      await hyper.createPod(container, name)
    }
  } catch(err) {
    console.error(err)
  }
  setTimeout(sync, 5000)
}

export async function remove() {
  try {
    const [hyperPodMap, pods] = await Promise.all([
      hyper.listPod(),
      client.listNamespacedPod('default')
    ])

    const k8sPodMap = []
    pods.body.items.forEach((pod) => {
      if (pod.spec.nodeName === 'hyper-connector' && pod.metadata.deletionTimestamp) {
        k8sPodMap[pod.metadata.name] = pod
      }
    })

    for (const name of Object.keys(k8sPodMap)) {
      if (!hyperPodMap[name]) {
        await client.deleteNamespacedPod(name, 'default', { gracePeriodSeconds: 0 } as api.V1DeleteOptions, 'false', 0, true)
      } else {
        await hyper.remove(hyperPodMap[name][0].Id)
      }
    }
  } catch(err) {
    console.error(err)
  }
  setTimeout(remove, 5000)
}
