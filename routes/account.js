// 사용자 계정 관련 라우터
import express from 'express';
import passport from 'passport';

import bcrypt from 'bcrypt';
import { userCollection } from '../server.js';

const router = express.Router();

router.get('/login', (요청, 응답) => {
  if (요청.user) {
    응답.redirect('/');
  } else {
    응답.render('login.ejs', { 사용자: 요청.user ? 요청.user.id : undefined });
  }
});

router.get('/logout', 로그인했니, (요청, 응답) => {
  요청.logout();
  요청.session.save((err) => {
    응답.redirect('/');
  });
});

router.get('/signup', (요청, 응답) => {
  if (요청.user) {
    응답.redirect('/');
  } else {
    응답.render('signup.ejs', { 사용자: 요청.user ? 요청.user.id : undefined });
  }
});

router.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureMessage: 'Fail to login!',
  }),
  (요청, 응답) => {
    응답.redirect('/');
  }
);

router.post('/signup', async (요청, 응답) => {
  let { id, pw, pwConfirm } = 요청.body;
  id = id ? id.trim() : null;
  pw = pw ? pw.trim() : null;
  pwConfirm = pwConfirm ? pwConfirm.trim() : null;
  let error = '';
  if (!id || !pw || !pwConfirm) {
    error = 'The id,pw,pw confirmation is necessary';
  } else if (pw !== pwConfirm) {
    error = 'The pw and password is not equal';
  } else {
    const sameIdUser = await userCollection.findOne({ id });
    if (sameIdUser) {
      error = 'The id is in use';
    }
  }
  if (error) {
    응답.status(400).json({ error });
  } else {
    pw = await bcrypt.hash(pw, +process.env.SALT_ROUNDS);
    userCollection.insertOne({ id, pw });
    응답.status(200).json({ message: 'Registered successfully' });
  }
});

// 콜백 실행하기 전 로그인했니 미들웨어를 통해 했는지 필터링을 한다. 스프링의 filter와 비슷함
router.get('/mypage', 로그인했니, (요청, 응답) => {
  console.log('/mypage:', 요청.user);
  응답.render('mypage.ejs', { 사용자: 요청.user.id });
});

// 미들웨어의 일종
function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next();
  } else {
    응답.redirect('/login');
  }
}

export default router;
