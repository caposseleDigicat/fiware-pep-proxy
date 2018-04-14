FROM ubuntu:14.04

WORKDIR /opt

# Install Ubuntu dependencies
RUN sudo apt-get update && \
	sudo apt-get install curl git build-essential -y
	#sudo apt-get install make g++ software-properties-common python-software-properties -y

# Install PPA
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -

# Install nodejs
RUN sudo apt-get update && \
	sudo apt-get install nodejs -y

# Update npm
RUN sudo npm cache clean -f && \
	sudo npm install -g n && \
	sudo n stable

# Download latest version of the code and install npm dependencies
RUN git clone https://github.com/caposseleDigicat/fiware-pep-proxy.git && \
	cd fiware-pep-proxy && \
	git checkout Synchronicity-dev && \
	npm install

# Run PEP Proxy
WORKDIR /opt/fiware-pep-proxy
CMD ["sudo", "node", "server.js"]
