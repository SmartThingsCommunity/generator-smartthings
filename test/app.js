/* eslint-disable no-undef */
'use strict'
const path = require('path')
const assert = require('yeoman-assert')
const helpers = require('yeoman-test')

describe('generator-smartthings-smartapp:app', () => {
  beforeEach(() => {
    return helpers
      .run(path.join(__dirname, '../generators/app'))
      .withPrompts({
        newFolder: false,
        folderName: 'dummyFolder',
        useExpress: true
      })
  })

  it('creates files', () => {
    assert.file(['dummyfile.txt'])
  })
})
