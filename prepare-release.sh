#!/bin/bash

if [ "$1" == "" ]; then
    echo "Expected usage:"
    echo "./prepare-release.sh <version>"
    echo "Example: ./prepare-release.sh 1.0.0-beta.1"
    exit 1
fi

set -Eux -o pipefail -o functrace
trap 'echo "ATTENTION: the last command had a non-zero exit status"; if [ "$BASH_COMMAND" != "npm audit fix" ]; then exit 1; fi' ERR

new_version="$1"
set +x
echo "Preparing release '$new_version'"
set -x

# Find all package.json files in subdirectories, except node_modules and examples
all_packages=`find . -mindepth 2 -name "package.json" -not -path "*/node_modules/*" -not -path "*/examples/*"`

# Standalone packages exclude yivi-popup and yivi-frontend (they have their own prepare scripts)
standalone_packages=`find . -mindepth 2 -name "package.json" -not -path "*/node_modules/*" -not -path "*/examples/*" -not -path "*/yivi-popup/*" -not -path "*/yivi-frontend/*"`

root=`pwd`

# First pass: bump ALL versions and cross-references at once.
# This avoids npm install side effects that break peer dependencies mid-bump.
for package in ${all_packages[@]}; do
  node -e "
    var fs = require('fs');
    var json = JSON.parse(fs.readFileSync('$package', 'utf8'));
    json.version = '$new_version';
    ['dependencies', 'peerDependencies', 'devDependencies'].forEach(function(depType) {
      if (!json[depType]) return;
      Object.keys(json[depType]).forEach(function(name) {
        if (name.startsWith('@privacybydesign/')) {
          json[depType][name] = '^$new_version';
        }
      });
    });
    fs.writeFileSync('$package', JSON.stringify(json, null, 2) + '\n');
  "
  set +x
  echo "Bumped $package to $new_version"
  set -x
done

# Second pass: install, build, and clean standalone packages only
for package in ${standalone_packages[@]}; do
  dirname=`dirname $package`
  cd $dirname
  set +x
  echo "Preparing $dirname for release"
  set -x
  rm -rf ./node_modules ./dist
  npm install
  npm audit fix
  npm update
  npm run clean --if-present
  npm run release --if-present
  # Make sure dev dependencies are not included to prevent artifact pollution
  rm -rf ./node_modules
  npm install --only=prod
  cd $root
done

set +x

echo ""
echo "Preparing for release done."
echo "Please check whether all output satisfies you."
echo "If you are happy, you can run ./release.sh"
