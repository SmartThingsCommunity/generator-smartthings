'use strict'
/**
 * Handle the request by retrieving an initial list of devices
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#Discovery
 * @param {*} discoveryRequest
 */
function handleDiscoveryRequest(discoveryRequest) {
	console.log(JSON.stringify(discoveryRequest))
}

/**
 * Handle the request by retrieving the device states for the indicated list of devices
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#State-Refresh
 * @param {*} stateRefreshRequest
 */
function handleStateRefreshRequest(stateRefreshRequest) {
	console.log(JSON.stringify(stateRefreshRequest))
}

/**
 * Handle the request by triggering the commands for the list of devices
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#Command
 * @param {*} commandRequest
 */
function handleCommandRequest(commandRequest) {
	console.log(JSON.stringify(commandRequest))
}

/**
 * When SmartThings receives an access token from a third party, it sends a callback authentication code. The third party can use this code to request callback access tokens.
 * Return format is not defined.(Empty obejct can be returned)
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#Reciprocal-access-token
 * @param {*} grantCallbackAccess
 */
function handleGrantCallbackAccess(grantCallbackAccess) {
	console.log(JSON.stringify(grantCallbackAccess))
}

/**
 * When user removed c2c intrgration, to clean up integration in third party side, SmartThings sends an integration deleted request.
 * Return format is not defined.(Empty obejct can be returned)
 * @param {*} integrationDeleted
 */
function handleIntegrationDeleted(integrationDeleted) {
	console.log(JSON.stringify(integrationDeleted))
}

const HANDLER = {
	discoveryRequest: handleDiscoveryRequest,
	stateRefreshRequest: handleStateRefreshRequest,
	commandRequest: handleCommandRequest,
	grantCallbackAccess: handleGrantCallbackAccess,
	integrationDeleted: handleIntegrationDeleted
	// Add here new requests
}

// This is the entry point
module.exports.handler = event => {
	console.log(JSON.stringify(event))
	return HANDLER[event.headers.interactionType](event)
		.then(result => {
			console.log(JSON.stringify(result))
			return result
		})
}
