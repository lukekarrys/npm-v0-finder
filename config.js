module.exports = function () {
    return {
        moonboots: {
            main: __dirname + '/app.js',
            resourcePrefix: './'
        },
        directory: __dirname + '/_site',
    };
};
