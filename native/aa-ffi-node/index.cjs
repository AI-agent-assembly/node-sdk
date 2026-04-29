'use strict'

const fs = require('node:fs')
const path = require('node:path')

const directPath = path.join(__dirname, 'index.node')
if (fs.existsSync(directPath)) {
  module.exports = require(directPath)
} else {
  const platformAddon = fs
    .readdirSync(__dirname)
    .find((name) => /^index\..+\.node$/.test(name))

  if (!platformAddon) {
    throw new Error('No native addon binary found in native/aa-ffi-node')
  }

  module.exports = require(path.join(__dirname, platformAddon))
}
