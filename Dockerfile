FROM appium/appium

LABEL maintainer = 'Dimitrije Dragasevic<dimitrije.dragasevic@united.cloud>'

RUN curl -sL https://deb.nodesource.com/setup_11.x  | bash -
RUN apt-get -y install nodejs openssh-client git
RUN apt-get -y install git
RUN echo node -v

#add credentials on build
RUN mkdir /root/.ssh/
COPY id_rsa /root/.ssh/id_rsa

#start ssh agent
CMD ssh-agent -s
RUN chmod 500 /root/.ssh/id_rsa
RUN sleep 10

CMD ssh-add /root/.ssh/id_rsa
#Add a SSH fingerprint and download tests
RUN touch /root/.ssh/known_hosts
RUN ssh-keyscan gitlab.united.cloud >> /root/.ssh/known_hosts
RUN git clone -b develop git@gitlab.united.cloud:uc-qa/eon_box_cucumber_tests.git
WORKDIR /root/eon_box_cucumber_tests
RUN npm install
RUN npm install -g appium

#Set up apk and test run
WORKDIR /root/
RUN mkdir testApk
COPY ./*.apk /root/testApk/
WORKDIR /root/eon_box_cucumber_tests

ARG ip=192.168.48.15
ARG feature=features/
ARG apk=test.apk
ARG tag=sanity

#Run time arguments with there default parameters
ENV ip_address=${ip}
ENV featureFile=${feature}
ENV apk_name=${apk}
ENV tags=${tag}

ENTRYPOINT ["sh", "-c", "./run.sh"]