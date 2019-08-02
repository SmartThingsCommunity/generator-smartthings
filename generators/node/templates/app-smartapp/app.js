#!/usr/bin/env nodejs
const SmartApp = require('@smartthings/smartapp')
<% if (contextStoreProvider === 'dynamodb') { _%>
const DynamoDBContextStore = require('@smartthings/dynamodb-context-store')
<% } _%>
<% if (contextStoreProvider === 'firestore') { _%>
const FirestoreContextStore = require('@smartthings/firestore-context-store')
<% } _%>
<% if (hostingProvider === 'express') { _%>
const express = require('express')
const server = module.exports = express()
<% } _%>
<% if (hostingProvider !== 'lambda') { _%>
require('dotenv').config()
const PORT = 8080
<% } _%>
<% if (hostingProvider === 'express') { _%>
server.use(express.json())
<% } _%>

const smartapp = new SmartApp()
    .appId(process.env.ST_APP_ID)
    .configureLogger(console, 2, true)
    .configureI18n()
    .permissions(<%- JSON.stringify(smartAppPermissions) %>)
    <%_ if (hostingProvider !== 'lambda') { -%>
    .clientId(process.env.OAUTH_CLIENT_ID)
    .clientSecret(process.env.OAUTH_CLIENT_SECRET)
    <%_ } -%>
    <%_ if (contextStoreProvider === 'dynamodb') { -%>
    .contextStore(new DynamoDBContextStore({
      table: { name: <%- JSON.stringify(name) -%> },
      AWSConfigJSON: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      },
      autoCreate: true
    }))
    <%_ } -%>
    <%_ if (generateSmartAppFeatures && smartAppDisableCustomName) { -%>
    .disableCustomDisplayName(true)
    <%_ } -%>
    <%_ if (generateSmartAppFeatures && smartAppDisableRemoveApp) { -%>
    .disableRemoveApp(true)
    <%_ } -%>
    .page('mainPage', (context, page, _) => {
      const lights = context.configDevices('lights')
      page.section('sensors', section => {
        section
          .deviceSetting('contactSensor')
          .capabilities(['contactSensor'])
          .required(false)
      })
      page.section('lights', section => {
        section.paragraphSetting(lights ? 'editLights' : 'addLights')

        section
          .deviceSetting('lights')
          .capabilities(['switch'])
          .multiple(true)
          .permissions('rx')
      })
    })
    .updated(async (context, _) => {
        await context.api.subscriptions.unsubscribeAll()
        return context.api.subscriptions.subscribeToDevices(context.config.contactSensor, 'contactSensor', 'contact', 'myDeviceEventHandler');
    })
    .subscribedEventHandler('myDeviceEventHandler', (context, event) => {
        const value = event.value === 'open' ? 'on' : 'off';
        context.api.devices.sendCommands(context.config.lights, 'switch', value);
    });

<% if (hostingProvider !== 'lambda') { -%>
server.post('/', function(req, res, _) {
  smartapp.handleHttpCallback(req, res);
});

/* Start listening at your defined PORT */
server.listen(PORT, () => console.log(`Server is up and running on port ${PORT}`));
<% } else { -%>
exports.handler = (event, context, callback) => {
  smartapp.handleLambdaCallback(event, context, callback);
};
<% } -%>

