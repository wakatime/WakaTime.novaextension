exports.activate = function () {
  log.debug('Initializing version ' + nova.extension.version);
  checkCli(() => {
    checkApiKey(() => {
      setupEventListeners(() => {
        log.debug('Finished initializing WakaTime extension.');
      });
    });
  });
};

exports.deactivate = function () {
  log.debug('wakatime de-activated');
};

nova.commands.register('wakatime.dashboard', () => {
  openDashboardWebsite();
});

nova.commands.register('wakatime.apikey', () => {
  promptForApiKey();
});

nova.commands.register('wakatime.debug', () => {
  promptForDebugMode();
});

function setupEventListeners(callback) {
  nova.workspace.onDidAddTextEditor(editor => {
    if (!editor) return;
    editor.onDidStopChanging(onEvent);
    editor.onDidChangeSelection(onEvent);
    editor.onDidSave(e => onEvent(e, true));
  });
  callback();
}

function openDashboardWebsite() {
  nova.openURL('https://wakatime.com/dashboard');
}

function promptForApiKey(callback) {
  const apiKey = getApiKey();
  const options = {
    label: 'API Key',
    placeHolder: 'Find your api key from https://wakatime.com/api-key',
    value: apiKey,
    prompt: 'Save',
    secure: false,
  };
  nova.workspace.showInputPanel('', options, val => {
    if (isValidApiKey(val)) setSetting('settings', 'api_key', val);
    if (callback) callback();
  });
}

function promptForDebugMode(callback) {
  const debug = isDebugEnabled();
  const options = {
    placeholder: 'Debug mode currently ' + (debug ? 'enabled' : 'disabled'),
  };
  const choices = ['enable', 'disable'];
  nova.workspace.showChoicePalette(choices, options, val => {
    if (!choices.includes(val)) return;
    setSetting('settings', 'debug', val == 'enable' ? 'true' : 'false');
    cacheDebug = val == 'enable';
    if (callback) callback();
  });
}

const s3Prefix = 'https://wakatime-cli.s3-us-west-2.amazonaws.com/mac-x86-64/';

function checkCli(callback) {
  cliUpToDate(upToDate => {
    if (upToDate) {
      callback();
    } else {
      downloadCli(callback);
    }
  });
}

function checkApiKey(callback) {
  if (hasApiKey()) {
    callback();
  } else {
    promptForApiKey(callback);
  }
}

function downloadCli(callback) {
  const url = s3Prefix + 'wakatime-cli.zip';
  log.debug('Downloading wakatime-cli from ' + url);
  if (!nova.fs.access(resourcesFolder(), nova.fs.X_OK)) nova.fs.mkdir(resourcesFolder());
  fetch(url)
    .then(response => response.arrayBuffer())
    .then(buffer => {
      const folder = resourcesFolder();
      const zipFile = folder + '/wakatime-cli.zip';
      const zip = nova.fs.open(zipFile, 'wb');
      zip.write(buffer);
      zip.close();
      unzip(zipFile, folder, () => {
        nova.fs.remove(zipFile);
        callback();
      });
    })
    .catch(error => {
      log.error(error);
      callback();
    });
}

function unzip(zipFile, intoFolder, callback) {
  const options = { args: [zipFile, '-d', intoFolder] };
  var process = new Process('/usr/bin/unzip', options);
  var stderr = [];
  process.onStderr(function (line) {
    stderr.push(line);
  });
  process.onDidExit(exitCode => {
    if (stderr.length > 0) {
      log.error('Failed to extract wakatime-cli.zip with error: ' + stderr.join('\n'));
    }
    callback();
  });
  process.start();
}

function cliExists() {
  return nova.fs.access(cliPath(), nova.fs.X_OK);
}

