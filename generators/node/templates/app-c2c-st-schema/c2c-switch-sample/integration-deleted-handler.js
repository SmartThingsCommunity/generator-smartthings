const request = require('request')
const config = require('./config')

const {partnerEndpoint} = config

/**
 * Let partner know the integration is deleted from SmartThings App. Partner cloud should clean resources for the integration.
 * @param {*} integrationDeletedRequest When this integration is deleted by user, this request is notified to clean up
 */
async function handleIntegrationDeleted(integrationDeletedRequest) {
  const accessToken = integrationDeletedRequest.authentication.token
  const {requestId} = integrationDeletedRequest.headers
  const response = await deleteIntegration(accessToken, requestId)
  console.log(JSON.stringify(response, null, 2))

  return {}
}

function deleteIntegration(accessToken, requestId) {
  console.log('IntegrationDeleted :', accessToken, requestId)

  const options = {
    method: 'DELETE',
    uri: `${partnerEndpoint}/integrationDeleted`, // Partner's integrationDeletedRequest Endpoint
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
        console.log('integration-delete-Partner-statusCode:', response.statusCode)
        console.log(JSON.stringify(body, null, 2))
        resolve(body)
      }
    })
  })
}

module.exports = {
  handle: handleIntegrationDeleted
}
