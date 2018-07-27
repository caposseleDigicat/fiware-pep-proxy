# How to use this Dockerfile

To run a Wima Plus Docker container you have two options: 

- You can build your own image using the Dockerfile we provide and then run the container from it or
- you can run the container directly from the image we provide in Docker Hub.

Both options require that you have [docker](https://docs.docker.com/installation/) installed on your machine.

## Build your own image and run the container from it

You have to download the [Wilma Plus's code](https://github.com/caposseleDigicat/fiware-pep-proxy) from GitHub and navigate to `extras/docker` directory. There, to compile your own image just run:

	sudo docker build -t pep-proxy-image .


> **Note**
> If you do not want to have to use `sudo` in this or in the next section follow [these instructions](https://docs.docker.com/installation/ubuntulinux/#create-a-docker-group).

This builds a new Docker image following the steps in `Dockerfile` and saves it in your local Docker repository with the name `pep-proxy-image`. You can check the available images in your local repository using: 

	sudo docker images


> **Note**
> If you want to know more about images and the building process you can find it in [Docker's documentation](https://docs.docker.com/userguide/dockerimages/).

Now you can run a new container from the image you have just created by using docker-compose. A `docker-compose.yml` should look like as the dollowing one: 

```
version: '3'
services:
    mongo:
        image: mongo:3.2
        restart: always
        ports:
            - 27117:27017
        networks:
            main:
        volumes:
            - ./mongo-data:/data/db
    pep:
        image: angelocapossele/pep-proxy-accounting:latest
        restart: always
        links:
            - mongo
        volumes:
            - ./config.js:/opt/fiware-pep-proxy/config.js
        ports:
            - 7000:7000
        networks:
            main:
                aliases:
                    - pep.docker

networks:
    main:
        external: true
```

Once you have created the file, run the following command ::

    $ docker-compose up

Then, the PEP Proxy - Wilma Plus should be up and running in `http://localhost:7000/`

Once the containers are running, you can stop them using ::

    $ docker-compose stop

And start them again using ::

    $ docker-compose start

Additionally, you can terminate the different containers by executing ::

    $ docker-compose down

## Run the container from the last release in Docker Hub

You can also run the container from the [image we provide](https://hub.docker.com/r/angelocapossele/pep-proxy-accounting/) in Docker Hub. In this case you have only to execute the docker-compose command. But now the image name is angelocapossele/pep-proxy-accounting:*version* where `version` is the release you want to use.

> **Note**
> If you do not specify a version you are pulling from `latest` by default