function cliUpToDate(callback) {
  if (!cliExists()) {
    callback(false);
    return;
  }

  const url = s3Prefix + 'current_version.txt';
  fetch(url)
    .then(response => response.text())
    .then(latestVersion => {
      const options = { args: ['--version'] };
      var process = new Process(cliPath(), options);
      var stderr = [];
      var stdout = [];
      process.onStderr(function (line) {
        stderr.push(line);
      });
      process.onStdout(function (line) {
        stdout.push(line);
      });
      process.onDidExit(exitCode => {
        if (stderr.length > 0) {
          log.error('Failed to check local wakatime-cli version with error: ' + stderr.join('\n'));
        }
        const localVersion = stdout.join('\n').trim();
        if (localVersion != latestVersion) {
          log.debug('Found new wakatime-cli version: ' + latestVersion);
        }
        callback(localVersion == latestVersion);
      });
      process.start();
    })
    .catch(error => {
      log.error(error);
      callback(true);
    });
}

function hasApiKey() {
  return !!getApiKey();
}

function isValidApiKey(key) {
  if (!key) return false;
  const re = new RegExp(
    '^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$',
    'i',
  );
  if (!re.test(key)) return false;
  return true;
}

function resourcesFolder() {
  return nova.path.expanduser('~/.wakatime');
}

function cliPath() {
  return resourcesFolder() + '/wakatime-cli/wakatime-cli';
}

function getSetting(section, key) {
  const config = nova.fs.open(getConfigFile(), 'r', 'utf-8');
  const lines = config.readlines();
  let currentSection = '';
  for (var i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (startsWith(line.trim(), '[') && endsWith(line.trim(), ']')) {
      currentSection = line
        .trim()
        .substring(1, line.trim().length - 1)
        .toLowerCase();
    } else if (currentSection === section) {
      let parts = line.split('=');
      const currentKey = parts[0].trim();
      if (currentKey === key && parts.length > 1) {
        config.close();
        return parts[1].trim();
      }
    }
  }

  config.close();
  return '';
}

function setSetting(section, key, val) {
  const config = nova.fs.open(getConfigFile(), 'r', 'utf-8');
  const lines = config.readlines();

  let contents = [];
  let currentSection = '';

  let found = false;
  for (var i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (startsWith(line.trim(), '[') && endsWith(line.trim(), ']')) {
      if (currentSection === section && !found) {
        contents.push(key + ' = ' + val);
        found = true;
      }
      currentSection = line
        .trim()
        .substring(1, line.trim().length - 1)
        .toLowerCase();
      contents.push(line.rtrim());
    } else if (currentSection === section) {
      const parts = line.split('=');
      const currentKey = parts[0].trim();
      if (currentKey === key) {
        if (!found) {
          contents.push(key + ' = ' + val);
          found = true;
        }
      } else {
        contents.push(line.rtrim());
      }
    } else {
      contents.push(line.rtrim());
    }
  }

  if (!found) {
    if (currentSection !== section) {
      contents.push('[' + section + ']');
    }
    contents.push(key + ' = ' + val);
  }

  const out = nova.fs.open(getConfigFile(), 'wx', 'utf-8');
  out.write(contents.join('\n'));
  out.close();
}

function getConfigFile() {
  return nova.path.expanduser('~/.wakatime.cfg');
}

function getApiKey() {
  const key = getSetting('settings', 'api_key');
  if (isValidApiKey(key)) return key;
  return '';
}

let cacheDebug = undefined;

function isDebugEnabled() {
  if (cacheDebug === undefined) cacheDebug = getSetting('settings', 'debug') == 'true';
  return cacheDebug;
}

function startsWith(outer, inner) {
  return outer.slice(0, inner.length) === inner;
}

function endsWith(outer, inner) {
  return inner === '' || outer.slice(-inner.length) === inner;
}

let lastHeartbeat = 0;
let lastFile = '';

function enoughTimePassed(time) {
  return lastHeartbeat + 120000 < time;
}

