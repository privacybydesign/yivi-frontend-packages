#!/bin/bash

echo "Preparing yivi-popup for release"

version=`echo "console.log(require('./yivi-core/package.json').version);" | node`

read -p "We are going to use $version as version number. Is this okay? (y/n) "

if [[ $REPLY =~ ^[Yy]$ ]]
then
  set -Eux -o pipefail -o functrace
  trap 'echo "ATTENTION: the last command had a non-zero exit status"; if [ "$BASH_COMMAND" != "npm audit fix" ]; then exit 1; fi' ERR

  root=`pwd`
  cd ./plugins/yivi-popup
  rm -rf ./node_modules ./dist

  npm install
  dependencies=`npm ls --parseable | grep -o '@privacybydesign/.*'`
  for package in ${dependencies[@]}; do
    eval "npm install $package@$version --save-prod"
  done

  npm audit fix
  npm update
  eval "npm version $version --no-git-tag-version"
  # Make sure dev dependencies are not included to prevent artifact pollution
  rm -rf ./node_modules
  npm install --only=prod

  cd $root
  set +x

  echo ""
  echo "Preparing yivi-popup for release done."
  echo "Please check whether all output satisfies you."
  echo "If you are happy, you can run 'cd ./plugins/yivi-popup && npm publish --access public'"
fi
