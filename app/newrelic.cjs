'use strict'

const hasLicenseKey = Boolean(process.env.NEW_RELIC_LICENSE_KEY)

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
  allow_all_headers: false,
  attributes: {
    exclude: [
      'request.headers.authorization',
      'request.headers.cookie',
      'response.headers.setCookie',
    ],
  },
}
