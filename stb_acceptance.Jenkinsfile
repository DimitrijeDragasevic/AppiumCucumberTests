properties([
        parameters([
                string(defaultValue: '192.168.48.77', description: '', name: 'device_ip', trim: false),
                string(defaultValue: '', description: 'nexusLink', name: 'nexus_link', trim: false),
                choice(name:'feature_file', choices:['features', 'features/home_page', 'features/channels_page', 'features/my_library', 'features/onDemand_page', 'features/player_page', 'features/settings_page', 'features/endurance.feature']),
                string(defaultValue: 'develop', description:'', name: 'branch_name', trim: false),
                string(defaultValue: '', description: 'suiteTag', name: 'tag', trim: false)
        ])
])

def nexusLinkDownload() {
        if(fileExists('$WORKSPACE/Artifacts/stb-app')){
        sh'''
        rm -rf $WORKSPACE/Artifacts/stb-app
        '''
        }
        sh"""
        ls -a
        curl -u asset-uploader:me5Ksb7uwBz8JaYK9rqXXSqHSNQ4gxPA ${params.nexus_link} -o stb-app.zip
        unzip -o stb-app.zip
        pwd
        """
}

node('int-dev') {
        try {
                nvm('v11.5.0'){
                        adb = sh(returnStdout: true, script: 'which adb').trim()
                        stage('Download apk and connect to provided ip') {
                                dir('Artifacts') {
                                echo 'Downloading application'
                                nexusLinkDownload()
                                sh"""
                                ${adb} connect ${params.device_ip}:5555
                                ${adb} install -r -d $WORKSPACE/Artifacts/app-stbKaon-prod-debug.apk &
                                """
                                currentBuild.result = 'SUCCESS'
                        }
                }
        
                        stage('Appium setup and test run') {
                                
                                echo 'Chekout project'
                                git branch: params.branch_name, credentialsId: 'uc-gitlab', url: 'git@gitlab.united.cloud:uc-qa/eon_box_cucumber_tests.git'
                                sh'''
                                npm i appium
                                ./node_modules/.bin/appium &
                                sleep 5s
                                '''
                                sh"""
                                npm i
                                chmod +x localRun.sh
                                ./localRun.sh ${params.feature_file} $WORKSPACE/Artifacts/app-stbKaon-prod-debug.apk ${params.tag}
                                """
                                currentBuild.result = 'SUCCESS'
                        }

                        stage('Clean up'){
                                sh"""
                                ${adb} kill-server
                                """
                        }
                }
        }
        catch (Exception e) {
                println("Exception raised: " + e.getMessage())
                currentBuild.result = "FAILURE"
        }

        finally{
                if("${currentBuild.result}" == "SUCCESS") {
                        slackSend channel: '#uc-qa-alerts', color: 'good', message: "Acceptance tests have passed for the following application ${params.nexus_link}", tokenCredentialId: 'SlackToken'
                }
                else {
                        slackSend channel: '#uc-qa-alerts', color: '#FF0000', message: "Acceptance tests have failed see the pipelines console output for the error : https://jenkins.united.cloud/job/uc-qa-stb-acceptance-tests/", tokenCredentialId: 'SlackToken'
                }

        }

}
