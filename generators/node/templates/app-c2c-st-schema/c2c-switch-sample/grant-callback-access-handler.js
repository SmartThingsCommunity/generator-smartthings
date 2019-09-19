const request = require('request')
const config = require('./config')

const {partnerEndpoint} = config
const stClientId = config.connectorClientId
const stClientSecret = config.connectorClientSecret

/**
 * For device status sync in realtime, callback status is required. For the callback, callback url and access token should be in. This request prrovides to get the url and access token.
 * https://smartthings.developer.samsung.com/docs/guides/smartthings-schema/smartthings-schema-reference.html#Reciprocal-access-token
 * @param {*} grantCallbackAccess the event from SmartThings
 */
async function handleGrantCallbackAccess(grantCallbackAccess) {
  const {requestId} = grantCallbackAccess.headers
  // AccessToken which is partner side token. It has relation to a c2c integration.
  const accessToken = grantCallbackAccess.authentication.token
  // Code is SmartThings side credential.
  const {code} = grantCallbackAccess.callbackAuthentication
  // OauthTokenUrl is an url to exchange code to SmartThings accessToken for callback.
  const oauthTokenUrl = grantCallbackAccess.callbackUrls.oauthToken
  // Callback url to request device status changes
  // const callbackUrls = grantCallbackAccess.callbackUrls.stateCallback

  // This can be handled by here or in API backend.
  const accessTokenResult = await requestAccessToken(requestId, code, oauthTokenUrl)
  console.log('accessTokenResult:', JSON.stringify(accessTokenResult, null, 2))

  // const stAccessToken = accessTokenResult.callbackAuthentication.accessToken
  // const stRefreshToken = accessTokenResult.callbackAuthentication.refreshToken
  // const stExpiresIn = accessTokenResult.callbackAuthentication.expiresIn

  // Add code here to send stAccessToken, stRefreshToken and stExpiresIn to partner server
  // If the stAccessToken has been expired, it shoud be refreshed using stRefreshToken
 
  return {}
}

function requestAccessToken(requestId, code, oauthTokenUrl) {
  const options = {
    method: 'POST',
    uri: oauthTokenUrl,
    headers: {
      'Content-Type': 'application/json'
    },
    json: true,
    body: {
      headers: {
        schema: 'st-schema',
        version: '1.0',
        interactionType: 'accessTokenRequest',
        requestId
      },
      callbackAuthentication: {
        grantType: 'authorization_code',
        code,
        clientId: stClientId,
        clientSecret: stClientSecret
      }
    }
  }
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        console.error('error from Partner %j', error)
        reject(error)
      } else {
        console.log('accessTokenResponse:', JSON.stringify(body, null, 2))
        resolve(response.body)
      }
    })
  })
}

module.exports = {
  handle: handleGrantCallbackAccess
}
