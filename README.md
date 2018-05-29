#PEP Proxy - Wilma Plus

[![License badge](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Documentation badge](https://img.shields.io/badge/docs-stable-brightgreen.svg?style=flat)](http://fiware-pep-proxy.readthedocs.org/en/stable/)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/pep-proxy.svg)](https://hub.docker.com/r/fiware/pep-proxy/)
[![Support badge]( https://img.shields.io/badge/support-sof-yellowgreen.svg)](http://stackoverflow.com/questions/tagged/fiware)

+ [Introduction](#def-introduction)
+ [How to Build & Install](#def-build)
    - [Docker](#def-docker)
+ [API Overview](#def-api)
+ [Advanced documentation](#def-advanced)
+ [License](#def-license)

---


<br>

<a name="def-introduction"></a>
## Introduction

This project is part of [FIWARE](http://fiware.org). You will find more information about this FIWARE GE [here](http://catalogue.fiware.org/enablers/pep-proxy-wilma).

- You will find the source code of this project in GitHub [here](https://github.com/ging/fiware-pep-proxy)

Thanks to this component and together with Identity Management and, optionally, with Authorization PDP GEs, you will add authentication and authorization security to your backend applications. Thus, only FIWARE users will be able to access your GEs or REST services. But you will be able also to manage specific permissions and policies to your resources allowing different access levels to your users.

<a name="def-build"></a>
## How to Build & Install

<a name="def-docker"></a>
### Docker

We provide a Docker image to facilitate you the building of this GE.

- [Here](https://github.com/ging/fiware-pep-proxy/tree/master/extras/docker) you will find the Dockerfile and Docker-compose explaining how to use it.
- In [Docker Hub](https://hub.docker.com/r/fiware/pep-proxy/) you will find the public image.

<a name="def-api"></a>
## API Overview

Requests to proxy should be made with a special HTTP Header: X-Auth-Token. 
This header contains the OAuth access token obtained from FIWARE IDM GE.

Example of request:

<pre>
GET / HTTP/1.1
Host: proxy_host
X-Auth-Token:z2zXk...ANOXvZrmvxvSg
</pre>

To test the proxy you can generate this request running the following command:

<pre>
curl --header "X-Auth-Token:z2zXk...ANOXvZrmvxvSg" http://proxy_host
</pre>

Once authenticated, the forwarded request will include additional HTTP headers with user info:

<pre>
X-Nick-Name: nickname of the user in IdM
X-Display-Name: display name of user in IdM
X-Roles: roles of the user in IdM
X-Organizations: organizations in IdM
</pre>

<a name="def-policies"></a>
## Policies

When enabling the RBAC feature, PEP checks permissions of NGSIv2 requests with a Role Based Access Control. Roles are structured as a set of attributes and have to
be provided according to the following scheme:

```
fiware-service|operation|entityType|entityID|attribute
```

The following list provides some examples:

* `|GET|AirQualityObserved||`: will grant `GET` permission for each entity of type `AirQualityObserved`
* `tenantRZ1|GET|AirQualityObserved||`: will grant `GET` permission for each entity of type `AirQualityObserved` under the Fiware-Service `tenantRZ1`
* `tenantRZ1|GET|AirQualityObserved|sensor_1|`: will grant `GET` permission for `sensor_1` entity of type `AirQualityObserved` under the Fiware-Service `tenantRZ1`
* `tenantRZ1|GET|AirQualityObserved|sensor_1|temperature`: will grant `GET` permission for the attribute `temperature` of `sensor_1` entity of type `AirQualityObserved` under the Fiware-Service `tenantRZ1`


<a name="def-advanced"></a>
## Advanced Documentation

- [How to run tests](http://fiware-pep-proxy.readthedocs.org/en/latest/admin_guide#end-to-end-testing)
- [User & Programmers Manual](http://fiware-pep-proxy.readthedocs.org/en/latest/user_guide/)
- [Installation & Administration Guide](http://fiware-pep-proxy.readthedocs.org/en/latest/admin_guide/)

<a name="def-license"></a>
## License

The MIT License

Copyright (C) 2012 Universidad Politécnica de Madrid.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