function onEvent(editor, isWrite) {
  if (!editor) return;

  let doc = editor.document;
  if (!doc) return;
  if (doc.isEmpty) return;

  let file = doc.path;
  if (!file) return;

  let time = Date.now();
  if (isWrite || enoughTimePassed(time) || lastFile !== file) {
    sendHeartbeat(file, isWrite);
    lastFile = file;
    lastHeartbeat = time;
  }
}

function sendHeartbeat(file, isWrite) {
  const user_agent = 'nova/' + nova.versionString + ' nova-wakatime/' + nova.extension.version;
  let args = ['--file', file.quote(), '--plugin', user_agent.quote()];
  if (isWrite) args.push('--write');
  const binary = cliPath();

  log.debug('Sending heartbeat:\n' + formatArguments(binary, args));

  const options = { args: args };
  var process = new Process(binary, options);
  var stderr = [];
  var stdout = [];
  process.onStderr(function (line) {
    stderr.push(line);
  });
  process.onStdout(function (line) {
    stdout.push(line);
  });
  process.onDidExit(exitCode => {
    if (exitCode == 0) {
      let today = new Date();
      log.debug('Last heartbeat sent ' + formatDate(today));
    } else {
      if (stderr.length > 0) log.error(stderr.join('\n'));
      if (stdout.length > 0) log.error(stdout.join('\n'));
      if (exitCode == 102) {
        log.warn('Api eror (102); Check your ~/.wakatime.log file for more details.');
      } else if (exitCode == 103) {
        log.error('Config parsing error (103); Check your ~/.wakatime.log file for more details.');
      } else if (exitCode == 104) {
        log.error(
          'Invalid Api Key (104); Make sure your API Key matches https://wakatime.com/api-key.',
        );
      } else {
        log.error(
          'Unknown Error (' +
            exitCode.toString() +
            '); Check your ~/.wakatime.log file for more details.',
        );
      }
    }
  });
  process.start();
}

function formatArguments(binary, args) {
  let clone = args.slice(0);
  clone.unshift(binary.quote());
  let newCmds = [];
  let lastCmd = '';
  for (let i = 0; i < clone.length; i++) {
    if (lastCmd == '--key') newCmds.push(obfuscateKey(clone[i]).quote());
    else newCmds.push(clone[i].quote());
    lastCmd = clone[i];
  }
  return newCmds.join(' ');
}

function obfuscateKey(key) {
  let newKey = '';
  if (key) {
    newKey = key;
    if (key.length > 4) newKey = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX' + key.substring(key.length - 4);
  }
  return newKey;
}

function formatDate(date) {
  let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let ampm = 'AM';
  let hour = date.getHours();
  if (hour > 11) {
    ampm = 'PM';
    hour = hour - 12;
  }
  if (hour == 0) {
    hour = 12;
  }
  let minute = date.getMinutes();
  return (
    months[date.getMonth()] +
    ' ' +
    date.getDate() +
    ', ' +
    date.getFullYear() +
    ' ' +
    hour +
    ':' +
    (minute < 10 ? '0' + minute : minute) +
    ' ' +
    ampm
  );
}

const log = {
  info: function (msg) {
    console.log('[WakaTime] [INFO] ' + msg);
  },
  debug: function (msg) {
    if (!isDebugEnabled()) return;
    console.log('[WakaTime] [DEBUG] ' + msg);
  },
  error: function (msg) {
    console.error('[WakaTime] [ERROR] ' + msg);
  },
  warn: function (msg) {
    console.warn('[WakaTime] [WARN] ' + msg);
  },
};

if (typeof String.prototype.trim === 'undefined') {
  String.prototype.trim = function () {
    return String(this).replace(/^\s+|\s+$/g, '');
  };
}

if (typeof String.prototype.rtrim === 'undefined') {
  String.prototype.rtrim = function () {
    return String(this).replace(/\s+$/g, '');
  };
}

if (typeof String.prototype.quote === 'undefined') {
  String.prototype.quote = function () {
    const str = String(this);
    if (str.includes(' ')) return '"' + str.replace('"', '\\"') + '"';
    return str;
  };
}
