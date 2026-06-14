/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fileSystem from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DatabaseState, Lesson, User } from './src/types';

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'db.json');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Load database state helper
function readDatabase(): DatabaseState {
  try {
    if (fileSystem.existsSync(DB_PATH)) {
      const raw = fileSystem.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw) as DatabaseState;
    }
  } catch (error) {
    console.error('Error reading DB:', error);
  }
  // Fallback default state
  return {
    users: [
      { username: 'teacher', name: '王老师', role: 'teacher', password: 'wang2601' },
      { username: 'student', name: '小强 (Xiao Qiang)', role: 'student', password: '123' }
    ],
    lessons: []
  };
}

// Save database state helper
function writeDatabase(state: DatabaseState) {
  try {
    fileSystem.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

// --- API ENDPOINTS ---

// Login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDatabase();
  
  const query = (username || "").trim().toLowerCase();
  const pwd = (password || "").trim();

  // Support matching by either exact username or full displayName (name), case-insensitively
  const found = db.users.find(u => 
    u.username.toLowerCase() === query || 
    u.name.toLowerCase() === query || 
    // also support partial matching of Chinese displays (e.g. "王老师 (Teacher Wang)" -> "王老师" or "teacher wang")
    u.name.toLowerCase().includes(query)
  );

  if (found && found.password === pwd) {
    // Exclude password in response
    const { password: _, ...userWithoutPassword } = found;
    return res.json({ success: true, user: userWithoutPassword });
  }

  return res.status(401).json({ success: false, error: '姓名/账号或密码错误，请联系教师获取正确凭证' });
});

// Get Database State (For current lessons & active students)
app.get('/api/state', (req, res) => {
  const db = readDatabase();
  // Return the full user info including credentials & submissions for the classroom teacher
  res.json({ users: db.users, lessons: db.lessons });
});

// Student Submission API (Persists quiz completion, grades, and wrong answers)
app.post('/api/submissions', (req, res) => {
  const { username, submission } = req.body;
  if (!username || !submission) {
    return res.status(400).json({ error: '请提供正确的学号与提交内容' });
  }

  const db = readDatabase();
  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  
  if (!user) {
    return res.status(404).json({ error: '未找到本学生账号' });
  }

  if (!user.submissions) {
    user.submissions = [];
  }

  // Generate a direct unique key for submission
  const newSubmission = {
    ...submission,
    id: `sub-${Date.now()}`,
    submittedAt: new Date().toISOString()
  };

  user.submissions.push(newSubmission);
  writeDatabase(db);

  res.json({ success: true, submissions: user.submissions });
});

// Create a New Student Account
app.post('/api/users', (req, res) => {
  const { username, name, password, role } = req.body;
  if (!username || !name || !password || !role) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const db = readDatabase();
  const exists = db.users.some(u => u.username === username);
  if (exists) {
    return res.status(400).json({ error: '该用户名已存在' });
  }

  const newUser: User = { username, name, role, password };
  db.users.push(newUser);
  writeDatabase(db);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// Delete a Student Account
app.delete('/api/users/:username', (req, res) => {
  const { username } = req.params;
  const db = readDatabase();

  const index = db.users.findIndex(u => u.username === username);
  if (index === -1) {
    return res.status(404).json({ error: '未找到该用户' });
  }

  if (db.users[index].username === 'teacher') {
    return res.status(400).json({ error: '不能删除默认教师账号' });
  }

  db.users.splice(index, 1);
  writeDatabase(db);
  res.json({ success: true });
});

// Create Lesson
app.post('/api/lessons', (req, res) => {
  const lessonData = req.body as Partial<Lesson>;
  if (!lessonData.title) {
    return res.status(400).json({ error: '课文标题不能为空' });
  }

  const db = readDatabase();
  const newLesson: Lesson = {
    id: `lesson-${Date.now()}`,
    title: lessonData.title,
    pinyinTitle: lessonData.pinyinTitle || '',
    description: lessonData.description || '',
    lines: lessonData.lines || [],
    vocab: lessonData.vocab || [],
    imageUrl: lessonData.imageUrl || '',
    lessonType: lessonData.lessonType || 'dialogue'
  };

  db.lessons.push(newLesson);
  writeDatabase(db);
  res.status(201).json(newLesson);
});

// Update Lesson
app.put('/api/lessons/:id', (req, res) => {
  const { id } = req.params;
  const lessonData = req.body as Partial<Lesson>;

  const db = readDatabase();
  const index = db.lessons.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '未找到本课内容' });
  }

  db.lessons[index] = {
    ...db.lessons[index],
    title: lessonData.title || db.lessons[index].title,
    pinyinTitle: lessonData.pinyinTitle ?? db.lessons[index].pinyinTitle,
    description: lessonData.description ?? db.lessons[index].description,
    lines: lessonData.lines ?? db.lessons[index].lines,
    vocab: lessonData.vocab ?? db.lessons[index].vocab,
    imageUrl: lessonData.imageUrl ?? db.lessons[index].imageUrl,
    customChoices: lessonData.customChoices ?? db.lessons[index].customChoices,
    customBlanks: lessonData.customBlanks ?? db.lessons[index].customBlanks,
    customDialogues: lessonData.customDialogues ?? db.lessons[index].customDialogues,
    quizPublished: lessonData.quizPublished ?? db.lessons[index].quizPublished,
    lessonType: lessonData.lessonType ?? db.lessons[index].lessonType
  };

  writeDatabase(db);
  res.json(db.lessons[index]);
});

// Delete Lesson
app.delete('/api/lessons/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();

  const index = db.lessons.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '未找到本课内容' });
  }

  db.lessons.splice(index, 1);
  writeDatabase(db);
  res.json({ success: true });
});

// Google OAuth callback endpoint (handling implicit grant)
app.get(['/auth/google/callback', '/auth/google/callback/'], (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Google Authentication</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #faf8f5; color: #334155; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; width: 90%; }
          .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #d97706; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 1rem auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>欣欣汉语 - Google API 授权</h3>
          <div id="status">
            <p>正在努力验证您的 Google 账号，请稍候...</p>
            <div class="spinner"></div>
          </div>
        </div>
        <script>
          const hash = window.location.hash;
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get('access_token');
          const error = params.get('error');
          
          if (token) {
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token: token }, '*');
              setTimeout(() => { window.close(); }, 800);
              document.getElementById('status').innerHTML = '<p style="color: #16a34a; font-weight: bold;">✓ 授权成功！本窗口将自动关闭。</p>';
            } else {
              document.getElementById('status').innerHTML = '<p style="color: #16a34a; font-weight: bold;">✓ 授权成功！您可以关闭此窗口。</p>';
            }
          } else {
            console.error('Google Auth Error:', error || 'No token found in hash');
            document.getElementById('status').innerHTML = '<p style="color: #dc2626; font-weight: bold;">✗ 授权失败，未能获得 Google Drive 访问权限。</p>';
          }
        </script>
      </body>
    </html>
  `);
});

// Serve frontend routing via Vite in local, or compiled bundle in prod
async function setupViteOrStaticFileSystem() {
  // Serve newly generated illustration assets both in dev and prod
  app.use('/src/assets/images', express.static(path.join(process.cwd(), 'src/assets/images')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chinese Learning Platform Server launched on http://localhost:${PORT}`);
  });
}

setupViteOrStaticFileSystem().catch(error => {
  console.error('Failed to initiate server environment:', error);
});
