import R = require('ramda')
import client from './client'
import data = require('./data')

const exists = (items: any[]): boolean => {
  return R.any((item) => {
    return item.metadata.name === 'hyper-connector'
  }, items)
}

const update = async () => {
  try {
    const node = data.updatedNode(new Date())
    await client.replaceNodeStatus(node.metadata.name, node)
  } catch(err) {
    console.error(err)
  }
}

export async function create() {
  const res = await client.listNode()
  const found = exists(res.body.items)
  if (!found) {
    const node = data.newNode(new Date())
    await client.createNode(node)
  }
  setInterval(update, 5000)
}
