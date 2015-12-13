var domify = require('domify');
var xhr = require('xhr');
var _ = require('underscore');
var async = require('async');
var domready = require('domready');
var log = require('andlog');

var user = _.escape((window.location.hash || '#').slice(1) || '');
var proxyUrl = 'http://jsonp.afeld.me/?url=';
var registryUrl = 'http://registry.npmjs.org/';
var userUrl = registryUrl + '-/_view/browseAuthors?group_level=3&skip=0&limit=1000&stale=update_after&startkey=["' + user + '"]&endkey=["' + user + '",{}]';

function append(str) {
  document.body.appendChild(domify(str));
}

function appendP(str) {
 append('<p>' + str + '</p>');
}

function appendS(str) {
 append('<span>' + str + '</span>');
}

function appendModule(module) {
  appendP(_.isString(module) ? module : module.name + '@' + '<strong>' + module.version + '</strong>');
}

function displayModules(head, modules, msg) {
  if (modules.length === 0 && !msg) {
    return;
  }
  append('<h2>' + head + '</h2>');
  if (modules.length === 0) {
    appendP(msg);
  } else {
    modules.forEach(function (module) {
      appendModule(module);
    });
  }
}

function isError(err) {
  return err instanceof Error;
}

function isStable(obj) {
  return obj && obj.version && obj.version.slice(0, 1) !== '0';
}


var errorModules = [];
function reqModule(module, cb) {
  log('requesting', module);
  xhr(proxyUrl + encodeURIComponent(registryUrl + module),
  function (err, _resp, body) {
    if (err) {
      if (!_.contains(errorModules, module)) {
        // Retry once
        errorModules.push(module);
        log('retry', module);
        reqModule(module, cb);
      } else {
        console.error('error fetching', module);
        cb(null, new Error(module));
      }
    } else {
      var resp = JSON.parse(body);
      log('found', module, resp['dist-tags'].latest);
      appendS('.');
      cb(null, {
        name: module,
        version: resp['dist-tags'].latest
      });
    }
  });
}

window.goToUser = function goToUser() {
  var username = document.getElementById('username');
  var value = username && username.value;
  if (value) {
    window.location.href = '#' + value;
    window.location.reload();
  }
};

domready(function () {

  append('<h1>Find all 0.x.y modules for a user!</h1>');

  append([
    '<div><input id="username" placeholder="npm username" value="' + user + '">',
    '<a href="javascript:void(0)" onclick="goToUser()">Find modules</a></div>'
  ].join(''));

  if (!user) {
    return;
  }

  // Start
  appendP('Fetching modules for ' + user);

  // Fetch all user modules
  xhr(proxyUrl + encodeURIComponent(userUrl),
  function (err, _resp, body) {
    if (err) {
      return appendP('Error finding user' + user);
    }
    var resp;
    var rows;
    var modules;

    try {
      resp = JSON.parse(body);
      rows = resp.rows || [];
      appendP('Found ' + rows.length + ' modules');
    } catch (e) {
      appendP('Found no modules');
      return;
    }

    // Get names of all modules
    modules = _.compact(rows.map(function (row) {
      return row.key && row.key[1];
    }));

    if (modules.length === 0) {
      return;
    }

    log(modules.length);
    log(modules.join(','));

    // Fetch all module versions
    async.mapLimit(modules, 5, reqModule, function (err, results) {
      var errors = _.filter(results, isError);
      var dividedModules = _.partition(_.reject(results, isError), isStable);
      var v0 = dividedModules[1] || [];

      displayModules(v0.length + ' modules @ 0.x.y', v0, user + ' has no 0.x.y modules! Woo!');
      displayModules('Could not find', _.pluck(errors, 'message'));
    });
  });
});
