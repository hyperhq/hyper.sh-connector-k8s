import api = require('@kubernetes/typescript-node')

const k8sApi:api.Core_v1Api = api.Config.defaultClient()

export default k8sApi
