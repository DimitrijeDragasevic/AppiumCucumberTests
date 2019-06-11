#!/bin/bash
# $1 = box ip address
# $2 = the second global variable is used for declaring what tests are to be run
# $3 = the third variable is used for telling it which apk tu run
# $4 = the fourth one is to select which suite to run (sanity,acceptance or custom)
set -e
adb connect $ip_address:5555
sleep 8
appium&
sleep 5
./node_modules/.bin/cucumber-js $featureFile \
    --world-parameters "{\"applicationLocation\": \"/root/testApk/$apk_name\"}" \
    --tags "@all_env or @$tags"