# Package: Quiz — Complete Project

هذا المستند يحتوي على جميع الملفات والموارد التي طلبتها: دعم Google Sheets مباشرة، صفحة إدارة (Admin) لتحرير الأسئلة، قواعد Firebase مقترَحة، وREADME مع خطوات لتغليف المشروع كـ ZIP وتشغيله محليًا.

---

## 1) `google-sheets-fetch.js`

**وصف:** طريقة بسيطة لجلب الأسئلة من Google Sheets بـ API Key (Sheets API v4). ستحتاج إلى كود الـ `sheetId` و`apiKey`. الملف يحوّل النتيجة إلى مصفوفة أسئلة متوافقة مع بقية المشروع.

```javascript
// google-sheets-fetch.js
// usage: fetchSheetQuestions(sheetId, apiKey, range)
async function fetchSheetQuestions(sheetId, apiKey, range='A1:G1000'){
  // نتوقع الأعمدة: id,category,difficulty,q_ar,choices,answer,explain
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Sheets API error: '+res.status);
  const data = await res.json();
  const rows = data.values || [];
  if(rows.length < 2) return [];
  const headers = rows[0].map(h=>String(h).trim());
  const out = [];
  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(r.length===0) continue;
    const obj = {};
    headers.forEach((h,idx)=>{ obj[h] = r[idx] !== undefined ? r[idx] : ''; });
    if(obj.choices) obj.choices = String(obj.choices).split('|').map(s=>s.trim());
    if(obj.answer) obj.answer = Number(obj.answer);
    out.push(obj);
  }
  return out;
}
```

> ملاحظة: يجب تفعيل Google Sheets API في Google Cloud Console وتوليد API key. النطاق (range) ممتاز لوضوح الأعمدة.

---

## 2) `admin.html` — صفحة إدارة الأسئلة

صفحة ويب بسيطة تتيح إضافة/تعديل/حذف الأسئلة من بنك الأسئلة المحلي (localStorage) أو رفعها/حفظها إلى Firestore إذا كان Firebase مهيأً.

```html
<!-- admin.html -->
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Admin — Manage Questions</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;padding:18px;background:#f5f6fa}
  .panel{background:#fff;padding:12px;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.06);max-width:900px;margin:auto}
  input,select,textarea{width:100%;padding:8px;margin:6px 0;border:1px solid #e6eef3;border-radius:6px}
  .row{display:flex;gap:8px}
  .row > *{flex:1}
  button{padding:8px 12px;background:#44bd32;color:white;border:none;border-radius:6px;cursor:pointer}
  .list{margin-top:12px}
  .item{padding:8px;border-bottom:1px solid #f0f3f6;display:flex;justify-content:space-between}
</style>
</head>
<body>
  <div class="panel">
    <h2>إدارة الأسئلة</h2>
    <div>
      <label>معرّف (id)</label>
      <input id="qid" />
      <label>التصنيف (category)</label>
      <input id="qcat" placeholder="math / science / history / geo" />
      <div class="row">
        <div>
          <label>الصعوبة</label>
          <select id="qdifficulty"><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select>
        </div>
        <div>
          <label>النقاط (اختياري)</label>
          <input id="qpoints" placeholder="10" />
        </div>
      </div>
      <label>النص (q_ar)</label>
      <textarea id="qtext" rows="3"></textarea>
      <label>الاختيارات (افصل بـ | )</label>
      <input id="qchoices" placeholder="اجابة1|اجابة2|اجابة3|اجابة4" />
      <label>رقم الاجابة الصحيحة (0-based)</label>
      <input id="qanswer" />
      <label>شرح قصير</label>
      <input id="qexplain" />
      <div style="display:flex;gap:8px;margin-top:8px"><button id="addBtn">أضف/حدّث</button><button id="exportBtn">تنزيل JSON</button><button id="clearBtn">مسح الكل</button></div>
    </div>

    <div class="list" id="list"></div>
  </div>

<script>
  const LS_KEY = 'quiz_questions_v2';
  function load(){ const raw = localStorage.getItem(LS_KEY); return raw? JSON.parse(raw): [] }
  function save(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); renderList(); }
  function renderList(){ const el = document.getElementById('list'); el.innerHTML=''; const arr = load(); if(arr.length===0){ el.innerHTML='<div>لا توجد أسئلة</div>'; return;} arr.forEach((q,idx)=>{ const d=document.createElement('div'); d.className='item'; d.innerHTML = `<div><strong>${q.q_ar||q.q}</strong><div class="small">${q.category} • ${q.difficulty}</div></div><div><button data-i="${idx}" class="edit">تعديل</button> <button data-i="${idx}" class="del">حذف</button></div>`; el.appendChild(d); });
    Array.from(document.querySelectorAll('.edit')).forEach(b=>b.onclick = e=>{ const i=b.dataset.i; fillForm(load()[i]); });
    Array.from(document.querySelectorAll('.del')).forEach(b=>b.onclick = e=>{ const i=b.dataset.i; const a=load(); a.splice(i,1); save(a); });
  }
  function fillForm(q){ document.getElementById('qid').value = q.id||''; document.getElementById('qcat').value=q.category||''; document.getElementById('qdifficulty').value=q.difficulty||'easy'; document.getElementById('qtext').value=q.q_ar||q.q||''; document.getElementById('qchoices').value = (q.choices||[]).join('|'); document.getElementById('qanswer').value = q.answer; document.getElementById('qexplain').value=q.explain||''; }

  document.getElementById('addBtn').onclick = ()=>{
    const arr = load(); const q = { id: document.getElementById('qid').value || Date.now(), category: document.getElementById('qcat').value||'general', difficulty: document.getElementById('qdifficulty').value, q_ar: document.getElementById('qtext').value, choices: document.getElementById('qchoices').value.split('|').map(s=>s.trim()), answer: Number(document.getElementById('qanswer').value), explain: document.getElementById('qexplain').value };
    // replace if id exists
    const idx = arr.findIndex(x=>String(x.id)===String(q.id)); if(idx>=0) arr[idx]=q; else arr.push(q); save(arr); alert('تم الحفظ');
  }
  document.getElementById('exportBtn').onclick = ()=>{ const a = load(); const blob = new Blob([JSON.stringify(a, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const ael = document.createElement('a'); ael.href=url; ael.download='questions.json'; document.body.appendChild(ael); ael.click(); ael.remove(); }
  document.getElementById('clearBtn').onclick = ()=>{ if(confirm('مسح كل الأسئلة؟')){ localStorage.removeItem(LS_KEY); renderList(); } }
  // init
  renderList();
</script>
</body>
</html>
```

