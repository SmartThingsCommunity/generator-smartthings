'use strict'
const path = require('path')
const {default: chalk} = require('chalk')
const yosay = require('yosay')
const Generator = require('yeoman-generator')

module.exports = class extends Generator {
	async prompting() {
		const generatorPkg = this.fs.readJSON(path.join(__dirname, '../..', 'package.json'))
		this.log(yosay(`Welcome to the ${chalk.hex('#15bfff').bold.underline('SmartThings')} app generator! v${generatorPkg.version}`))

		this.answers = await this.prompt([{
			type: 'list',
			name: 'language',
			message: chalk.hex('#15bfff').bold.underline('What language do you want to use?'),
			choices: [{
				name: 'NodeJS',
				value: 'node'
			}, {
				name: 'Java',
				value: 'java'
			}]
		}])
	}

	async end() {
		this.env.run(`smartthings:${this.answers.language}`, {
			skipWelcome: true
		})
	}
}
