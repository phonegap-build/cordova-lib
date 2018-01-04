/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var Q = require('q');
var shell = require('shelljs');
var events = require('cordova-common').events;
var path = require('path');
var superspawn = require('cordova-common').superspawn;
var os = require('os');

exports.clone = clone;

//  clone_dir, if provided is the directory that git will clone into.
//  if no clone_dir is supplied, a temp directory will be created and used by git.
function clone (git_url, git_ref, clone_dir) {
    
    var needsGitCheckout = true,
        git_ref = git_ref || 'master';

    if (!shell.which('git')) {
        return Q.reject(new Error('"git" command line tool is not installed: make sure it is accessible on your PATH.'));
    }

    // If no clone_dir is specified, create a tmp dir which git will clone into.
    var tmp_dir = clone_dir;
    if (!tmp_dir) {
        tmp_dir = path.join(os.tmpdir(), 'git', String((new Date()).valueOf()));
    }
    shell.rm('-rf', tmp_dir);
    shell.mkdir('-p', tmp_dir);

    var cloneArgs       = ['clone'],
        lsRemoteArgs    = ['ls-remote', '-ht', '--exit-code', git_url, git_ref]

    return superspawn.spawn('git', lsRemoteArgs)
    .then(function() {
        needsGitCheckout = false
        cloneArgs.push('--depth=1', '-b', git_ref)
        events.emit('log', 'Using shallow clone');
    })
    .fail(function() {
        events.emit('log', 'Cloning full repository');
    })
    .then(function() { 
        cloneArgs.push(git_url, tmp_dir)
    })
    .then(function() { 
        return superspawn.spawn('git', cloneArgs)
    })
    .then(function() {
        if (needsGitCheckout){
            return superspawn.spawn('git', ['checkout', git_ref], {
                cwd: tmp_dir
            });
        }
    })
    .then(function() {
        return superspawn.spawn('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: tmp_dir
        });
    })
    .then(function(sha) {
        events.emit('log', 'Repository "' + git_url + '" checked out to git ref "' + git_ref + '" at "' + sha + '".');
        return tmp_dir;
    })
    .fail(function (err) {
        shell.rm('-rf', tmp_dir);
        return Q.reject(err);
    });
}
