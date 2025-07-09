import express from 'express';
import cors from "cors";
  
import bodyParser from "body-parser";
import session, { MemoryStore } from "express-session";
import fs from "fs";

import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import webpush from 'web-push';

import mssql from "mssql";
import uuid4 from "uuid4";

import { swaggerUi, specs } from './common/swagger.js';


/* var express = require('express'); */
/* var bodyParser = require('body-parser'); */
/* var session = require('express-session'); */
/* var fs = require("fs") */


/*
  [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated in windows
  오류가 날 경우
  ps> npm audit fix --force 


  * IIS에 올리려 할 경우
  1. 윈도우 설치로 URL REWRITE 설치 
  2. Reverse Proxy 선택후 ARR3설치 요구시 윈도우 설치로 ARR3 설치 localhost:8080 포트 지정
  3. NPM으로 PM2 설치 PM2 START Server.js , 중지시 PM2 STOP Server.js

     PM2 status(list) : 실행중인 어플리케이션의 상태를 확인 
     PM2 monit

*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var app = express();

app.use(cors()); // 모든 http 요청을 허용한다.
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: '@#@$MYSIGN#@$#$',  // 쿠키를 임의로 변조하는것을 방지하기 위한 sign 값
    resave: false,              // 세션을 언제나 저장할 지 정하는 값입니다. express-session documentation에서는 이 값을 false 로 하는것을  권장(필요에 따라 true로 설정)
    saveUninitialized: true,    // uninitialized 세션이란 새로 생겼지만 변경되지 않은 세션을 의미합니다. Documentation에서 이 값을 true로 설정하는것을 권장
    store: new MemoryStore({
      //checkPeriod: 24 * 60 * 60 * 1000, // 1 day
      checkPeriod: 60 * 1000, // 60 분 
    }) 
}));

import member_router from './router/member/member.js'
import main_router from './router/main.js'
import bbs_router from './router/bbs/bbs.js'
import chat_client_router from './router/chat_client/chat_client.js'
import WebSocket_router from './router/WebSocket_Sample/WebSocket_Sample.js'
import example_router from './router/example/example.js'

//swagger.js /api-docs 라는 path로 등록시켜줌.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
 
const member = member_router(app,fs);
app.use('/member', member);

const main = main_router(app);
app.use('/main', main);

const bbs = bbs_router(app, fs);
app.use('/bbs', bbs);

const chat_client = chat_client_router(app,fs);
app.use('/chat_client', chat_client);

const WebSocket_Sample = WebSocket_router(app,fs);
app.use('/WebSocket_Sample', WebSocket_Sample);

const example = example_router(app,fs);
app.use('/example', example);

const options = {
  setHeaders: function (res, path, stat) {
      res.set('Service-Worker-Allowed', '/');
  },
};

app.use(express.static(path.join(process.cwd(), './public'), options));
 
//app.use(express.static('public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
//app.engine('html', require('ejs').renderFile);
app.engine('html', ejs.renderFile);

import mysql_connect from './common/mySqlConfig.js';
import mssql_connect_config from './common/MsSqlConfig.js';

//var _err = mysql_connect.init();
 
mysql_connect.connect(function (err) 
{
  if (err) {
    return console.error(`error : ${err}`);
  }
  console.log(`MySQL connection success`);
});

var mssql_connect = new mssql.ConnectionPool(mssql_connect_config);

mssql_connect.connect(function (err)  
{
  if (err) {
    return console.error(`error : ${err}`);
  }

  console.log(`MSSQL connection success`);
  mssql_connect.close();

});

import WebSocket, { WebSocketServer } from "ws";
import {Server} from "socket.io";
 
const web_port = 8080;
//const web_port = 80;
const web_socket_port = 8081; 

var server = app.listen(web_port, function(){
  console.log("Express server has started on port " + web_port);
});

/* var web_socket_server = app.listen(web_socket_port, function(){
  console.log('Socket IO server listening on port ' + web_socket_port);
});  
  */


