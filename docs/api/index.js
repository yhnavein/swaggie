const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { runCodeGenerator } = require('swaggie');
const PORT = process.env.PORT || 5000;

express()
  .use(cors())
  .use(bodyParser.json({ limit: '10mb' }))
  .get('/', (req, res) => res.send('Nothing is here'))
  .post('/generate', generator)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

function generator(req, res) {
  if (!req.body) {
    return res.status(400).send('Body is missing');
  }

  runCodeGenerator({
    src: req.body,
    template: 'axios',
  })
    .then((code) => res.send(code))
    .catch((ex) => res.status(400).send('Error when processing request. ' + ex));
}
