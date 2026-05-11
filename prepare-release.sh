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
        // Drop self-references; otherwise update internal package versions in lockstep.
        if (name === json.name) {
          delete json[depType][name];
          return;
        }
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

# Second pass: install dependencies and build all standalone packages.
# This must happen before stripping devDependencies, because all packages
# share the root node_modules (workspace hoisting) and removing devDependencies
# from one package would break the build tools (e.g. tsdown) for the next.
npm install
for package in ${standalone_packages[@]}; do
  dirname=`dirname $package`
  cd $dirname
  set +x
  echo "Building $dirname"
  set -x
  rm -rf ./dist
  npm run clean --if-present
  npm run release --if-present
  cd $root
done

# Third pass: strip devDependencies from standalone packages for clean publish artifacts.
for package in ${standalone_packages[@]}; do
  dirname=`dirname $package`
  cd $dirname
  set +x
  echo "Cleaning $dirname for publish"
  set -x
  rm -rf ./node_modules
  npm install --omit=dev
  cd $root
done

set +x

echo ""
echo "Preparing for release done."
echo "Please check whether all output satisfies you."
echo "If you are happy, you can run ./release.sh"
