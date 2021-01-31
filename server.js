import express from 'express';
import mongodb from 'mongodb';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import shopRouter from './routes/shop.js';
import postRouter from './routes/post.js';
import accountRouter from './routes/account.js';
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

// DB 연결
const MongoClient = mongodb.MongoClient;
const db = await connectToDB();
export const postCollection = await db.collection('post'); //할 일 컬렉션
export const counterCollection = await db.collection('counter'); // 할 일 아이디 카운터 컬렉션
export const userCollection = await db.collection('user'); // 유저 컬렉션(편의상 카운터는 두지 않는다.)

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

// 연결되면 서버 실행
app.listen(8080, () => {
  console.log('listen on 8080');
});

app.get('/', (요청, 응답) => {
  응답.render(`index.ejs`, { 사용자: 요청.user?.id });
});

app.use('/', postRouter);
app.use('/', accountRouter);
