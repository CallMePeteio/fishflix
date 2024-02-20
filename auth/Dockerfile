FROM node:14
WORKDIR /usr/src/app

RUN mkdir -p ./sertificates
RUN mkdir -p ./instance
RUN mkdir -p ./api

RUN mkdir -p ./website/script
RUN mkdir -p ./website/html
RUN mkdir -p ./website

COPY package*.json ./
RUN npm install


# List contents after copying
RUN ls -la ./sertificates/

# -- DB
COPY instance/auth.db ./instance/auth.db

# -- WEBSTIE 
COPY website/html/login.html ./website/html/login.html
COPY website/html/live.html ./website/html/live.html

COPY website/script/updateLive.js ./website/script/updateLive.js
COPY website/script/login.js ./website/script/login.js
COPY website/script/func.js ./website/script/func.js
COPY website/host.js ./website/host.js

# -- API
COPY api/server.js ./api
COPY api/api.js ./api

# -- .
COPY constant.js ./
COPY main.js ./

CMD ["node", "main.js"]
