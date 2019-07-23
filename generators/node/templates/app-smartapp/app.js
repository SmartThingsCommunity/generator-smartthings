#!/usr/bin/env nodejs
const path = require('path')
const SmartApp = require('@smartthings/smartapp')
<% if (contextStoreProvider === 'dynamodb') { _%>
const DynamoDBContextStore = require('@smartthings/dynamodb-context-store')
<% } _%>
<% if (contextStoreProvider === 'firestore') { _%>
const FirestoreContextStore = require('@smartthings/firestore-context-store')
<% } _%>
<% if (hostingProvider === 'express') { _%>
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const server = module.exports = express()
<% } _%>
<% if (hostingProvider !== 'lambda') { _%>
const PORT = 8080
<% } _%>
<% if (hostingProvider === 'express') { _%>
server.use(express.json())
<% } _%>

/* Define the SmartApp */
const smartapp = new SmartApp()
    // @smartthings_rsa.pub is your on-disk public key
    // If you do not have it yet, omit publicKey()
    .publicKey('@smartthings_rsa.pub') // optional until app verified
    // logs all lifecycle event requests and responses as pretty-printed JSON. Omit in production
    .enableEventLogging()
    <%_ if (generateSmartAppFeatures && smartAppPermissions) { -%>
    .permissions(<%- JSON.stringify(smartAppPermissions) %>)
    <%_ } -%>
    <%_ if (generateSmartAppFeatures && smartAppDisableCustomName) { -%>
    .disableCustomDisplayName(true)
    <%_ } -%>
    <%_ if (generateSmartAppFeatures && smartAppDisableRemoveApp) { -%>
    .disableRemoveApp(true)
    <%_ } -%>
    <%_ if (generateSmartAppFeatures && smartAppConfigureI18n) { -%>
    .configureI18n({
      updateFiles: false,
      locales: ['en'],
      directory: path.join(__dirname, '/locales')
    })
    <%_ } -%>
    .page('mainPage', (context, page, configData) => {
        page.section('sensors', section => {
            section
                .deviceSetting('contactSensor')
                .capabilities(['contactSensor'])
                .required(false);
        });
        page.section('lights', section => {
            section
                .deviceSetting('lights')
                .capabilities(['switch'])
                .multiple(true)
                .permissions('rx');
        });
    })
    .updated(async (context, updateData) => {
        // Called for both INSTALLED and UPDATED lifecycle events if there is no separate installed() handler
        await context.api.subscriptions.unsubscribeAll()
        return context.api.subscriptions.subscribeToDevices(context.config.contactSensor, 'contactSensor', 'contact', 'myDeviceEventHandler');
    })
    .subscribedEventHandler('myDeviceEventHandler', (context, event) => {
        const value = event.value === 'open' ? 'on' : 'off';
        context.api.devices.sendCommands(context.config.lights, 'switch', value);
    });

<% if (hostingProvider !== 'lambda') { -%>
server.post('/', function(req, res, next) {
  smartapp.handleHttpCallback(req, res);
});

/* Start listening at your defined PORT */
server.listen(PORT, () => console.log(`Server is up and running on port ${PORT}`));
<% } else { -%>
exports.handler = (event, context, callback) => {
  smartapp.handleLambdaCallback(event, context, callback);
};
<% } -%>

