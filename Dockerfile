#FROM ubuntu:18.04
FROM node:8.11.3-alpine
RUN apk add --no-cache --virtual .gyp \
		python \
        make \
        g++

WORKDIR /opt

# Install Ubuntu dependencies
# RUN apt-get update && \
# 	apt-get install sudo make g++ curl gnupg -y

# # Install PPA
# RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

# # Install nodejs
# RUN apt-get update && \
#  	apt-get install nodejs -y

# Download latest version of the code and install npm dependencies
RUN mkdir fiware-pep-proxy
COPY / ./fiware-pep-proxy/
WORKDIR /opt/fiware-pep-proxy
RUN	npm install
RUN ls
RUN apk del .gyp
# Run PEP Proxy
#WORKDIR /opt/fiware-pep-proxy
CMD ["node", "server.js"]
