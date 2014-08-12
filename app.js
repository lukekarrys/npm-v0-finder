var domify = require('domify');
var request = require('reqwest');
var qs = require('qs');
var _ = require('underscore');
var async = require('async');
var domready = require('domready');

var user = (window.location.hash || '#').slice(1) || '';
var url = 'http://www.corsproxy.com/registry.npmjs.org/';
var userUrl = url + '-/_view/browseAuthors';
var params = {
  group_level: 3,
  startkey: '["' + user + '"]',
  endkey: '["' + user + '",{}]',
  skip: '0',
  limit: '1000',
  stale: 'update_after'
};

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
  return obj && obj.version && obj.version.slice(1) !== '0';
}


var errorModules = [];
function reqModule(module, cb) {
  console.log('requesting', module);
  request({
    url: url + module,
    success: function (resp) {
      console.log('found', module, resp['dist-tags'].latest);
      appendS('.');
      cb(null, {
        name: module,
        version: resp['dist-tags'].latest
      });
    },
    error: function () {
      if (!_.contains(errorModules, module)) {
        // Retry once
        errorModules.push(module);
        console.log('retry', module);
        reqModule(module, cb);
      } else {
        console.error('error fetching', module);
        cb(null, new Error(module));
      }
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
  request({
    url: userUrl + '?' + qs.stringify(params),
    success: function (respText) {
      var resp;
      var rows;
      var modules;
      
      try {
        resp = JSON.parse(respText);
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

      console.log(modules.length);
      console.log(modules.join(','));

      // Fetch all module versions
      async.mapLimit(modules, 2, reqModule, function (err, results) {
        var errors = _.filter(results, isError);
        var dividedModules = _.partition(_.reject(results, isError), isStable);
        var v0 = dividedModules[1] || [];

        displayModules('0.x.y', v0, user + ' has no 0.x.y modules! Woo!');
        displayModules('Could not find', _.pluck(errors, 'message'));
      });
    },
    error: function () {
      appendP('Could not find user ' + user);
    }
  });
});
