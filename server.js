import express from 'express';
import path from 'path';
const app = express();
const __dirname = path.resolve();

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
