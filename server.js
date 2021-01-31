import express from 'express';
import mongodb from 'mongodb';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import shopRouter from './routes/shop.js';
import postRouter from './routes/post.js';
import accountRouter from './routes/account.js';
import PassportLocal from 'passport-local';
import passport from 'passport';
import session from 'express-session';
import bcrypt from 'bcrypt';
const app = express();

dotenv.config({
  encoding: 'UTF-8',
  path: './property.env',
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // parse json

app.use('/public', express.static('public'));
app.use(methodOverride('_method'));

// /shop 밑으로 접속한 사람들은 모두 적용
app.use('/shop', shopRouter);

app.set('view engine', 'ejs'); // view 엔진으로 ejs 사용

app.use(
  session({
    secret: `${process.env.SESSION_SECRET}`,
    resave: true,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// DB 연결
const MongoClient = mongodb.MongoClient;
export let postCollection;
export let counterCollection;
export let userCollection;
connectToDB().then((db) => {
  postCollection = db.collection('post'); //할 일 컬렉션
  counterCollection = db.collection('counter'); // 할 일 아이디 카운터 컬렉션
  userCollection = db.collection('user'); // 유저 컬렉션(편의상 카운터는 두지 않는다.)

  // 연결되면 서버 실행
  app.listen(8080, () => {
    console.log('listen on 8080');
  });
});

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
  return client.db('todoapp');
}

app.get('/', (요청, 응답) => {
  응답.render(`index.ejs`, { 사용자: 요청.user?.id });
});

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

app.use('/', postRouter);
app.use('/', accountRouter);

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
