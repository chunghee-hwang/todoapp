import express from 'express';
const router = express();
router.get('/chat', (요청, 응답) => {
  응답.render('chat.ejs');
});

export const initChatServer = (io) => {
  io.on('connection', (socket) => {
    console.log('채팅 서버 연결되었어요');
  });
  const chat1 = io.of('/채팅서버1');
  chat1.on('connection', (socket) => {
    console.log('채팅 서버 (1) 연결되었어요');
    let 방번호 = '';

    socket.on('방들어가고픔', (roomIndex) => {
      socket.join(roomIndex);
      방번호 = roomIndex;
      console.log('방에 접속했어요', roomIndex);
    });

    socket.on('chat', (data) => {
      console.log('chat.. 퍼트리기', data, '방번호:', 방번호);
      chat1.to(방번호).emit('퍼트리기', data);
    });

    socket.on('disconnect', (socket) => {
      console.log('사용자가 채팅 서버(1)를 나갔어요');
    });
  });
};

export default router;
