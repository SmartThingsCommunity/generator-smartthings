'use strict'
const path = require('path')
const {default: chalk} = require('chalk')
const yosay = require('yosay')
const inquirer = require('inquirer')
const Generator = require('../../lib/generator')
const validator = require('./validator')

module.exports = class extends Generator {
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
						name: chalk.white.bold('SmartApp') + '\tAutomation for SmartThings App ' + chalk.gray.italic('\n\t\tFor automations and orchestrating devices'),
						value: 'app-smartapp'
					}, {
						name: chalk.white.bold('SmartApp') + '\tAPI Integration ' + chalk.gray.italic('\n\t\tFor integrating SmartThings into your service'),
						value: 'app-api-only',
						disabled: 'coming soon'
					}, {
						name: chalk.white.bold('SmartApp') + '\tCloud Device Integration' + chalk.gray.italic('\n\t\tFor advanced devices, or if your cloud doesn\'t support OAuth 2.0'),
						value: 'app-c2c-smartapp',
						disabled: 'coming soon'
					}, {
						name: chalk.white.bold('ST Schema') + '\tCloud Device Integration ' + chalk.gray.italic('\n\t\tFor clouds that support OAuth 2.0'),
						value: 'app-c2c-st-schema',
						disabled: 'coming soon'
					}]
				}).then(typeAnswer => {
					generator.appConfig.type = typeAnswer.type
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
					message: chalk.hex('#15bfff').bold.underline('What\'s the description of your app?')
				}).then(descriptionAnswer => {
					generator.appConfig.description = descriptionAnswer.description
				})
			},

			// Ask to generate smartapp features
			askForAppFeatures: () => {
				return generator.prompt({
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
					when: this.appConfig.generateSmartAppFeatures,
					default: false,
					message: chalk.hex('#15bfff').bold.underline('Do you want to prevent users from renaming your app?')
				}).then(answer => {
					generator.appConfig.smartAppDisableCustomName = answer.smartAppDisableCustomName
				})
			},

			// Ask to prevent users from removing app during flow
			askForDisableRemoveApp: () => {
				return generator.prompt({
					type: 'confirm',
					name: 'smartAppDisableRemoveApp',
					when: this.appConfig.generateSmartAppFeatures,
					default: false,
					message: chalk.hex('#15bfff').bold.underline('Do you want to prevent users from removing the app during the configuration flow?')
				}).then(answer => {
					generator.appConfig.smartAppDisableRemoveApp = answer.smartAppDisableRemoveApp
				})
			},

			// Ask to configure i18n
			askForConfigureI18n: () => {
				return generator.prompt({
					type: 'confirm',
					name: 'smartAppConfigureI18n',
					when: this.appConfig.generateSmartAppFeatures,
					default: false,
					message: chalk.hex('#15bfff').bold.underline('Do you want to configure language localization?'),
					suffix: chalk.gray(' (i18n)')
				}).then(answer => {
					generator.appConfig.smartAppConfigureI18n = answer.smartAppConfigureI18n
				})
			},

			// Ask to build app permissions based on what's available in workspace
			askForSmartAppPermissions: () => {
				return generator.prompt({
					type: 'checkbox',
					name: 'smartAppPermissions',
					when: this.appConfig.generateSmartAppFeatures,
					pageSize: 5,
					message: 'What permission scopes does your SmartApp need? ' + chalk.gray('Remember – the fewer, the better!'),
					choices: [
						{name: 'Read devices ' + chalk.gray('Read details about a device, including device attribute state.'), value: 'r:devices:*', checked: true},
						{name: 'Write devices ' + chalk.gray('Update details such as the device name, or delete a device.'), value: 'w:devices:*'},
						{name: 'Execute devices ' + chalk.gray('Execute commands on a device.'), value: 'x:devices:*'},
						{name: 'Install device profiles ' + chalk.gray('Create devices of the type associated with the device profile.'), value: 'i:deviceprofiles'},
						{name: 'Read locations ' + chalk.gray('Read details of a location, such as geocoordinates and temperature scale.'), value: 'r:locations:*'}
					]
				}).then(answer => {
					generator.appConfig.smartAppPermissions = answer.smartAppPermissions
				})
			},

			// Ask about hosting provider (lambda, webhook + framework)
			askForHostingProvider: () => {
				return generator.prompt({
					type: 'list',
					name: 'hostingProvider',
					message: chalk.hex('#15bfff').bold.underline('What is your hosting provider?'),
					default: 'webhook',
					choices: [
						{name: 'AWS Lambda', value: 'lambda'},
						{name: 'Webhook with Express', value: 'express'},
						{name: 'Webhook with Restify', value: 'restify', disabled: 'coming soon'},
						{name: 'Webhook with Foxify', value: 'foxify', disabled: 'coming soon'}
					]
				}).then(hostingAnswer => {
					generator.appConfig.hostingProvider = hostingAnswer.hostingProvider
				})
			},

			// Conditionally ask for lambda ARN
			askForLambdaArn: () => {
				return generator.prompt({
					type: 'input',
					name: 'lambdaArn',
					message: chalk.hex('#15bfff').bold.underline('What is your AWS Lambda ARN?'),
					prefix: '(optional)',
					when: this.appConfig.hostingProvider === 'lambda'
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
					suffix: chalk.gray.italic(' Allows the SDK to manage user access/refresh tokens'),
					when: ['app-smartapp', 'app-c2c-smartapp', 'app-api-only'].indexOf(generator.appConfig.type) !== -1,
					default: 'dynamodb',
					choices: [
						{name: 'AWS DynamoDB', value: 'dynamodb'},
						{name: 'Firebase FireStore', value: 'firestore', disabled: 'coming soon'},
						{name: 'Custom', value: 'custom'}
					]
				}).then(contextAnswer => {
					generator.appConfig.contextStoreProvider = contextAnswer.contextStoreProvider
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
					message: chalk.hex('#15bfff').bold.underline('Enable JavaScript type checking in \'jsconfig.json\'?'),
					default: false
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
						{name: 'Mocha + assert', value: 'mocha'},
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
						{name: chalk.redBright.italic('npm'), value: 'npm'},
						{name: chalk.blueBright.italic('yarn'), value: 'yarn'}
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

	writing() {
		this.sourceRoot(path.join(__dirname, './templates/', this.appConfig.type))

		// Available types: 'smartapp', 'c2c-smartapp', 'c2c-st-schema', 'api-only'
		switch (this.appConfig.type) {
			case 'app-smartapp':
				this._writingSmartApp()
				break
			case 'app-c2c-smartapp':
			case 'app-c2c-st-schema':
			case 'app-api-only':
			default:
				// Unknown project type
				break
		}
	}

	_writingSmartApp() {
		const context = this.appConfig
		this.fs.copy(this.sourceRoot() + '/vscode', context.name + '/.vscode')

		this.fs.copyTpl(this.sourceRoot() + '/app.js', context.name + '/app.js', context)
		this.fs.copyTpl(this.sourceRoot() + '/package.json', context.name + '/package.json', context)
		this.fs.copyTpl(this.sourceRoot() + '/README.md', context.name + '/README.md', context)
		this.fs.copyTpl(this.sourceRoot() + '/CHANGELOG.md', context.name + '/CHANGELOG.md', context)
		this.fs.copy(this.sourceRoot() + '/vscodeignore', context.name + '/.vscodeignore')

		if (this.appConfig.gitInit) {
			this.fs.copy(this.sourceRoot() + '/gitignore', context.name + '/.gitignore')
		}

		if (this.appConfig.checkJavaScript) {
			this.fs.copyTpl(this.sourceRoot() + '/jsconfig.json', context.name + '/jsconfig.json', context)
		}

		const pkgJson = {
			dependencies: {},
			devDependencies: {}
		}

		pkgJson.dependencies['@smartthings/smartapp'] = '^1.0.0'

		switch (this.appConfig.hostingProvider) {
			case 'lambda':
				pkgJson.dependencies['aws-sdk'] = '^2.0.0'
				break
			case 'express':
				pkgJson.dependencies.express = '~4.17.1'
				pkgJson.dependencies['body-parser'] = '~1.19.0'
				pkgJson.dependencies['cookie-parser'] = '~1.4.4'
				break
			case 'restify':
				break
			case 'foxify':
				break
			default: break
		}

		switch (this.appConfig.contextStoreProvider) {
			case 'dynamodb':
				pkgJson.dependencies['@smartthings/dynamodb-context-store'] = '^1.0.0'
				break
			case 'firestore':
				pkgJson.dependencies['@smartthings/firestore-context-store'] = '^1.0.0'
				break
			case 'custom':
			default:
				break
		}

		switch (this.appConfig.tester) {
			case 'mocha':
				pkgJson.devDependencies.mocha = '~6.1.4'
				break
			case 'jest':
				pkgJson.devDependencies.jest = '~24.8.0'
				break
			default: break
		}

		switch (this.appConfig.linter) {
			case 'xo':
				pkgJson.devDependencies.xo = '~0.24.0'
				pkgJson.xo = {
					semicolon: false,
					space: 2
				}
				break
			case 'eslint':
				pkgJson.devDependencies.eslint = '~5.16.0'
				this.fs.copyTpl(this.sourceRoot() + '/.eslintrc.json', context.name + '/.eslintrc.json', context)
				break
			default: break
		}

		this.fs.extendJSON(this.destinationPath(context.name + '/package.json'), pkgJson)

		this.appConfig.installDependencies = true
	}

	install() {
		process.chdir(this.appConfig.name)
		if (this.appConfig.installDependencies) {
			this.installDependencies({
				yarn: this.appConfig.pkgManager === 'yarn',
				npm: this.appConfig.pkgManager === 'npm',
				bower: false
			})
		}
	}

	end() {
		if (this.appConfig.gitInit) {
			this.spawnCommand('git', ['init', '--quiet'])
		}

		this.log('')
		this.log('Your app ' + this.appConfig.name + ' has been created.')
		this.log('')
		this.log('To start editing with Visual Studio Code, use the following commands:')
		this.log('')
		this.log('    cd ' + this.appConfig.name)
		this.log('    code .')
		this.log('\r\n')
	}
}
