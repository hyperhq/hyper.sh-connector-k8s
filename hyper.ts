import querystring = require('querystring')
import aws4 = require('hyper-aws4')
import fetch = require('node-fetch')
import R = require('ramda')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

class Hyper {
  private accessKey: string
  private secretKey: string

  constructor(accessKey: string, secretKey: string) {
    this.accessKey = accessKey
    this.secretKey = secretKey
  }

  private request(method: string, path: string, data?: Object): Promise<Object> {
    const body = data ? JSON.stringify(data) : undefined
    const signOption = {
      url: `https://us-west-1.hyper.sh/v1.23${path}`,
      method: method || 'GET',
      credential: {
        accessKey: this.accessKey,
        secretKey: this.secretKey
      },
      body
    }
    const headers = aws4.sign(signOption)
    return fetch(signOption.url, {
      method: signOption.method,
      headers: headers,
      body
    }).then((res) => {
      if (res.status >= 400) {
        return res.text().then((message) => {
          throw(new Error(message))
        })
      }
      if (res.status === 204) {
        return null
      }
      return res.json()
    })
  }

  async listPod(): Promise<any> {
    const filters = JSON.stringify({
      label: ['hyper-connector-orchestrator=kubernetes']
    })
    const containers = await this.request('GET', `/containers/json?all=1&filters=${filters}`)
    return R.groupBy((container) => {
      return container.Labels['hyper-connector-pod']
    }, containers as any[])
  }

  async createPod(_container: any, pod: string): Promise<any> {
    const exposedPorts = {}, portBindings = {}
    for (const port of _container.ports) {
      const key = `${port.containerPort}/${port.protocol.toLowerCase()}`
      exposedPorts[key] = {}
      portBindings[key] = [{ HostPort: String(port.containerPort) }]
    }
    const image = _container.image
    const container = await this.request('POST', `/containers/create?name=kubernetes-pod-${pod}`, {
      Image: image,
      Labels: {
        sh_hyper_instancetype: 's4',
        'hyper-connector-pod': pod,
        'hyper-connector-orchestrator': 'kubernetes'
      },
      ExposedPorts: exposedPorts,
      HostConfig: {
        PortBindings: portBindings
      }
    })
    const containerId = container['Id']
    await Promise.all([
      this.attachFIP(containerId),
      this.start(containerId)
    ])
  }

  async attachFIP(containerId: string): Promise<any> {
    let fip = null
    const list = await this.request('GET', `/fips`)
    for (const item of list as Array<any>) {
      if (!item.container) {
        fip = item.fip
      }
    }
    if (!fip) {
      const fips = await this.request('POST', `/fips/allocate?count=1`)
      fip = fips[0]
    }
    await this.request('POST', `/fips/attach?ip=${fip}&container=${containerId}`)
  }

  async isRunning(pod: string): Promise<any> {
    const filters = JSON.stringify({
      label: [
        `hyper-connector-pod=${pod}`,
        'hyper-connector-orchestrator=kubernetes'
      ]
    })
    const containers = await this.request('GET', `/containers/json?all=1&filters=${filters}`)
    const container = containers[0]
    return container.State === 'running'
  }

  start(containerId: string): Promise<any> {
    return this.request('POST', `/containers/${containerId}/start`)
  }

  remove(containerId: string): Promise<any> {
    return this.request('DELETE', `/containers/${containerId}?v=1&force=1`)
  }
}

export default Hyper
