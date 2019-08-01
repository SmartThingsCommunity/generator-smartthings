/* eslint-disable no-undef, space-before-function-paren */
'use strict'

const path = require('path')
const fs = require('fs')
const assert = require('yeoman-assert')
const helpers = require('yeoman-test')

describe('generator-smartthings:java', function() {
	it('smartapp', done => {
		this.timeout(20000)
		helpers
			.run(path.join(__dirname, '../generators/java'))
			.withPrompts({
				applicationName: 'My Test App',
				applicationDescription: 'My test app description',
				classNamePrefix: 'MyTestApp',
				basePackageName: 'com.smartthings.mytestapp',
				folderName: 'mytestapp',
				clientId: 'my-client-id',
				clientSecret: 'my-client-secret',
				smartAppPermissions: ['r:devices:*', 'x:devices:*'],
				contextStore: 'dynamodb'
			}).toPromise().then(() => {
				try {
					const jbd = 'src/main/java/com/smartthings/mytestapp'
					assert.file([
						'build.gradle',
						'CHANGELOG.md',
						'README.md',
						'.gitignore',
						`${jbd}/MyTestAppConfiguration.java`,
						`${jbd}/handlers/MyTestAppEventHandler.java`,
						'src/main/resources/application.yml'
					])

					const body = fs.readFileSync(`${jbd}/handlers/MyTestAppConfigurationHandler.java`, 'utf8')
					assert(body.match(/\s+\.addPermissionsItem\("r:devices:\*"\)\s+/),
						'config handler contains read permissions')
					assert(body.match(/\s+\.addPermissionsItem\("x:devices:\*"\)\s+/),
						'config handler contains execute permissions')

					done()
				} catch (error) {
					done(error)
				}
			})
	})
})
