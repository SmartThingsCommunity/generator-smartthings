/* eslint-disable no-undef, no-unused-expressions, space-before-function-paren */
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
				smartAppPermissions: ['r:devices:*', 'x:devices:*'],
				generateSmartAppFeatures: false,
				hostingProvider: 'express',
				contextStoreProvider: 'dynamodb',
				awsAccessKeyId: 'bad-access-key',
				awsSecretAccessKey: 'bad-secret-access-key',
				awsRegion: 'us-east-2',
				checkJavaScript: true,
				linter: 'xo',
				tester: 'mocha',
				gitInit: false,
				pkgManager: 'npm',
				installDependencies: false
			}).toPromise().then(() => {
				const expected = {
					name: 'my-test-app',
					displayName: 'My Test App',
					description: 'My test app description',
					version: '0.0.1',
					main: './app.js',
					scripts: {
						'start': 'node ./app.js',
						'lint': 'xo',
						'lint:fix': 'xo --fix'
					},
					dependencies: {
						'@smartthings/smartapp': '^1.8.0',
						'dotenv': '^8.0.0',
						'express': '^4.17.1',
						'@smartthings/dynamodb-context-store': '^2.0.0'
					},
					devDependencies: {
						'mocha': '^6.1.4',
						'chai': '^4.2.0',
						'xo': '^0.24.0'
					},
					xo: {
						'semicolon': false,
						'space': 2,
						'rules': {
							'no-unused-vars': 1,
							'no-multi-assign': 1
						}
					}
				}
				try {
					assert.file([
						'.vscode/extensions.json',
						'.vscode/launch.json',
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

	it('smartapp with invalid pat aborts', done => {
		this.timeout(20000)
		helpers
			.run(path.join(__dirname, '../generators/node'))
			.withPrompts({
				type: 'app-smartapp',
				displayName: 'My Test App',
				name: 'my-test-app',
				description: 'My test app description',
				smartThingsPat: 'bad-pat',
				smartAppPermissions: ['r:devices:*', 'x:devices:*'],
				generateSmartAppFeatures: false,
				hostingProvider: 'express',
				contextStoreProvider: 'dynamodb',
				awsAccessKeyId: 'bad-access-key',
				awsSecretAccessKey: 'bad-secret-access-key',
				awsRegion: 'us-east-2',
				checkJavaScript: true,
				linter: 'xo',
				tester: 'mocha',
				gitInit: false,
				pkgManager: 'npm',
				installDependencies: false
			}).toPromise().then(() => {
				const pkgExists = fs.existsSync('package.json')
				expect(pkgExists).to.not.be.true
				done()
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
