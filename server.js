import express from 'express';
import path from 'path';
import bodyParser from 'body-parser'; // 요청 데이터 해석을 쉽게 도와줌
const app = express();
const __dirname = path.resolve();

app.use(bodyParser.urlencoded({ extended: true }));

app.listen(8080, () => {
  console.log('listen on 8080');
});

app.get('/pet', (요청, 응답) => {
  응답.send('펫 용품 쇼핑할 수 있는 페이지입니다.');
});

app.get('/beauty', (요청, 응답) => {
  응답.send('뷰티 샵입니다.');
});

app.get('/', (요청, 응답) => {
  응답.sendFile(`${__dirname}/index.html`);
});

app.get('/write', (요청, 응답) => {
  응답.sendFile(`${__dirname}/write.html`);
});

app.post('/add', (요청, 응답) => {
  응답.send('전송 완료');
  console.log(요청.body);

  // db에 저장
});
