'use strict'

const fs = require('fs')
const path = require('path')
const util = require('util')
const {default: chalk} = require('chalk')
const yosay = require('yosay')
const inquirer = require('inquirer')

const Generator = require('yeoman-generator')

const readdir = util.promisify(fs.readdir)

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts)

    this.option('skip-welcome', {
      desc: 'Skip the welcome message.',
      type: Boolean,
      default: false,
      hide: true
    })
  }

  async prompting() {
    if (!this.options.skipWelcome) {
      this.log(yosay(`Welcome to the ${chalk.hex('#15bfff').bold.underline('SmartThings')} generator!`))
    }

    this.appConfig = {}

    async function required(input) {
      return input ? true : 'This field is required.'
    }

    Object.assign(this.appConfig, await this.prompt([{
      type: 'input',
      name: 'applicationName',
      validate: required,
      message: this._fmtMsg('Please provide a name that is friendly to the end user:')
    }]))
    Object.assign(this.appConfig, await this.prompt([{
      type: 'input',
      name: 'applicationDescription',
      validate: required,
      message: this._fmtMsg('Please enter a short description for your application:')
    }]))

    this.appConfig.upperCamelCaseName = this.appConfig.applicationName
      .replace(/[^a-z ]/ig, '')
      .replace(/(?:\s+|^)(.)/g, (match, chr) => chr.toUpperCase())
      .trim()
    this.appConfig.lowerCamelCaseName = this.appConfig.upperCamelCaseName.replace(/^([A-Z])/,
      (match, chr) => chr.toLowerCase())
    this.appConfig.lowerCaseName = this.appConfig.upperCamelCaseName.toLowerCase()

    Object.assign(this.appConfig, await this.prompt([{
      type: 'input',
      name: 'classNamePrefix',
      validate: required,
      message: this._fmtMsg('Choose a class name prefix (UpperCamelCase):'),
      default: this.appConfig.upperCamelCaseName
    }]))

    Object.assign(this.appConfig, await this.prompt([{
      type: 'input',
      name: 'basePackageName',
      validate: required,
      message: this._fmtMsg('What do you want to use for the base package name (e.g. com.example.myapp)?')
    }]))

    this.appConfig.basePackagePath = this.appConfig.basePackageName.replace(/\./g, path.sep)

    Object.assign(this.appConfig, await this.prompt([{
      type: 'input',
      name: 'folderName',
      validate: required,
      message: this._fmtMsg('Name your project/folder:'),
      default: this.appConfig.lowerCaseName
    }]))

    Object.assign(this.appConfig, await this.prompt({
      type: 'checkbox',
      name: 'smartAppPermissions',
      when: this.appConfig.generateSmartAppFeatures,
      pageSize: 5,
      message: this._fmtMsg('What permission scopes does your SmartApp need?', 'Remember – the fewer, the better! These must match settings in Developer Workspace.'),
      choices: [
        {name: 'Read devices ' + chalk.gray('Read details about a device, including device attribute state.'), value: 'r:devices:*', checked: true},
        {name: 'Write devices ' + chalk.gray('Update details such as the device name, or delete a device.'), value: 'w:devices:*'},
        {name: 'Execute devices ' + chalk.gray('Execute commands on a device.'), value: 'x:devices:*'},
        {name: 'Install device profiles ' + chalk.gray('Create devices of the type associated with the device profile.'), value: 'i:deviceprofiles'},
        {name: 'Read locations ' + chalk.gray('Read details of a location, such as geocoordinates and temperature scale.'), value: 'r:locations:*'}
      ]
    }))

    Object.assign(this.appConfig, await this.prompt({
      type: 'list',
      name: 'contextStore',
      message: this._fmtMsg('What is your context store provider?', 'This is a convenient way to store tokens for out-of-band requests.'),
      default: 'dynamodb',
      choices: [
        {name: 'AWS DynamoDB', value: 'dynamodb'},
        new inquirer.Separator(),
        {name: 'None', value: 'none'}
      ]
    }))

    if (this.appConfig.contextStore === 'dynamodb') {
      Object.assign(this.appConfig, await this.prompt([{
        type: 'input',
        name: 'clientId',
        message: this._fmtMsg('What is the client id for your app from the Developer Workspace?')
      }]))
      Object.assign(this.appConfig, await this.prompt([{
        type: 'input',
        name: 'clientSecret',
        message: this._fmtMsg('What is the client secret for your app from the Developer Workspace?')
      }]))
    }

    Object.assign(this.appConfig, await this.prompt({
      type: 'confirm',
      name: 'gitInit',
      message: this._fmtMsg('Initialize a git repository?'),
      default: true
    }))

    this.appConfig.baseFolder = this.appConfig.folderName + path.sep
  }

  _fmtMsg(message, notes = null) {
    if (notes) {
      return chalk.hex('#15bfff').bold.underline(message + ' ' + chalk.gray(notes))
    }

    return chalk.hex('#15bfff').bold.underline(message)
  }

  // Given a template or source file to copy from, determine the name of the
  // file it should be copied to. This will strip out extensions added and
  // make substitutions as necessary for things like the Java package directory.
  _calculateToFile(baseDir, filename) {
    let retVal
    if (filename.endsWith('.h.ejs') || filename.endsWith('.h.raw')) {
      retVal = path.join(baseDir, '.' + filename.slice(0, -6))
    } else {
      retVal = path.join(baseDir, filename.slice(0, -4))
      this.filenameSubstitutions.forEach(sub => {
        retVal = retVal.replace(sub.fromRE, sub.to)
      })
    }

    // Strip off template directory before adding base destination directory.
    retVal = retVal.replace(/^\w+/, '')

    return `${this.appConfig.baseFolder}${retVal}`
  }

  async _processTemplateFiles(baseDir) {
    const files = await readdir(this.templatePath(baseDir), {withFileTypes: true})
    files.forEach(file => {
      const from = path.join(baseDir, file.name)
      const to = this._calculateToFile(baseDir, file.name)
      if (file.isDirectory()) {
        this._processTemplateFiles(from)
      } else if (file.name.endsWith('.raw')) {
        this.fs.copy(this.templatePath(from), this.destinationPath(to))
      } else if (file.name.endsWith('.ejs')) {
        this.fs.copyTpl(this.templatePath(from), this.destinationPath(to), this.appConfig)
      } else {
        this.log(`ignoring unmatched file ${from}`)
      }
    })
  }

  async writing() {
    this.filenameSubstitutions = [{
      from: 'package_dir',
      to: this.appConfig.basePackagePath
    }, {
      from: 'class_name_prefix',
      to: this.appConfig.upperCamelCaseName
    }]
    this.filenameSubstitutions.forEach(sub => {
      sub.fromRE = new RegExp(`__${sub.from}__`, 'g')
    })
    this._processTemplateFiles('springboot')
  }

  end() {
    process.chdir(this.appConfig.baseFolder)
    if (this.appConfig.gitInit) {
      this.spawnCommand('git', ['init', '--quiet'])
    }

    this.log('')
    this.log(`Your app ${this.appConfig.name} has been created in ${this.appConfig.baseFolder.slice(0, -1)}.`)
    this.log('')
  }
}
