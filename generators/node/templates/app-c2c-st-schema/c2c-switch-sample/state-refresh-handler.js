const request = require('request')
const config = require('./config')

const {partnerEndpoint} = config

/**
 * SmartThings requests for update device status. If this request is coming, get status, transform to st-schema device status, aggregates and response with st-schema response form.
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#State-Refresh
 * @param {*} stateRefreshRequest to update status of device
 */
async function handleStateRefreshRequest(stateRefreshRequest) {
  const {devices} = stateRefreshRequest
  const {requestId} = stateRefreshRequest.headers
  const accessToken = stateRefreshRequest.authentication.token

  const deviceList = []

  for (const device of devices) {
    deviceList.push(device.externalDeviceId)
  }

  const deviceStateList = []
  if (deviceList.length > 0) {
    // Get status of devices
    const response = await getDeviceStatus(accessToken, requestId, deviceList)
    console.log(JSON.stringify(response, null, 2))

    for (const id in response) {
      if (response[id]) {
        console.log('deviceId', id, 'response', JSON.stringify(response[id], null, 2))

        const states = []

        // For about the switch capability, please refer to https://smartthings.developer.samsung.com/docs/api-ref/capabilities.html#Switch
        states.push({
          component: 'main',
          capability: 'st.switch',
          attribute: 'switch',
          value: response[id].value === 'on' ? 'on' : 'off'
        })
        
        // IMPORTANT : You must send the st.healthCheck Capability to indicate if the device is online or offline. If the device is offline, only st.healthCheck is included in the states array.
        states.push({
          component: 'main',
          capability: 'st.healthCheck',
          attribute: 'healthStatus',
          value: 'online'
        })
        const deviceState = {
          externalDeviceId: id,
          deviceCookie: {},
          states
        }
        deviceStateList.push(deviceState)
      }
    }
  } else {
    // Error on the Request
  }

  const stateRefreshResponse = {
    headers: {
      schema: 'st-schema',
      version: '1.0',
      interactionType: 'stateRefreshResponse',
      requestId
    },
    deviceState: deviceStateList
  }

  return stateRefreshResponse
}

/**
 * In this sample assumes that getting status of multiple devices API is supported by POST method.
 * Each device status includes id, power and isOnline fields
 * @param {String} accessToken partner's access token
 * @param {String} requestId for this request. Use this for response as well as
 * @param {[String]} deviceList list of devices to get status
 * @returns {Promise} device status
 */
function getDeviceStatus(accessToken, requestId, deviceList) {
  console.log('stateDevicesData :', JSON.stringify(deviceList, null, 2))

  const options = {
    method: 'POST',
    uri: `${partnerEndpoint}/devices/status`, // Partner's getDeviceStatus Endpoint
    headers: {'Content-Type': 'application/json'},
    json: true,
    body: {}
  }

  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        console.error('error from partner %j', error)
        reject(error)
      } else {
        console.log('Get-Device-Status-From-Partner-statusCode:', response.statusCode)
        console.log(JSON.stringify(body, null, 2))
        resolve(body)
      }
    })
  })
}

module.exports = {
  handle: handleStateRefreshRequest
}
