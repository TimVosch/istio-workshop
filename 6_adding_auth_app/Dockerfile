FROM node:12-slim

#
# Tini is required to forward SIGKILL correctly
# otherwise you won't be able to CTRL+C exit the program
#
ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

WORKDIR /opt/app

COPY package-lock.json .
COPY package.json .

RUN npm install --production

COPY private.pem .
COPY src src

CMD ["node", "src/main"]
