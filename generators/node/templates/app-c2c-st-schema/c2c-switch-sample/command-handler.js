const request = require('request')
const config = require('./config')

const {partnerEndpoint} = config

/**
 * Command request has commands from SmartThings to control devices.
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#Command
 * @param {*} commandRequest Handle the Command request by triggering the commands for the list of devices
 */
async function handleCommandRequest(commandRequest) {
  const {devices} = commandRequest
  const {requestId} = commandRequest.headers
  const accessToken = commandRequest.authentication.token

  // In this sample handles a command. If you want to handle all commands, you can refer below steps.
  // 1. Iterate devices and commands
  // 2. Request command for all or each
  // 3. Aggregate the result
  const deviceId = devices[0].externalDeviceId
  const command = devices[0].commands[0]
  const {deviceCookie} = devices

  console.log('command :', JSON.stringify(command, null, 2))

  console.log('control-partner-device-start')
  const response = await controlDevice({accessToken, deviceId, command, requestId, deviceCookie})
  console.log('control-result', JSON.stringify(response, null, 2))

  let commandResponse = {}

  // If the response from controlDevice is meaningful, you can configure below states with it
  if (response) {
    const states = []
    // After execution, the device state sholud be updated. Complete below code to update switch state.
    // Refer to 'https://smartthings.developer.samsung.com/docs/devices/smartthings-schema/smartthings-schema-reference.html#Command'
    if (command.capability === 'st.switch') {
      states.push({
        component: command.component,
        capability: command.capability,
        attribute: 'switch',
        value: command.command
      })
    }

    states.push({
      component: 'main',
      capability: 'st.healthCheck',
      attribute: 'healthStatus',
      value: 'online'
    })

    console.log('command-states', JSON.stringify(states, null, 2))

    commandResponse = {
      headers: {
        schema: 'st-schema',
        version: '0.1',
        interactionType: 'commandResponse',
        requestId
      },
      deviceState: [
        {
          externalDeviceId: deviceId,
          deviceCookie,
          states
        }
      ]
    }
  }

  return commandResponse
}

function controlDevice({accessToken, deviceId, command, requestId, deviceCookie}) {
  console.log('accessToken', accessToken)
  console.log('command :', JSON.stringify(command, null, 2))
  console.log('requestId', requestId)
  console.log('deviceCookie :', JSON.stringify(deviceCookie, null, 2))
  
  const options = {
    method: 'POST',
    uri: `${partnerEndpoint}/devices/${deviceId}/commands`, // Partner's controlDevice Endpoint
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
        console.log('Control Partner statusCode:', response.statusCode)
        console.log(JSON.stringify(body, null, 2))
        resolve(body)
      }
    })
  })
}

module.exports = {
  handle: handleCommandRequest
}
