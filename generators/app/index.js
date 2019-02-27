'use strict'
const path = require('path')
const chalk = require('chalk')
const yosay = require('yosay')
const Generator = require('../../lib/generator')

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts)

    this.props = {
      name: this.pkg.name || process.cwd().split(path.sep).pop(),
      description: this.pkg.description,
      src: this.pkg.directories && this.package.directories.lib
    }

    this.dependencies = [
      '@smartthings/smartapp',
      'express'
    ]
  }

  prompting() {
    this.log(
      yosay(`Welcome to the ${chalk.red('SmartThings SmartApp')} generator!`)
    )

    const prompts = [{
      type: 'confirm',
      name: 'newFolder',
      message: 'Create a new folder?',
      default: true
    }, {
      type: 'input',
      name: 'folderName',
      message: 'Name your project/folder',
      default: this.appname
    }]

    this.prompt(prompts).then(props => {
      // To access props later use this.props.someAnswer;
      this.props = props
    })
  }

  writing() {
    this.fs.copy(
      this.templatePath('dummyfile.txt'),
      this.destinationPath('dummyfile.txt')
    )
  }

  install() {
    this.installDependencies()
  }
}
