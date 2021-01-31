// 사용자 계정 관련 라우터
import express from 'express';
import passport from 'passport';
import PassportLocal from 'passport-local';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { userCollection } from '../server.js';

const router = express.Router();

router.use(
  session({
    secret: `${process.env.SESSION_SECRET}`,
    resave: true,
    saveUninitialized: false,
  })
);
router.use(passport.initialize());
router.use(passport.session());

router.get('/login', (요청, 응답) => {
  if (요청.user) {
    응답.redirect('/');
  } else {
    응답.render('login.ejs', { 사용자: 요청.user?.id });
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
    응답.render('signup.ejs', { 사용자: 요청.user?.id });
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

// 사용자 인증
passport.use(
  new PassportLocal.Strategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: false,
    },
    async (id, pw, done) => {
      const { errorMessage, success, user } = await authenticateUser(id, pw);
      // done(서버에러, 성공했을시 데이터, 메시지)
      if (success) {
        return done(null, user);
      } else {
        return done(null, false, { errorMessage });
      }
    }
  )
);

// 로그인 성공 시 유저를 세션에 등록
passport.serializeUser((user, done) => {
  done(null, user.id); // 세션에 유저 아이디 저장, 쿠키로 전송
});

// 세션에 이미 유저가 있으면 해석
passport.deserializeUser(async (id, done) => {
  // db에서 user.id로 유저를 찾은 뒤 유저 정보를 넣음
  const user = await userCollection.findOne({ id });
  if (user) {
    done(null, user); // 이렇게 하면 요청.user로 접근가능
  }
});

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

async function authenticateUser(id, pw) {
  id = id ? id.trim() : null;
  pw = pw ? pw.trim() : null;
  let errorMessage = '';
  let user;
  if (!id || !pw) {
    errorMessage = 'The id,pw,pw confirmation is necessary';
  } else {
    user = await userCollection.findOne({ id });
    if (!user) {
      errorMessage = 'The id or pw is not correct';
    } else {
      const pwIsMatch = await bcrypt.compare(pw, user.pw);
      if (!pwIsMatch) {
        errorMessage = 'The id or pw is not correct';
      }
    }
  }
  return {
    success: errorMessage === '',
    user,
    errorMessage,
  };
}

export default router;
