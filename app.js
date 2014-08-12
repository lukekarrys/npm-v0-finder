var domify = require('domify');
var request = require('reqwest');
var qs = require('qs');
var _ = require('underscore');
var async = require('async');

var user = (window.location.hash || '#lukekarrys').slice(1);
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

function displayModules(head, modules) {
  if (modules.length === 0) {
    return;
  }
  append('<h2>' + head + '</h2>');
  modules.forEach(function (module) {
    appendModule(module);
  });
}

function isError(err) {
  return err instanceof Error;
}

function isStable(obj) {
  return obj && obj.version && obj.version.slice(1) !== '0';
}

// Start
appendP('Fetching modules');

// Fetch all user modules
request(userUrl + '?' + qs.stringify(params), function (respText) {
  var resp;
  var rows;
  var modules;
  
  try {
    resp = JSON.parse(respText);
    rows = resp.rows || [];
    appendP('Fetched ' + rows.length + ' modules');
  } catch (e) {
    appendP('Found no modules');
    return;
  }
  
  // Get names of all modules
  modules = _.compact(rows.map(function (row) {
    return row.key && row.key[1];
  }));
  
  // Fetch all module versions
  async.mapLimit(modules, 3, function (module, cb) {
    appendS('.');
    request({
      url: url + module,
      success: function (resp) {
        cb(null, {
          name: module,
          version: resp['dist-tags'].latest
        });
      },
      error: function () {
        cb(null, new Error(module));
      }
     });
  }, function (err, results) {
    var errors = _.filter(results, isError);
    var dividedModules = _.partition(_.reject(results, isError), isStable);
    //var v1 = dividedModules[0] || [];
    var v0 = dividedModules[1] || [];

    displayModules('0.x.y', v0);
    // displayModules('>=1.x.y', v1);
    displayModules('Could not find', _.pluck(errors, 'message'));
  });
});