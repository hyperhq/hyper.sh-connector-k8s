import client from './client'
import node = require('./node')
import pod = require('./pod')

const main = async () => {
  console.log('starting')
  await node.create()
  pod.create()
  pod.remove()
  pod.sync()
  console.log('started')
}

;(async () => {
  try {
    await main()
  } catch(err) {
    console.error(err)
  }
})()