const io = new Server(server);
/*
// 전체 보내기
req.app.get('io').emit('이벤트', 메세지);

// 네임스페이스에 있는 유저한테만 보내기
req.app.get('io').of('네임스페이스').emit('이벤트', 메세지);

// 네임스페이스에 있으면서, 그안에 룸에 있는 유저한테만 보내기
req.app.get('io').of('네임스페이스').to(roomId).emit('이벤트', 메세지);

// 특정 유저한테만 보내기 (1:1대화, 귓속말)
req.app.get('io').to(socket.id).emit('이벤트', 메세지);

// 나를 제외한 모든 유저에게 보내기
req.app.get('io').broadcast.emit('event_name', msg);

출처: https://inpa.tistory.com/entry/SOCKET-📚-Namespace-Room-기능 [Inpa Dev 👨‍💻:티스토리]
*/
 
// namespace /chat에 접속한다.
var chat = io.of('/chat').on('connection', function(socket) {
 
    // 룸 생성
    socket.on('create', function(data) {

        var _CHAT_ROOM_ID      = data.CHAT_ROOM_ID;
        var _CHAT_ROOM_TITLE   = data.CHAT_ROOM_TITLE;
        var _CHAT_ROOM_SUBJECT = data.CHAT_ROOM_SUBJECT;
        var _CHAT_ROOM_OPEN_GBN = data.CHAT_ROOM_OPEN_GBN;
        var _CHAT_ROOM_OWNER_ID = data.CHAT_ROOM_OWNER_ID;
        var _CHAT_ROOM_OWNER_NM = data.CHAT_ROOM_OWNER_NM;

        _CHAT_ROOM_ID = socket.CHAT_ROOM_ID = "lina_" + uuid4();

        //DB에 생성된 방을 등록함

        var execute_result = { result : "OK", rows : [] };
        var sql = "SP_CM_CHAT_CD";
      
        new mssql.connect(mssql_connect_config).then(() => {
          const request = new mssql.Request();
          request.input('P_CHAT_ROOM_ID', mssql.VarChar(100), _CHAT_ROOM_ID)
          request.input('P_CHAT_ROOM_TITLE', mssql.VarChar(100), _CHAT_ROOM_TITLE)
          request.input('P_CHAT_ROOM_SUBJECT', mssql.VarChar(100), _CHAT_ROOM_SUBJECT)
          request.input('P_CHAT_ROOM_OPEN_GBN', mssql.VarChar(100), _CHAT_ROOM_OPEN_GBN)
          request.input('P_CHAT_ROOM_OWNER_ID', mssql.VarChar(100), _CHAT_ROOM_OWNER_ID)
          request.input('P_CHAT_ROOM_OWNER_NM', mssql.VarChar(100), _CHAT_ROOM_OWNER_NM)
          request.input('P_GBN', mssql.VarChar(100), "C")
          request.output('P_RST_MSG', mssql.VarChar(4000))
          request.execute(sql).then((result) => { 
              //var rows = JSON.parse(JSON.stringify(result));

              //오류가 없는 경우 수행
              if(result.output.P_RST_MSG == "OK")
              {
                  chat.emit('create', { "RESULT" : "OK", "CHAT_ROOM_ID" : _CHAT_ROOM_ID });
              }
              else
              {
                  chat.emit('create', { "RESULT" : result.output.P_RST_MSG, "CHAT_ROOM_ID" : "" });
              }
          }).catch((err) => {
              console.log('Error executing sp ', err.message);
              chat.emit('create', err.message );
          });
        }).catch((err) => {
            console.log('DB Error ', err.message);
            chat.emit('create', err.message );
        });            
    });

    // 룸 조인
    socket.on('join', function(data) {
        var _CHAT_ROOM_ID      = data.CHAT_ROOM_ID;
        var _CHAT_ROOM_TITLE   = data.CHAT_ROOM_TITLE;
        var _CHAT_ROOM_SUBJECT = data.CHAT_ROOM_SUBJECT;
        var _CHAT_ROOM_OPEN_GBN = data.CHAT_ROOM_OPEN_GBN;
        var _CHAT_ROOM_OWNER_ID = data.CHAT_ROOM_OWNER_ID;
        var _CHAT_ROOM_OWNER_NM = data.CHAT_ROOM_OWNER_NM;   

        socket.CHAT_ROOM_ID = data.CHAT_ROOM_ID;
        socket.CHAT_ROOM_TITLE = data.CHAT_ROOM_TITLE;
        socket.CHAT_ROOM_OWNER_ID = data.CHAT_ROOM_OWNER_ID;
        socket.CHAT_ROOM_OWNER_NM = data.CHAT_ROOM_OWNER_NM;
   
        //DB에 생성된 방이 있는지 확인하고 참여자로 등록
        var sql = "SP_CM_CHAT_JOIN_CD";

        new mssql.connect(mssql_connect_config).then(() => {
          const request = new mssql.Request();
          request.input('P_CHAT_ROOM_ID', mssql.VarChar(100), _CHAT_ROOM_ID)
          request.input('P_USERID', mssql.VarChar(100), data.CHAT_ROOM_OWNER_ID)
          request.input('P_GBN', mssql.VarChar(100), "C")
          request.output('P_USR_LST', mssql.VarChar(4000))
          request.output('P_RST_MSG', mssql.VarChar(4000))
          request.execute(sql).then((result) => { 
  
              //오류가 없는 경우 수행
              if(result.output.P_RST_MSG == "OK")
              {
                // room에 join한다
                socket.join(socket.CHAT_ROOM_ID);
          
                // 접속된 모든 클라이언트에게 메시지를 전송한다
                chat.to(socket.CHAT_ROOM_ID).emit('join', _CHAT_ROOM_OWNER_NM + "님이 입장하셨습니다.");
              }
              else
              {
                  // room에 join한다
                  socket.join(socket.CHAT_ROOM_ID);
            
                  // 접속된 모든 클라이언트에게 메시지를 전송한다
                  chat.to(socket.CHAT_ROOM_ID).emit('join', "오류발생: " + result.output.P_RST_MSG);
              }
          }).catch((err) => {
              console.log('Error executing sp ', err.message);
              chat.to(socket.CHAT_ROOM_ID).emit('join', "오류발생: " + result.output.P_RST_MSG);

          });
        }).catch((err) => {
            console.log('DB Error ', err.message);
            chat.to(socket.CHAT_ROOM_ID).emit('join', "오류발생: " + result.output.P_RST_MSG);
        });         
    });

    // 룸 나가기
    socket.on('leave', function(data) {
        console.log('leave room from client: ', data);

        var _CHAT_ROOM_ID = socket.CHAT_ROOM_ID = data.CHAT_ROOM_ID;
        var _CHAT_ROOM_TITLE = socket.CHAT_ROOM_TITLE = data.CHAT_ROOM_TITLE;
        var _CHAT_ROOM_OWNER_ID = socket.CHAT_ROOM_OWNER_ID = data.CHAT_ROOM_OWNER_ID;
        var _CHAT_ROOM_OWNER_NM = socket.CHAT_ROOM_OWNER_NM = data.CHAT_ROOM_OWNER_NM;

        socket.leave(socket.CHAT_ROOM_ID);

        //DB 에 등록된 구성원 삭제.
        var sql = "SP_CM_CHAT_JOIN_CD";

        new mssql.connect(mssql_connect_config).then(() => {
          const request = new mssql.Request();
          request.input('P_CHAT_ROOM_ID', mssql.VarChar(100), _CHAT_ROOM_ID)
          request.input('P_USERID', mssql.VarChar(100), _CHAT_ROOM_OWNER_ID)
                request.input('P_GBN', mssql.VarChar(100), "D")
                request.output('P_USR_LST', mssql.VarChar(4000))
                request.output('P_RST_MSG', mssql.VarChar(4000))
          request.execute(sql).then((result) => { 
              console.log("채팅방 leave : " + result.output.P_RST_MSG);
              console.log("채팅방 구성원 : " + result.output.P_USR_LST);

              var rows = JSON.parse(result.output.P_USR_LST);

              if(rows.length > 0) //룸에 구성원이 있는 경우
              {
                  // room에 join되어 있는 클라이언트에게 메시지를 전송한다
                  chat.to(socket.CHAT_ROOM_ID).emit('leave', { "CHAT_ROOM_USER" : _CHAT_ROOM_OWNER_ID, "CHAT_ROOM_USER_NM" : _CHAT_ROOM_OWNER_NM });

              }
              else //룸에 구성원이 없는 경우 방삭제
              {
                  io.in(_CHAT_ROOM_ID).socketsLeave(_CHAT_ROOM_ID);
                  var roomList = Array.from(socket.adapter.rooms.keys());

                  new mssql.connect(mssql_connect_config).then(() => {
                    const request = new mssql.Request();
                    request.input('P_CHAT_ROOM_ID', mssql.VarChar(100), _CHAT_ROOM_ID)
                    request.input('P_CHAT_ROOM_TITLE', mssql.VarChar(100), _CHAT_ROOM_TITLE)
                    request.input('P_CHAT_ROOM_SUBJECT', mssql.VarChar(100), "")
                    request.input('P_CHAT_ROOM_OPEN_GBN', mssql.VarChar(100), "")
                    request.input('P_CHAT_ROOM_OWNER_ID', mssql.VarChar(100), _CHAT_ROOM_OWNER_ID)
                    request.input('P_CHAT_ROOM_OWNER_NM', mssql.VarChar(100), _CHAT_ROOM_OWNER_NM)
                    request.input('P_GBN', mssql.VarChar(100), "D")
                    request.output('P_RST_MSG', mssql.VarChar(4000))
                    request.execute("SP_CM_CHAT_CD").then((result) => { 
                        console.log("방삭제 : " + result.output.P_RST_MSG);
                        
                        //메시지를 전송한 클라이언트를 제외한 모든 클라이언트에게 메시지를 전송한다
                        socket.broadcast.emit('refresh room', "OK");
                         
                    }).catch((err) => {
                        console.log('Error executing sp ', err.message);

                    });
                  }).catch((err) => {
                      console.log('DB Error ', err.message);

                  });       
              }
          }).catch((err) => {
            console.log("Error executing sp " + err.message);
 
          });
        }).catch((err) => {
            console.log("DB Error " + err.message);
        });
    });

    socket.on('message', function(data) {
        console.log('message from client: ', data);

        var _CHAT_ROOM_ID = socket.CHAT_ROOM_ID = data.CHAT_ROOM_ID;
        var _CHAT_ROOM_TITLE = socket.CHAT_ROOM_TITLE = data.CHAT_ROOM_TITLE;
        var _CHAT_ROOM_OWNER_ID = socket.CHAT_ROOM_OWNER_ID = data.CHAT_ROOM_OWNER_ID;
        var _CHAT_ROOM_OWNER_NM = socket.CHAT_ROOM_OWNER_NM = data.CHAT_ROOM_OWNER_NM;
        var _msg =  data.msg;

        // room에 join한다
        socket.join(socket.CHAT_ROOM_ID);
        // room에 join되어 있는 클라이언트에게 메시지를 전송한다
        chat.to(socket.CHAT_ROOM_ID).emit('message', { "CHAT_ROOM_USER" : _CHAT_ROOM_OWNER_ID, "MSG" : _CHAT_ROOM_OWNER_NM + ":" + _msg});    
    });


    socket.on('getRooms', function() {
      console.log(socket.rooms);
      //socket.emit('rooms', io.sockets.adapter.rooms);
      var roomList = Array.from(socket.adapter.rooms.keys());

      socket.emit('getRooms', roomList);
    });

    // 디스커넥트될때 수행할 프로세스 나열
    socket.on('disconnecting', function() {
    });

    socket.on('user left', function() {

/*    var name = socket.name = data.name;
      var room = socket.room = data.room;

      socket.disconnect(); 
      chat.to(room).emit('forceDisconnect', " 님이 접속을 해제 했습니다.");
*/
      console.log("해제신청");
      var self = this;
      var _room = self.room;

      chat.to(_room).emit('user left', _room + ' left');
 
    })
});

const publicVapidKey = 'BCWme85WpMZT7XwHZXiwG2iAAg7u1g-Dxth_HaYxwL5mWkkWnffar3SoGowDQR1A667cax0svUrCA-bxeqEAlGo';
const privateVapidKey = '2rrv4a_dVauiKyd59JBespSf-mMS4WDmctn1ZfQereY';

webpush.setVapidDetails(
  "mailto:fotolog@nate.com",
  publicVapidKey,
  privateVapidKey
);

// Subscribe Route
app.post("/subscribe", (req, res) => {
  //Get pushSubscription Object
  const subscription = req.body;

  // Send 201 - resource created
  res.status(201).json({});

  // Create payload
  const payload = JSON.stringify({ title: "서비스 알림메일 도착" });

  // Pass Object into sendNotification
  webpush
      .sendNotification(subscription, payload)
      .catch((err) => console.error(err));
});

const push_port = 8082;

app.listen(push_port, () => console.log("push server started on port " + push_port));
 

 

 