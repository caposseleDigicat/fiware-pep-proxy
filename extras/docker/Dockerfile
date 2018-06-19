FROM ubuntu:18.04

WORKDIR /opt

# Install Ubuntu dependencies
RUN apt-get update && \
	apt-get install sudo make g++ curl git gnupg -y

# Install PPA
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

# Install nodejs
RUN apt-get update && \
 	apt-get install nodejs -y

ENV VERSION 1
ENV VERSION master
# Download latest version of the code and install npm dependencies
RUN git clone https://github.com/caposseleDigicat/fiware-pep-proxy.git && \
	cd fiware-pep-proxy && \
	git checkout $VERSION && \
	npm install

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy
CMD ["sudo", "node", "server.js"]
