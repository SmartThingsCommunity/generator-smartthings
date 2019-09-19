const express = require('express')
const bodyParser = require('body-parser')
const handler = require('./handler')

const port = 3000

const app = express()
app.use(bodyParser.json())

app.post('/', async (req, res) => {
  const result = await handler(req.body)
  res.send(result)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
