const path = require('path')

module.exports = function () {
  return {
    moonboots: {
      main: path.join(__dirname, 'app.js'),
      resourcePrefix: './'
    },
    htmlSource: function (context) {
      return require('fs').readFileSync('./page.html').toString().replace('{{entry}}', context.resourcePrefix + context.jsFileName)
    },
    directory: path.join(__dirname, '_dist')
  }
}
