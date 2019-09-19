const request = require('request')
const config = require('./config')

const {partnerEndpoint} = config

/**
 * Discovery request is for retrieving an initial list of devices. If this request is coming, get device list and fill in the st-schema device form, aggregate and response
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#Discovery
 * @param {*} discoveryRequest Discovery is the first SmartThings request. Handle this request by retrieving a list of devices.
 */
async function handleDiscoveryRequest(discoveryRequest) {
  const accessToken = discoveryRequest.authentication.token
  const {requestId} = discoveryRequest.headers

  // Query device list
  const response = await getDeviceList(accessToken, requestId)

  // Let devices = response.devices
  console.log('get-devices-from-partner', JSON.stringify(response, null, 2))
  const stSchemaDevices = []

  // Configure st-schema devices
  for (const id in response) {
    if (response[id]) {
      const device = response[id]
      stSchemaDevices.push({
        externalDeviceId: device.externalDeviceId,
        deviceCookie: {},
        friendlyName: '[SDC] ' + device.friendlyName,
        manufacturerInfo: {
          manufacturerName: 'manufacturerName',
          modelName: device.modelName,
          hwVersion: '0',
          swVersion: '1'
        },
        deviceContext: {
          roomName: 'home',
          categories: ['switch']
        },
        // Device Handler Type let SmartThings know this integration discovered the type of device. Fill the proper Device Handler Type in value of 'deviceHandlerType' field
        // Please refer to 'https://smartthings.developer.samsung.com/docs/devices/smartthings-schema/device-handler-types.html'
        deviceHandlerType: ''
      })
    }
  }

  // Create discovery response
  const discoveryResponse = {
    headers: {
      schema: 'st-schema',
      version: '1.0',
      interactionType: 'discoveryResponse',
      requestId
    },
    devices: stSchemaDevices
  }

  return discoveryResponse
}

/**
 * In this sample we assume that get device list API requires Authorization header
 * This API returns device list. And a device object has device ID and name such as {'id':'device1', 'name':'foo'}
 * @param {String} accessToken partner's access token
 * @param {String} requestId from SmartThings event
 * @returns {Promise} device list from partner
 */
function getDeviceList(accessToken, requestId) {
  console.log(`getDeviceList token: ${accessToken}`)
  console.log(`getDeviceList requestId: ${requestId}`)

  const options = {
    method: 'GET',
    uri: `${partnerEndpoint}/devices`, // Partner's getDeviceList Endpoint
    headers: {'Content-Type': 'application/json'},
    json: true,
    body:{}
  }
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        console.error('error from partner %j', error)
        reject(error)
      } else {
        console.log('Get-Device-List-From-Partner-statusCode:', response.statusCode)
        console.log(JSON.stringify(body, null, 2))
        resolve(body)
      }
    })
  })
}

module.exports = {
  handle: handleDiscoveryRequest
}
