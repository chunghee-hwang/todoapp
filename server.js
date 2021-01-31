import express from 'express';
import mongodb from 'mongodb';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import passport from 'passport';
import PassportLocal from 'passport-local';
import session from 'express-session';
import bcrypt from 'bcrypt';
import shopRouter from './routes/shop.js';
const app = express();

dotenv.config({
  encoding: 'UTF-8',
  path: './property.env',
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // parse json

app.use('/public', express.static('public'));
app.use(methodOverride('_method'));

app.use(
  session({
    secret: `${process.env.SESSION_SECRET}`,
    resave: true,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// /shop 밑으로 접속한 사람들은 모두 적용
app.use('/shop', shopRouter);

app.set('view engine', 'ejs'); // view 엔진으로 ejs 사용

// DB 연결
const MongoClient = mongodb.MongoClient;
const [db, client] = await connectToDB();
const postCollection = await db.collection('post'); //할 일 컬렉션
const counterCollection = await db.collection('counter'); // 할 일 아이디 카운터 컬렉션
const userCollection = await db.collection('user'); // 유저 컬렉션(편의상 카운터는 두지 않는다.)

async function connectToDB() {
  // connect to your cluster
  const client = await MongoClient.connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p9ab5.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
  // specify the DB's name
  const db = client.db('todoapp');
  return [db, client];
}

// 연결되면 서버 실행
app.listen(8080, () => {
  console.log('listen on 8080');
});

app.get('/', (요청, 응답) => {
  응답.render(`index.ejs`, { 사용자: 요청.user?.id });
});

app.get('/write', (요청, 응답) => {
  응답.render(`write.ejs`, { 사용자: 요청.user?.id });
});

app.post('/add', async (요청, 응답) => {
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

app.get('/list', async (요청, 응답) => {
  const 결과 = await postCollection.find().toArray();
  응답.render('list.ejs', { posts: 결과, 사용자: 요청.user?.id }); // 서버 사이드 렌더링
});

app.delete('/delete', async (요청, 응답) => {
  const { deletedCount } = await postCollection.deleteOne({
    _id: +요청.body._id,
  });
  if (deletedCount === 1) {
    응답.status(200).json({ message: 'The post has been deleted' });
  } else {
    응답.status(400).json({ message: 'The post is not found' });
  }
});

app.get('/detail/:id', async (요청, 응답) => {
  const 결과 = await postCollection.findOne({ _id: +요청.params.id });
  if (결과) {
    응답.status(200).render('detail.ejs', {
      post: 결과,
      사용자: 요청.user?.id,
    });
  } else {
    응답.status(404).render('detail.ejs', {
      error: 'The post is not found',
      사용자: 요청.user?.id,
    });
  }
});

app.get('/edit/:id', async (요청, 응답) => {
  const 결과 = await postCollection.findOne({ _id: +요청.params.id });
  if (결과) {
    응답.status(200).render('edit.ejs', { post: 결과 });
  } else {
    응답.status(404).render('edit.ejs', { error: 'The post is not found' });
  }
});

app.put('/edit', async (요청, 응답) => {
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

app.get('/login', (요청, 응답) => {
  if (요청.user) {
    응답.redirect('/');
  } else {
    응답.render('login.ejs', { 사용자: 요청.user?.id });
  }
});

app.get('/logout', 로그인했니, (요청, 응답) => {
  요청.logout();
  요청.session.save((err) => {
    응답.redirect('/');
  });
});

app.get('/signup', (요청, 응답) => {
  if (요청.user) {
    응답.redirect('/');
  } else {
    응답.render('signup.ejs', { 사용자: 요청.user?.id });
  }
});

app.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/fail',
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

app.post('/signup', async (요청, 응답) => {
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

app.get('/mypage', 로그인했니, (요청, 응답) => {
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
