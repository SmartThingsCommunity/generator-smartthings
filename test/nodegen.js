/* eslint-disable no-undef, space-before-function-paren */
'use strict'
const path = require('path')
const fs = require('fs')
const {expect} = require('chai')
const assert = require('yeoman-assert')
const helpers = require('yeoman-test')

describe('generator-smartthings:node', function() {
	it('smartapp', done => {
		this.timeout(20000)
		helpers
			.run(path.join(__dirname, '../generators/node'))
			.withPrompts({
				type: 'app-smartapp',
				displayName: 'My Test App',
				name: 'my-test-app',
				description: 'My test app description',
				generateSmartAppFeatures: false,
				hostingProvider: 'express',
				contextStoreProvider: 'dynamodb',
				checkJavaScript: true,
				linter: 'xo',
				tester: 'mocha',
				gitInit: false,
				pkgManager: 'npm'
			}).toPromise().then(() => {
				const expected = {
					name: 'my-test-app',
					displayName: 'My Test App',
					description: 'My test app description',
					version: '0.0.1',
					main: './app.js',
					scripts: {
						start: 'node ./app.js'
					},
					dependencies: {
						'@smartthings/dynamodb-context-store': '^1.0.0',
						'@smartthings/smartapp': '^1.0.0',
						'express': '~4.17.1',
						'body-parser': '~1.19.0',
						'cookie-parser': '~1.4.4'
					},
					devDependencies: {
						mocha: '~6.1.4',
						xo: '~0.24.0'
					},
					xo: {
						semicolon: false,
						space: 2
					}
				}
				try {
					assert.file([
						'CHANGELOG.md',
						'README.md',
						'jsconfig.json',
						'package.json',
						'.vscodeignore',
						'app.js'
					])

					const body = fs.readFileSync('package.json', 'utf8')
					const actual = JSON.parse(body)
					assert.deepEqual(expected, actual)
					done()
				} catch (error) {
					done(error)
				}
			})
	})

	it('validator validateAppId() returns correct response', () => {
		const validator = require('./../generators/node/validator')
		const invalidAppId = validator.validateAppId('bad app id')
		const missingAppId = validator.validateAppId('')
		const goodAppId = validator.validateAppId('good-app-id')
		expect(invalidAppId).to.equal('Invalid app identifier')
		expect(missingAppId).to.equal('Missing app identifier')
		expect(goodAppId).to.equal(true)
	})

	it('validator validateNotEmpty() returns correct boolean', () => {
		const validator = require('./../generators/node/validator')
		expect(validator.validateNotEmpty('not empty value')).to.equal(true)
		expect(validator.validateNotEmpty('')).to.equal(false)
		expect(validator.validateNotEmpty()).to.equal(false)
		expect(validator.validateNotEmpty(undefined)).to.equal(false)
	})
})
