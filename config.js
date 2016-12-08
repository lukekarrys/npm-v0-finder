module.exports = function () {
    return {
        moonboots: {
            main: __dirname + '/app.js',
            resourcePrefix: './'
        },
        htmlSource: function (context) {
          return require('fs').readFileSync('./page.html').toString().replace('{{entry}}', context.resourcePrefix + context.jsFileName);
        },
        directory: __dirname + '/_dist',
    };
};
