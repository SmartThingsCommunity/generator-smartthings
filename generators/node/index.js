'use strict'
const path = require('path')
const {default: chalk} = require('chalk')
const yosay = require('yosay')
const axios = require('axios').default
const inquirer = require('inquirer')
const BaseGenerator = require('../../lib/generator')
const validator = require('./validator')
const filter = require('./filter')

module.exports = class extends BaseGenerator {
	constructor(args, opts) {
		super(args, opts)

		this.option('skip-welcome', {
			desc: 'Skip the welcome message.',
			type: Boolean,
			default: false,
			hide: true
		})

		this.appConfig = Object.create(null)
		this.appConfig.installDependencies = false

		this.props = {
			name: this.pkg.name || process.cwd().split(path.sep).pop(),
			description: this.pkg.description,
			src: this.pkg.directories && this.pkg.directories.lib
		}

		this.dependencies = [
			'@smartthings/smartapp',
			'express'
		]

		this._filter = filter(this)
	}

	prompting() {
		if (!this.options.skipWelcome) {
			this.log(yosay(`Welcome to the ${chalk.hex('#15bfff').bold.underline('SmartThings')} generator!`))
		}

		const generator = this
		const prompts = {
			askForType: () => {
				const {appType} = generator.options
				if (appType) {
					const appTypes = ['smartapp', 'c2c-smartapp', 'c2c-st-schema', 'api-only']
					if (appTypes.indexOf(appType) !== -1) {
						generator.appConfig.type = 'app-' + appType
					}

					return Promise.resolve()
				}

				return generator.prompt({
					type: 'list',
					name: 'type',
					pageSize: 8,
					message: chalk.hex('#15bfff').bold.underline('What type of app do you want to create?'),
					choices: [{
						name: chalk.white.bold('SmartApp') + '\tAutomation for SmartThings App ' + chalk.italic('\n\t\tFor automations and orchestrating devices'),
						value: 'app-smartapp'
					}, {
						name: chalk.white.bold('SmartApp') + '\tAPI Integration ' + chalk.italic('\n\t\tFor integrating SmartThings into your service'),
						value: 'app-api-only',
						disabled: 'coming soon'
					}, {
						name: chalk.white.bold('SmartApp') + '\tCloud Device Integration' + chalk.italic('\n\t\tFor advanced devices, or if your cloud doesn\'t support OAuth 2.0'),
						value: 'app-c2c-smartapp',
						disabled: 'coming soon'
					}, {
						name: chalk.white.bold('ST Schema') + '\tCloud Device Integration ' + chalk.italic('\n\t\tFor clouds that support OAuth 2.0'),
						value: 'app-c2c-st-schema'
					}]
				}).then(typeAnswer => {
					generator.appConfig.type = typeAnswer.type
				})
			},

			// Ask for a SmartThings personal access token
			askForPat: () => {
				const suffix = chalk.dim.italic(' Get an ') + chalk.dim.bold.italic('Application') + chalk.dim.italic(' scope token from https://account.smartthings.com/tokens')
				return generator.prompt({
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema']
					}),
					type: 'input',
					name: 'smartThingsPat',
					message: chalk.hex('#15bfff').bold.underline('Enter a SmartThings personal access token'),
					suffix
				}).then(smartThingsPatAnswer => {
					generator.appConfig.smartThingsPat = smartThingsPatAnswer.smartThingsPat
				})
			},

			// Ask for app display name ("displayName" in package.json)
			askForAppDisplayName: () => {
				const {appDisplayName} = generator.options
				if (appDisplayName) {
					generator.appConfig.displayName = appDisplayName
					return Promise.resolve()
				}

				return generator.prompt({
					type: 'input',
					name: 'displayName',
					message: chalk.hex('#15bfff').bold.underline('What\'s the name of your app?'),
					validate: validator.validateNotEmpty,
					default: generator.appConfig.displayName
				}).then(displayNameAnswer => {
					generator.appConfig.displayName = displayNameAnswer.displayName
				})
			},

			// Ask for app id ("name" in package.json)
			askForAppId: () => {
				const {appName} = generator.options
				if (appName) {
					generator.appConfig.name = appName
					return Promise.resolve()
				}

				let def = generator.appConfig.name
				if (!def && generator.appConfig.displayName) {
					def = generator.appConfig.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')
				}

				if (!def) {
					def = ''
				}

				return generator.prompt({
					type: 'input',
					name: 'name',
					message: chalk.hex('#15bfff').bold.underline('What\'s the identifier of your app?'),
					default: def,
					validate: validator.validateAppId
				}).then(nameAnswer => {
					generator.appConfig.name = nameAnswer.name
				})
			},

			// Ask for app description
			askForAppDescription: () => {
				const {appDescription} = generator.options
				if (appDescription) {
					generator.appConfig.description = appDescription
					return Promise.resolve()
				}

				return generator.prompt({
					type: 'input',
					name: 'description',
					default: `Description of ${this.appConfig.displayName}`,
					message: chalk.hex('#15bfff').bold.underline('What\'s the description of your app?'),
					validate: validator.validateNotEmpty
				}).then(descriptionAnswer => {
					generator.appConfig.description = descriptionAnswer.description
				})
			},

			// Ask to build app permissions based on what's available in workspace
			askForSmartAppPermissions: () => {
				return generator.prompt({
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema']
					}),
					type: 'checkbox',
					name: 'smartAppPermissions',
					pageSize: 5,
					message: chalk.hex('#15bfff').bold.underline('What permission scopes does your SmartApp need? ') + chalk.dim('The fewer, the better!'),
					choices: [
						{name: 'Read devices ' + chalk.dim.italic('Read details about a device'), value: 'r:devices:*', checked: true},
						{name: 'Execute devices ' + chalk.dim.italic('Execute commands on a device'), value: 'x:devices:*'},
						{name: 'Write devices ' + chalk.dim.italic('Update or delete a device'), value: 'w:devices:*'},
						{name: 'Install device profiles ' + chalk.dim.italic('Create devices of the device profile type'), value: 'i:deviceprofiles'},
						{name: 'Read locations ' + chalk.dim.italic('Read details of a location (geocoordinates and temperature scale)'), value: 'r:locations:*'}
					]
				}).then(answer => {
					generator.appConfig.smartAppPermissions = answer.smartAppPermissions
				})
			},

			// Ask to generate smartapp features
			askForAppFeatures: () => {
				return generator.prompt({
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema']
					}),
					type: 'confirm',
					name: 'generateSmartAppFeatures',
					message: chalk.hex('#15bfff').bold.underline('Do you want to generate any app features?')
				}).then(answer => {
					generator.appConfig.generateSmartAppFeatures = answer.generateSmartAppFeatures
				})
			},

			// Ask to prevent users from renaming installed app
			askForDisableCustomName: () => {
				return generator.prompt({
					type: 'confirm',
					name: 'smartAppDisableCustomName',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema'],
						generateSmartAppFeatures: true
					}),
					default: true,
					message: chalk.hex('#15bfff').bold.underline('Prevent users from renaming your app?')
				}).then(answer => {
					generator.appConfig.smartAppDisableCustomName = answer.smartAppDisableCustomName
				})
			},

			// Ask to prevent users from removing app during flow
			askForDisableRemoveApp: () => {
				return generator.prompt({
					type: 'confirm',
					name: 'smartAppDisableRemoveApp',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema'],
						generateSmartAppFeatures: true
					}),
					default: true,
					message: chalk.hex('#15bfff').bold.underline('Prevent users from removing the app during configuration?')
				}).then(answer => {
					generator.appConfig.smartAppDisableRemoveApp = answer.smartAppDisableRemoveApp
				})
			},

			// Ask to configure i18n
			askForConfigureI18n: () => {
				return generator.prompt({
					type: 'confirm',
					name: 'smartAppConfigureI18n',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema'],
						generateSmartAppFeatures: true
					}),
					default: true,
					message: chalk.hex('#15bfff').bold.underline('Configure language localization?'),
					suffix: chalk.dim.italic(' (i18n)')
				}).then(answer => {
					generator.appConfig.smartAppConfigureI18n = answer.smartAppConfigureI18n
				})
			},

			// Ask about hosting provider (lambda, webhook + framework)
			askForHostingProvider: () => {
				return generator.prompt({
					type: 'list',
					name: 'hostingProvider',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema']
					}),
					message: chalk.hex('#15bfff').bold.underline('How are you hosting your app?'),
					default: 'express',
					choices: [
						{name: 'Webhook with Express', value: 'express'},
						{name: 'AWS Lambda', value: 'lambda'}
					]
				}).then(hostingAnswer => {
					generator.appConfig.hostingProvider = hostingAnswer.hostingProvider
				})
			},

			askForWebhookTargetUrl: () => {
				return generator.prompt({
					type: 'input',
					name: 'webhookTargetUrl',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema'],
						hostingProvider: {notIn: ['lambda']}
					}),
					message: chalk.hex('#15bfff').bold.underline('What is your webhook\'s public-DNS target URL?')
				}).then(webhookTargetUrlAnswer => {
					generator.appConfig.webhookTargetUrl = webhookTargetUrlAnswer.webhookTargetUrl
				})
			},

			// Conditionally ask for lambda ARN
			askForLambdaArn: () => {
				return generator.prompt({
					type: 'input',
					name: 'lambdaArn',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema'],
						hostingProvider: {in: ['lambda']}
					}),
					message: chalk.hex('#15bfff').bold.underline('What are your AWS Lambda function ARN(s)'),
					prefix: '(optional)',
					suffix: chalk.dim.italic(' space or comma delimited')
				}).then(lambdaArnAnswer => {
					generator.appConfig.lambdaArn = lambdaArnAnswer.lambdaArn
				})
			},

			// Ask for what type of context store provider
			askForContextStoreProvider: () => {
				return generator.prompt({
					type: 'list',
					name: 'contextStoreProvider',
					message: chalk.hex('#15bfff').bold.underline('What is your context store provider?'),
					suffix: chalk.italic(' Allows the SDK to manage user access/refresh tokens'),
					when: generator._filter({
						typeIn: ['app-smartapp', 'app-c2c-smartapp', 'app-api-only']
					}),
					default: 'dynamodb',
					choices: [
						{name: 'AWS DynamoDB', value: 'dynamodb'},
						{name: 'Firebase FireStore', value: 'firestore', disabled: 'coming soon'},
						{name: 'None', value: 'none'}
					]
				}).then(contextAnswer => {
					generator.appConfig.contextStoreProvider = contextAnswer.contextStoreProvider
				})
			},

			askForAwsAccessKeyId: () => {
				return generator.prompt({
					type: 'password',
					name: 'awsAccessKeyId',
					message: chalk.hex('#15bfff').bold.underline('What is your AWS access key Id?'),
					suffix: chalk.italic(' (DynamoDB)'),
					when: generator._filter({
						typeIn: ['app-smartapp', 'app-api-only'],
						contextStoreProvider: {in: ['dynamodb']}
					})
				}).then(awsAccessKeyIdAnswer => {
					generator.appConfig.awsAccessKeyId = awsAccessKeyIdAnswer.awsAccessKeyId
				})
			},

			askForAwsSecretAccessKey: () => {
				return generator.prompt({
					type: 'password',
					name: 'awsSecretAccessKey',
					message: chalk.hex('#15bfff').bold.underline('What is your AWS secret access key?'),
					suffix: chalk.italic(' (DynamoDB)'),
					when: generator._filter({
						typeIn: ['app-smartapp', 'app-api-only'],
						contextStoreProvider: {in: ['dynamodb']},
						awsAccessKeyId: true
					})
				}).then(awsSecretAccessKeyAnswer => {
					generator.appConfig.awsSecretAccessKey = awsSecretAccessKeyAnswer.awsSecretAccessKey
				})
			},

			askForAwsRegion: () => {
				return generator.prompt({
					type: 'input',
					name: 'awsRegion',
					message: chalk.hex('#15bfff').bold.underline('What is your AWS region?'),
					suffix: chalk.italic(' (DynamoDB)'),
					default: 'us-east-1',
					when: generator._filter({
						typeIn: ['app-smartapp', 'app-api-only'],
						contextStoreProvider: {in: ['dynamodb']},
						awsAccessKeyId: true,
						awsSecretAccessKey: true
					})
				}).then(awsRegionAnswer => {
					generator.appConfig.awsRegion = awsRegionAnswer.awsRegion
				})
			},

			// Ask if we should check javascript syntax
			askForJavaScriptInfo: () => {
				// If we end up generatiing more languages than JS, look for them here
				// if (generator.appConfig.type !== 'app-XXX-js') {
				//   return Promise.resolve()
				// }

				generator.appConfig.checkJavaScript = false
				return generator.prompt({
					type: 'confirm',
					name: 'checkJavaScript',
					when: generator._filter({
						typeNotIn: ['app-c2c-st-schema']
					}),
					message: chalk.hex('#15bfff').bold.underline('Enable JavaScript type checking in \'jsconfig.json\'?'),
					default: true
				}).then(strictJavaScriptAnswer => {
					generator.appConfig.checkJavaScript = strictJavaScriptAnswer.checkJavaScript
				})
			},

			// Ask for type of linter
			askForLinter: () => {
				return generator.prompt({
					type: 'list',
					name: 'linter',
					message: chalk.hex('#15bfff').bold.underline('What is your preferred linter?'),
					default: 'xo',
					choices: [
						{name: 'XO', value: 'xo'},
						{name: 'ESLint', value: 'eslint'},
						{name: 'None', value: 'none'}
					]
				}).then(linterAnswer => {
					generator.appConfig.linter = linterAnswer.linter
				})
			},

			// Ask for testing frameworks
			askForTesting: () => {
				return generator.prompt({
					type: 'list',
					name: 'tester',
					message: chalk.hex('#15bfff').bold.underline('Which testing framework do you prefer?'),
					default: 'mocha',
					choices: [
						{name: 'Mocha', value: 'mocha'},
						{name: 'Jest', value: 'jest', disabled: 'coming soon'},
						new inquirer.Separator(),
						{name: 'None', value: 'none'}
					]
				}).then(testerAnswer => {
					generator.appConfig.tester = testerAnswer.tester
				})
			},

			// Ask to initialize git repo
			askForGit: () => {
				// NOTE: If we ever make a template that doesn't require a package manager, check here.
				// if (['ext-command-ts', 'ext-command-js'].indexOf(generator.appConfig.type) === -1) {
				//   return Promise.resolve()
				// }

				return generator.prompt({
					type: 'confirm',
					name: 'gitInit',
					message: chalk.hex('#15bfff').bold.underline('Initialize a git repository?'),
					default: true
				}).then(gitAnswer => {
					generator.appConfig.gitInit = gitAnswer.gitInit
				})
			},

			// Ask for type of preferred package manager
			askForPackageManager: () => {
				// NOTE: If we ever make a template that doesn't require a package manager, check here.
				// if (['app-command-ts', 'app-command-js'].indexOf(generator.appConfig.type) === -1) {
				//   return Promise.resolve()
				// }

				generator.appConfig.pkgManager = 'npm'
				return generator.prompt({
					type: 'list',
					name: 'pkgManager',
					message: chalk.hex('#15bfff').bold.underline('Which package manager are you using?'),
					suffix: ' Must be installed globally',
					default: 'npm',
					choices: [
						{name: chalk.redBright('npm'), value: 'npm'},
						{name: chalk.blueBright('yarn'), value: 'yarn'}
					]
				}).then(pkgManagerAnswer => {
					generator.appConfig.pkgManager = pkgManagerAnswer.pkgManager
				})
			}
		}

		// Run all prompts in sequence, ignoring results
		let result = Promise.resolve()
		for (const taskName in prompts) {
			if (Object.prototype.hasOwnProperty.call(prompts, taskName)) {
				const prompt = prompts[taskName]
				result = result.then(_ => {
					return new Promise((resolve, reject) => {
						setTimeout(_ => prompt().then(resolve, reject), 0) // Set timeout is required, otherwise node hangs
					})
				})
			}
		}

		return result
	}

	async configuring() {
		this.sourceRoot(path.join(__dirname, './templates/', this.appConfig.type))

		// Available types: 'smartapp', 'c2c-smartapp', 'c2c-st-schema', 'api-only'
		switch (this.appConfig.type) {
			case 'app-smartapp':
				if (this.appConfig.smartThingsPat) {
					const success = await this._createAppRecord('AUTOMATION')
					if (!success) {
						this.log(yosay('An error occurred when creating your SmartThings app. Try again.'))
						this.abort = true
					}
				}

				break
			case 'app-c2c-smartapp':
			case 'app-c2c-st-schema':
			case 'app-api-only':
			default:
				// Unknown project type
				break
		}
	}

	async writing() {
		this.sourceRoot(path.join(__dirname, './templates/', this.appConfig.type))

		// Available types: 'smartapp', 'c2c-smartapp', 'c2c-st-schema', 'api-only'
		switch (this.appConfig.type) {
			case 'app-smartapp':
				if (this.appConfig.smartThingsPat) {
					const success = await this._createAppRecord('AUTOMATION')
					if (!success) {
						this.log(yosay('An error occurred when creating your SmartThings app. Try again.'))
						this.abort = true
					}
				}

				this._writingSmartApp()
				break
			case 'app-c2c-smartapp':
			case 'app-c2c-st-schema':
				this._writingStSchemaTemplate()
				break
			case 'app-api-only':
			default:
				// Unknown project type
				break
		}
	}

	_writingStSchemaTemplate() {
		if (this.abort) {
			return
		}

		const context = this.appConfig
		const path = context.name
		this.fs.copyTpl(this.sourceRoot() + '/index.js', path + '/index.js', context)
		this.fs.copyTpl(this.sourceRoot() + '/package.json', path + '/package.json', context)
		this.fs.copyTpl(this.sourceRoot() + '/README.md', path + '/README.md', context)

		const pkgJson = {
			dependencies: {},
			devDependencies: {},
			scripts: {}
		}

		const extensionsJson = {recommendations: []}

		switch (this.appConfig.tester) {
			case 'mocha':
				pkgJson.devDependencies.mocha = '^6.1.4'
				pkgJson.devDependencies.chai = '^4.2.0'
				break
			default: break
		}

		if (this.appConfig.gitInit) {
			extensionsJson.recommendations.push('codezombiech.gitignore')
			this.fs.copyTpl(this.sourceRoot() + '/gitignore', path + '/.gitignore', context)
		}

		switch (this.appConfig.linter) {
			case 'xo':
				extensionsJson.recommendations.push('samverschueren.linter-xo')
				pkgJson.devDependencies.xo = '^0.24.0'
				pkgJson.xo = {
					semicolon: false,
					space: 2,
					rules: {
						'no-unused-vars': 1,
						'no-multi-assign': 1
					}
				}
				pkgJson.scripts.lint = 'xo'
				pkgJson.scripts['lint:fix'] = 'xo --fix'
				break
			case 'eslint':
				extensionsJson.recommendations.push('dbaeumer.vscode-eslint')
				pkgJson.devDependencies.eslint = '^5.16.0'
				pkgJson.devDependencies['eslint-config-strongloop'] = '^2.1.0'
				pkgJson.scripts.lint = 'eslint --ignore-path .gitignore .'
				pkgJson.scripts['lint:fix'] = 'eslint --fix --ignore-path .gitignore .'
				this.fs.copyTpl(this.sourceRoot() + '/.eslintrc.json', context.name + '/.eslintrc.json', context)
				break
			default: break
		}

		this.fs.extendJSON(this.destinationPath(context.name + '/package.json'), pkgJson)

		this.appConfig.installDependencies = true
	}

	async _createAppRecord(classifications) {
		const pat = this.appConfig.smartThingsPat
		axios.defaults.headers.common.Authorization = `Bearer ${pat}`
		axios.defaults.headers.post['Content-Type'] = 'application/json'
		axios.defaults.baseURL = 'https://api.smartthings.com'
		try {
			const {data: app} = await axios.get(`/apps/${this.appConfig.name}`)
			if (app) {
				this.log(chalk.redBright('Try again with a different, unique app name'))
				return false
			}
		} catch (error) {
			if (error.response.status === 403) {
				this.log(chalk.blueBright('Creating a new SmartThings project for you'))
			}
		}

		try {
			const {data: createdApp} = await axios.post('/apps?signatureType=ST_PADLOCK&requireConfirmation=true', {
				appName: this.appConfig.name,
				displayName: this.appConfig.displayName,
				description: this.appConfig.description,
				singleInstance: false,
				appType: this.appConfig.hostingProvider === 'lambda' ? 'LAMBDA_SMART_APP' : 'WEBHOOK_SMART_APP',
				classifications: [classifications],
				oauth: {
					clientName: this.appConfig.name,
					scope: this.appConfig.smartAppPermissions
				},
				...(this.appConfig.hostingProvider === 'lambda' && {
					lambdaSmartApp: {
						functions: this.appConfig.lambdaArn.split(/[ ,]+/)
					}
				}),
				...(this.appConfig.hostingProvider !== 'lambda' && {
					webhookSmartApp: {
						targetUrl: this.appConfig.webhookTargetUrl
					}
				})
			})
			this.appConfig.appId = createdApp.app.appId
			this.appConfig.oauthClientId = createdApp.oauthClientId
			this.appConfig.oauthClientSecret = createdApp.oauthClientSecret
			this.registerSmartApp = true
			return true
		} catch (error) {
			return false
		}
	}

	_writingSmartApp() {
		if (this.abort) {
			return
		}

		const context = this.appConfig
		this.fs.copy(this.sourceRoot() + '/vscode', context.name + '/.vscode')
		this.fs.copy(this.sourceRoot() + '/locales/en.json', context.name + '/locales/en.json')

		this.fs.copyTpl(this.sourceRoot() + '/app.js', context.name + '/app.js', context)
		this.fs.copyTpl(this.sourceRoot() + '/package.json', context.name + '/package.json', context)
		this.fs.copyTpl(this.sourceRoot() + '/README.md', context.name + '/README.md', context)
		this.fs.copyTpl(this.sourceRoot() + '/CHANGELOG.md', context.name + '/CHANGELOG.md', context)
		this.fs.copy(this.sourceRoot() + '/vscodeignore', context.name + '/.vscodeignore')

		if (this.appConfig.hostingProvider !== 'lambda' && this.appConfig.smartThingsPat) {
			this.fs.copyTpl(this.sourceRoot() + '/.env', context.name + '/.env', context)
		}

		if (this.appConfig.gitInit) {
			this.fs.copy(this.sourceRoot() + '/gitignore', context.name + '/.gitignore')
		}

		if (this.appConfig.checkJavaScript) {
			this.fs.copyTpl(this.sourceRoot() + '/jsconfig.json', context.name + '/jsconfig.json', context)
		}

		const pkgJson = {
			dependencies: {},
			devDependencies: {},
			scripts: {}
		}

		const extensionsJson = {recommendations: []}

		pkgJson.dependencies['@smartthings/smartapp'] = '^1.8.0'

		switch (this.appConfig.hostingProvider) {
			case 'lambda':
				pkgJson.dependencies['aws-sdk'] = '^2.0.0'
				break
			case 'express':
				pkgJson.dependencies.dotenv = '^8.0.0'
				pkgJson.dependencies.express = '^4.17.1'
				break
			default: break
		}

		switch (this.appConfig.contextStoreProvider) {
			case 'dynamodb':
				pkgJson.dependencies.dotenv = '^8.0.0'
				pkgJson.dependencies['@smartthings/dynamodb-context-store'] = '^2.0.0'
				break
			case 'firestore':
				pkgJson.dependencies['@smartthings/firestore-context-store'] = '^1.0.0'
				break
			case 'none':
			default:
				break
		}

		switch (this.appConfig.tester) {
			case 'mocha':
				pkgJson.devDependencies.mocha = '^6.1.4'
				pkgJson.devDependencies.chai = '^4.2.0'
				break
			case 'jest':
				pkgJson.devDependencies.jest = '^24.8.0'
				break
			default: break
		}

		if (this.appConfig.gitInit) {
			extensionsJson.recommendations.push('codezombiech.gitignore')
		}

		switch (this.appConfig.linter) {
			case 'xo':
				extensionsJson.recommendations.push('samverschueren.linter-xo')
				pkgJson.devDependencies.xo = '^0.24.0'
				pkgJson.xo = {
					semicolon: false,
					space: 2,
					rules: {
						'no-unused-vars': 1,
						'no-multi-assign': 1
					}
				}
				pkgJson.scripts.lint = 'xo'
				pkgJson.scripts['lint:fix'] = 'xo --fix'
				break
			case 'eslint':
				extensionsJson.recommendations.push('dbaeumer.vscode-eslint')
				pkgJson.devDependencies.eslint = '^5.16.0'
				pkgJson.devDependencies['eslint-config-strongloop'] = '^2.1.0'
				pkgJson.scripts.lint = 'eslint --ignore-path .gitignore .'
				pkgJson.scripts['lint:fix'] = 'eslint --fix --ignore-path .gitignore .'
				this.fs.copyTpl(this.sourceRoot() + '/.eslintrc.json', context.name + '/.eslintrc.json', context)
				break
			default: break
		}

		this.fs.extendJSON(this.destinationPath(context.name + '/.vscode/extensions.json'), extensionsJson)
		this.fs.extendJSON(this.destinationPath(context.name + '/package.json'), pkgJson)

		this.appConfig.installDependencies = true
	}

	install() {
		if (this.abort) {
			return
		}

		process.chdir(this.appConfig.name)
		if (this.appConfig.installDependencies) {
			this.installDependencies({
				skipMessage: true,
				yarn: this.appConfig.pkgManager === 'yarn',
				npm: this.appConfig.pkgManager === 'npm',
				bower: false
			})
		}
	}

	end() {
		if (this.abort) {
			return
		}

		if (this.appConfig.gitInit) {
			this.spawnCommand('git', ['init', '--quiet'])
		}

		if (this.appConfig.installDependencies && this.appConfig.linter) {
			this.spawnCommand('npm', ['run', '--silent', 'lint:fix'])
		}

		this.log('')
		this.log('Your app ' + this.appConfig.name + ' has been created.')
		this.log('')

		if (this.registerSmartApp) {
			this.log('')
			this.log(chalk.bold('Register to confirm your app at any time:'))
			this.log(`  curl -X PUT -H "Authorization: Bearer ${this.appConfig.smartThingsPat}" ` + chalk.bold.underline(`https://api.smartthings.com/apps/${this.appConfig.appId}/register`))
			this.log('')
		}

		this.log('To start editing with Visual Studio Code, use the following commands:')
		this.log('')
		this.log('    code ' + this.appConfig.name)
		this.log('\r\n')
	}
}
