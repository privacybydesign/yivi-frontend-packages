#!/bin/bash

if [ "$1" == "" ]; then
    echo "Expected usage:"
    echo "./prepare-release.sh [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease [--preid=<prerelease-id>] | from-git]"
    exit 1
fi

set -Eux -o pipefail -o functrace
trap 'echo "ATTENTION: the last command had a non-zero exit status"; if [ "$BASH_COMMAND" != "npm audit fix" ]; then exit 1; fi' ERR

npm_version="$*"
set +x
echo "Preparing release '$npm_version'"
set -x

# Find all package.json files in subdirectories, except node_modules, examples, yivi-popup and yivi-frontend
standalone_packages=`find . -mindepth 2 -name "package.json" -not -path "*/node_modules/*" -not -path "*/examples/*" -not -path "*/yivi-popup/*" -not -path "*/yivi-frontend/*"`

# Loop over directories where package.json files are found and prepare for release
root=`pwd`
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
  eval "npm version $npm_version --no-git-tag-version"
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
