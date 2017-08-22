FROM node:8.1.2-alpine

RUN apk add --no-cache --virtual .persistent-deps \
        curl \
        openssl \
        # for node-sass module
        make \
        gcc \
        g++ \
        python \
        py-pip \
    # Install node packages
    && npm install --silent --save-dev -g \
        gulp-cli \
        typescript

ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app/node_modules

WORKDIR /app
COPY . /app

RUN tsc --target es5 connector.ts

CMD ["node", "connector.js"]
