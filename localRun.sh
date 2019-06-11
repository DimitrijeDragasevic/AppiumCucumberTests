#!/bin/bash
# $1 = the first global variable is used for declaring what tests are to be run
# $2 = the second variable is used for telling it which apk tu run (this exists exclusively for the jenkins pipeline)
# $3 = the third one is to select which suite to run (sanity,acceptance or custom)

./node_modules/.bin/cucumber-js "$1" \
    --world-parameters "{\"applicationLocation\": \"$2\"}" \
    --tags "@all_env or @$3" \
    ${@:3} \
    -f node_modules/cucumber-pretty
