const appIdRegexp = /^[a-z0-9][a-z0-9-]*$/i
const invalidIdMessage = 'Invalid app identifier'
const missingIdMessage = 'Missing app identifier'
module.exports = {

  /**
   * @param {string} id The id to validate
   * @returns {string|boolean} Invalid when false
   */
  validateAppId(id) {
    if (!id) {
      return missingIdMessage
    }

    if (!appIdRegexp.test(id)) {
      return invalidIdMessage
    }

    return true
  },

  /**
   * @param {{ length: number; }} name The value to validate
   * @returns {boolean} Invalid when false
   */
  validateNotEmpty(name) {
    return name && name.length > 0
  }
}
