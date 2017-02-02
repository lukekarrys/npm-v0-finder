var domify = require('domify')
var xhr = require('xhr')
var _ = require('underscore')
var qs = require('query-string')
var domready = require('domready')
var logger = require('andlog')

var user = _.escape((window.location.hash || '#').slice(1) || '')

function append (str) {
  document.body.appendChild(domify(str))
}

function appendP (str) {
  append('<p>' + str + '</p>')
}

function appendModule (m) {
  appendP(m.package.name + '@' + '<strong>' + m.package.version + '</strong>')
}

function displayModules (head, modules, msg) {
  if (modules.length === 0 && !msg) {
    return
  }
  append('<h2>' + head + '</h2>')
  if (modules.length === 0) {
    appendP(msg)
  } else {
    modules.forEach(function (module) {
      appendModule(module)
    })
  }
}

function isStable (m) {
  return m.package.version.slice(0, 1) !== '0'
}

function fetchUserUrl (user, size, offset) {
  return 'http://registry.npmjs.com/-/v1/search?text=maintainer:' + user + '&' + qs.stringify({ size: size, from: offset })
}

function fetchUser (user, found, cb) {
  var size = 250
  xhr(fetchUserUrl(user, size, found.length), function (err, __, body) {
    if (err) return cb(err)
    body = JSON.parse(body)
    logger.log('Found', body.objects.length)
    logger.log('First', body.objects[0].package.name)
    logger.log('Last', body.objects[body.objects.length - 1].package.name)
    found = found.concat(body.objects)
    if (found.length < body.total) {
      fetchUser(user, found, cb)
    } else {
      cb(null, found)
    }
  })
}

window.goToUser = function goToUser () {
  var username = document.getElementById('username')
  var value = username && username.value
  if (value) {
    window.location.href = '#' + value
    window.location.reload()
  }
}

domready(function () {
  append('<h1>Find all 0.x.y modules for a user!</h1>')

  append([
    '<div><input id="username" placeholder="npm username" value="' + user + '">',
    '<a href="javascript:void(0)" onclick="goToUser()">Find modules</a></div>'
  ].join(''))

  if (!user) {
    return
  }

  // Start
  appendP('Fetching modules for ' + user)

  // Fetch all user modules
  fetchUser(user, [],
  function (err, modules) {
    if (err) {
      logger.log(err)
      return appendP('Error finding user' + user)
    }

    if (modules.length === 0) {
      appendP('Found no modules')
      return
    }

    logger.log(modules.length)
    modules.forEach(function (m) { logger.log(m.package) })

    var dividedModules = _.partition(modules, isStable)
    var v0 = dividedModules[1] || []

    displayModules(v0.length + ' modules @ 0.x.y', v0, user + ' has no 0.x.y modules! Woo!')
  })
})
