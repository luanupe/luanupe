'use strict'

const hasLicenseKey = Boolean(process.env.NEW_RELIC_LICENSE_KEY)
const appEnvironment = process.env.APP_ENV || 'dev'

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  agent_enabled: hasLicenseKey,
  distributed_tracing: {
    enabled: true,
  },
  logging: {
    enabled: hasLicenseKey,
    level: 'info',
  },
  labels: {
    environment: appEnvironment,
  },
  allow_all_headers: false,
  attributes: {
    exclude: [
      'request.headers.authorization',
      'request.headers.cookie',
      'response.headers.setCookie',
    ],
  },
}
