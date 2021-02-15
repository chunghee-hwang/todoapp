import express from 'express';
import multer from 'multer';
import os from 'os';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({
  encoding: 'UTF-8',
  path: './property.env',
});

const fileDirectory = `${os.homedir()}/${process.env.FILE_DIR_NAME}`;

// memoryStorage도 있음
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(fileDirectory)) {
      fs.mkdirSync(fileDirectory);
    }
    cb(null, fileDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });
const router = express.Router();

router.get('/upload', (요청, 응답) => {
  응답.render('upload.ejs');
});

//upload.array('프로필', 받을개수);
router.post('/upload', upload.single('profile'), (요청, 응답) => {
  응답.send('업로드완료');
});

router.get('/file/:imageName', (요청, 응답) => {
  응답.sendFile(`${fileDirectory}/${요청.params.imageName}`);
});
export default router;
