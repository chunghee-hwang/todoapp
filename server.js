import express from 'express';
import path from 'path';
import mongodb from 'mongodb';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
const app = express();
const __dirname = path.resolve();
dotenv.config({
  encoding: 'UTF-8',
  path: './db.env',
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // parse json

app.use('/public', express.static('public'));
app.use(methodOverride('_method'));

app.set('view engine', 'ejs'); // view 엔진으로 ejs 사용

// DB 연결
const MongoClient = mongodb.MongoClient;
const [db, client] = await connectToDB();
const postCollection = await db.collection('post');
const counterCollection = await db.collection('counter');

// 연결되면 서버 실행
app.listen(8080, () => {
  console.log('listen on 8080');
});

app.get('/', (요청, 응답) => {
  응답.render(`index.ejs`);
});

app.get('/write', (요청, 응답) => {
  응답.render(`write.ejs`);
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
    응답.json({ title, date });
  } catch (error) {
    console.warn(error);
    응답.json({ error });
  }
});

app.get('/list', async (요청, 응답) => {
  const 결과 = await postCollection.find().toArray();
  console.log(결과);
  응답.render('list.ejs', { posts: 결과 }); // 서버 사이드 렌더링
});

app.delete('/delete', async (요청, 응답) => {
  const { deletedCount } = await postCollection.deleteOne({
    _id: +요청.body._id,
  });
  if (deletedCount === 1) {
    응답.status(200).json({ message: `The post has been deleted` });
  } else {
    응답.status(400).json({ message: 'The post is not found' });
  }
});

app.get('/detail/:id', async (요청, 응답) => {
  const 결과 = await postCollection.findOne({ _id: +요청.params.id });
  if (결과) {
    응답.status(200).render('detail.ejs', { post: 결과 });
  } else {
    응답.status(404).render('detail.ejs', { error: 'The post is not found' });
  }
  console.log(결과);
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

  console.log(`update count: ${nModified}`);
  if (nModified === 1) {
    응답.redirect('/list');
  } else {
    응답.status(400).send('Fail to modify the post.');
  }
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
  const db = client.db('todoapp');
  return [db, client];
}
