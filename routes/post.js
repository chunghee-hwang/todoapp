// 할일 게시물 관련 라우터
import express from 'express';
import { postCollection, counterCollection } from '../server.js';
const router = express.Router();

router.get('/write', (요청, 응답) => {
  응답.render(`write.ejs`, { 사용자: 요청.user ? 요청.user.id : undefined });
});

router.post('/add', async (요청, 응답) => {
  try {
    const { title, date } = 요청.body;
    // 총 게시물 갯수 가져오기
    let { totalPost } = await counterCollection.findOne({ name: '게시물갯수' });
    await postCollection.insertOne({
      _id: totalPost + 1,
      제목: title,
      날짜: date,
    });

    // 연산자 종류:
    // $set - 변경
    // $inc - 증가
    // $min - 기존값보다 적을 때만 변경
    // $rename - key값 변경
    await counterCollection.updateOne(
      { name: '게시물갯수' },
      { $inc: { totalPost: 1 } } // 총 게시물 갯수 1 증가
    );
    응답.redirect('/list');
  } catch (error) {
    console.warn(error);
    응답.send(error);
  }
});

router.get('/list', async (요청, 응답) => {
  const 결과 = await postCollection.find().toArray();
  응답.render('list.ejs', {
    posts: 결과,
    사용자: 요청.user ? 요청.user.id : undefined,
  }); // 서버 사이드 렌더링
});

router.delete('/delete', async (요청, 응답) => {
  const { deletedCount } = await postCollection.deleteOne({
    _id: +요청.body._id,
  });
  if (deletedCount === 1) {
    응답.status(200).json({ message: 'The post has been deleted' });
  } else {
    응답.status(400).json({ message: 'The post is not found' });
  }
});

router.get('/detail/:id', async (요청, 응답) => {
  const 결과 = await postCollection.findOne({ _id: +요청.params.id });
  if (결과) {
    응답.status(200).render('detail.ejs', {
      post: 결과,
      사용자: 요청.user ? 요청.user.id : undefined,
    });
  } else {
    응답.status(404).render('detail.ejs', {
      error: 'The post is not found',
      사용자: 요청.user ? 요청.user.id : undefined,
    });
  }
});

router.get('/edit/:id', async (요청, 응답) => {
  const 결과 = await postCollection.findOne({ _id: +요청.params.id });
  if (결과) {
    응답.status(200).render('edit.ejs', { post: 결과 });
  } else {
    응답.status(404).render('edit.ejs', { error: 'The post is not found' });
  }
});

router.put('/edit', async (요청, 응답) => {
  // 폼에 담긴 제목, 날짜 데이터를 가지고
  // db.collection 에다가 업데이트함
  const { id, title, date } = 요청.body;
  const {
    result: { nModified },
  } = await postCollection.updateOne(
    { _id: +id },
    { $set: { 제목: title, 날짜: date } }
  );

  if (nModified === 1) {
    응답.redirect('/list');
  } else {
    응답.status(400).send('Fail to modify the post.');
  }
});

export default router;
