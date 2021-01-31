import express from 'express';
const router = express.Router();

router.get('/shirts', (요청, 응답) => {
  응답.send('셔츠 파는 페이지입니다.');
});

router.get('/pants', (요청, 응답) => {
  응답.send('바지 파는 페이지입니다.');
});

export default router;
