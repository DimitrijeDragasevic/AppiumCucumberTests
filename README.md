# README #

Acceptance tests 
for the STB application.

### Prerequisites ###
1. Latest stable version of [Node.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/get-npm) 
2. [Appium](http://appium.io/) for mac, win or linux
3. [Appium doctor](https://www.npmjs.com/package/appium-doctor) 
4. Debug firmware on the STB
5. Debug version of the application on the STB and your PC
6. WebView installed/updated on the STB

### Set up using Docker
1. When you cloned the repository you have in your root directory a DockerFile
2. You need to download [Docker](https://www.docker.com/get-started) for your platform
3. In the root of the project you need to add your private ssh key (make a file named id_rsa and pase your key there) which will be ignored by the .gitignore file
4. And you need to add the apk that you want to run tests on in the root of the project
5. run the following command in the terminal in the root of the project ```docker build .```
6. After the docker has finished building the container you should get a hash at the end that looks like this ```89666ee193f4```
7. Then you should run the command ```docker run [previus hash]  exp. docker run 89666ee193f4```
8. Your done! The tests should be up and running
  
### How to set up and run tests manually ###
1. Firstly you need to set up appium , by runing ```appium-doctor``` in the terminal(git bash on windows, regular or Oh MY Zsh on mac and native terminal on linux) you can see if you appium is set up correctly
3. Then navigate to your android adb installation and run ```./adb connect [device ip] => exp. ./adb connect 192.168.48.2``` 
3. Open the repository and run ``` npm install```
4. Then you need to create a file called appLocation.js in the config folder, with the following code snippet 
```
const appLocation = 'PATH/TO/FILE.apk'
module.exports.appLocation = appLocation
```

 After the npm completes installing you can run the tests using cucumber:

Run all tests from project root
 > ```./run.sh```

If you want to run a specific scenario you can run something like this:
>```./run.sh features/home_page.feature:[number of the line in which the scenario is placed] => exp. ./run.sh features/home_page.feature:22```

If you want you can pass the second argument to run.sh to tell the framework where your apk is, if you dont pass it it will have the framework default above (appLocation)
>``` ./run.sh features/home_page.feature /path/to/apk```

If you are unable to run ```./run.sh``` make sure that the file is executable if its not that type in the terminal  ``` chmod +x run.sh```
       
### Who do I talk to about this framework ###

* Dimitrije Dragasevic (dimitrije.dragasevic@united.cloud)

### References ###

* [Cucumber JS](https://github.com/cucumber/cucumber-js)
Cucumber for JavaScript.

* [Webdriver IO](http://v4.webdriver.io/)
Better version of the webdriver