'use strict'

const discoveryRequestHandler = require('./discovery-handler')
const stateRefreshRequestHandler = require('./state-refresh-handler')
const commandRequestHandler = require('./command-handler')
const integrationDeletedHandler = require('./integration-deleted-handler')

const grantCallbackAccessHandler = {
  handle: event => {
    console.log(event)
    return {}
  }
}

const interactionResultHandler = {
  handle: event => {
    console.log(event)
    return {}
  }
}

const HANDLER = {
  discoveryRequest: discoveryRequestHandler,
  stateRefreshRequest: stateRefreshRequestHandler,
  commandRequest: commandRequestHandler,
  grantCallbackAccess: grantCallbackAccessHandler,
  integrationDeleted: integrationDeletedHandler,
  interactionResult: interactionResultHandler
  // Add here new requests
}

// This is the entry point of this integration. This function routes the request from SmartThings.
module.exports = async event => {
  let result = {}
  console.log(JSON.stringify(event, null, 2))
  try {
    result = await HANDLER[event.headers.interactionType].handle(event)
  } catch (error) {
    console.error(error)
  }

  console.log(JSON.stringify(result, null, 2))
  return result
}