> ملاحظة: صفحة الـ admin تعمل محليًا وتستخدم `localStorage`. يمكن توصيل الأزرار لحفظ إلى Firestore عبر `firebase.firestore().collection('questions')` بسهولة (أضع لك مثالًا لو رغبت).

---

## 3) `firebase.rules` — مثال قواعد Firestore بسيطة (تطوّر لاحقًا)

**وصف:** هذه القواعد تسمح بالقراءة العامة، والكتابة للمستخدمين المصادق عليهم فقط. أثناء التطوير يمكنك تعديلها لتسهيل الاختبار.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // leaderboard collection: anyone can read, only authenticated users can create
    match /leaderboard/{docId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false; // لا تسمح بالتعديل للحماية
    }

    // questions: only authenticated admin users (مثال بسيط: تحقق من uid in list)
    match /questions/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid in ['UID_ADMIN_1','UID_ADMIN_2'];
    }
  }
}
```

> بديل متدرّج: أثناء التطوير يمكنك جعل `allow write: if true;` لكن لا تفعل ذلك على بيئة الإنتاج.

---

## 4) `README.md` — تعليمات إعداد المشروع وتشغيله محليًا

```md
# Quiz — Complete Project

محتويات الحزمة:
- quiz-game-complete.html  (الواجهة الكاملة)
- quiz-game-advanced.html  (نسخة مُحسّنة)
- admin.html               (لوحة إدارة الأسئلة)
- google-sheets-fetch.js   (fetch helper)
- firebase.rules           (قواعد Firestore المقترحة)

## تشغيل محلي
1. ضع الملفات في مجلد.
2. افتح `admin.html` وابدأ بإضافة بعض الأسئلة وحمّلها (أو نزّل JSON ثم استخدم حقل "تحميل الأسئلة" في الواجهة الرئيسية).
3. افتح `quiz-game-complete.html` في المتصفح.

## تحميل أسئلة من Google Sheets
1. فعّل Google Sheets API في Google Cloud Console.
2. أنشئ API Key (لا تشاركها علنًا).
3. اضع رابط Public أو استخدم Fetch عبر API: استخدم `google-sheets-fetch.js` واستدعِ `fetchSheetQuestions(sheetId, apiKey, range)`.

## Firebase (لوحة شرف عالمية + مصادقة)
1. أنشئ مشروع Firebase من console.firebase.google.com
2. فعّل Authentication (Google Sign-in) وFirestore.
3. انسخ config JSON والصقها في الحقل داخل الواجهة.
4. انسخ قواعد `firebase.rules` إلى قسم Rules في Firestore.

## إنشاء ZIP
في نظامك (Linux/Mac/Windows PowerShell):
- ضع كل الملفات داخل مجلد واملأه.
- نفّذ: `zip -r quiz-project.zip your-folder/`

```

---

## ماذا قمتُ بعمله الآن

* وضعت لك سكربت لجلب الأسئلة من Google Sheets عبر API key.
* أنشأت صفحة إدارة `admin.html` لحفظ الأسئلة محليًا وتنزيلها كـ JSON.
* أعطيتك قواعد Firestore جاهزة للتعديل واللصق في Console.
* جهزت README يشرح خطوات التشغيل، الربط مع Firebase، وكيفية تغليف المشروع.

---

## الخطوة التالية (إذا رغبت)

1. أجهّز لك اتصال admin -> Firestore (حفظ التغييرات من لوحة الإدارة مباشرة إلى collection `questions`).
2. أكتب لك سكربت Node.js صغير لنشر الأسئلة من ملف JSON إلى Firestore (للتحميل الجماعي).
3. أعدّل الواجهة لتدعم تسجيل الدخول عبر Email/password + Google وملفّات صور للأسئلة.

أخبرني أي وظيفة تريدني أن أضيفها بعدها — سأدرج الكود مباشرة.
