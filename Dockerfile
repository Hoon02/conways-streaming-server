FROM node:16

WORKDIR /usr/src/app

RUN npm install -S rtsp-relay express

COPY ./server.js .

EXPOSE 2000

CMD ["node", "server.js"]
