# 🚀 LexiMindPro Kurulum ve Başlatma Rehberi

## 📋 Hızlı Başlangıç Adımları

### 1️⃣ Gereksinimleri Kontrol Et

```bash
# Python versiyonunu kontrol et
python --version
# Python 3.8+ olmalı

# Node.js versiyonunu kontrol et
node --version
# Node.js 16+ olmalı

# npm versiyonunu kontrol et
npm --version
```

### 2️⃣ Backend Kurulumu

```bash
# Backend klasörüne git
cd backend

# Virtual environment oluştur (önerilir)
python -m venv venv

# Virtual environment'ı aktifleştir
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env dosyasını oluştur (eğer yoksa)
# Windows:
copy env.example .env
# Mac/Linux:
cp env.example .env

# .env dosyasını düzenle
# ÖNEMLİ: OPENAI_API_KEY eklemeyi unutma!
notepad .env  # Windows
# veya
nano .env     # Mac/Linux
```

**`.env` dosyasında ayarlanması gerekenler:**
```env
MONGO_URL=mongodb://localhost:27017/leximind
# veya MongoDB Atlas için:
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/leximind

DB_NAME=leximind

JWT_SECRET_KEY=your-super-secret-key-change-this-12345

OPENAI_API_KEY=sk-your-openai-api-key-here
# API anahtarı almak için: https://platform.openai.com/api-keys

ADMIN_PASSWORD=admin123

CORS_ORIGINS=http://localhost:3000
```

### 3️⃣ Frontend Kurulumu

**Yeni bir terminal açın:**

```bash
# Frontend klasörüne git
cd frontend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur (eğer yoksa)
# Windows:
copy env.example .env
# Mac/Linux:
cp env.example .env
```

**Frontend `.env` dosyası (opsiyonel):**
```env
REACT_APP_API_URL=http://localhost:8000/api
```

### 4️⃣ MongoDB Kurulumu

**Seçenek 1: Yerel MongoDB**
- MongoDB Community Edition'ı yükleyin: https://www.mongodb.com/try/download/community
- MongoDB servisini başlatın
- `.env` dosyasında `MONGO_URL=mongodb://localhost:27017/leximind` kullanın

**Seçenek 2: MongoDB Atlas (Önerilen)**
- https://www.mongodb.com/cloud/atlas adresinden ücretsiz hesap oluşturun
- Cluster oluşturun
- Connection string'i alın
- `.env` dosyasında `MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/leximind` kullanın

### 5️⃣ Uygulamayı Başlat

**Terminal 1 - Backend:**
```bash
cd backend

# Virtual environment aktifse:
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

# veya direkt:
python server.py
```

Backend başarıyla çalışıyorsa şu mesajı göreceksiniz:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Terminal 2 - Frontend:**
```bash
cd frontend

npm start
```

Frontend başarıyla çalışıyorsa tarayıcıda otomatik açılacak:
```
http://localhost:3000
```

### 6️⃣ Kontrol Et

- ✅ Backend API: http://localhost:8000/docs (Swagger UI)
- ✅ Frontend: http://localhost:3000
- ✅ MongoDB bağlantısı: Backend loglarında hata yoksa çalışıyor

## 🎮 Demo Hesaplar

Uygulamaya giriş yapmak için:

| Rol | Kullanıcı Adı | Şifre |
|-----|---------------|-------|
| 👑 Admin | admin | admin123 |
| 👩‍🏫 Öğretmen | demo_teacher | teacher123 |
| 🎓 Öğrenci | demo_student | student123 |

## ⚠️ Önemli Notlar

1. **OpenAI API Anahtarı:**
   - Hikaye oluşturma özelliği için **mutlaka** OpenAI API anahtarı gereklidir
   - API anahtarı almak için: https://platform.openai.com/api-keys
   - `.env` dosyasına `OPENAI_API_KEY=sk-...` şeklinde ekleyin

2. **MongoDB:**
   - İlk çalıştırmada otomatik olarak veritabanı ve koleksiyonlar oluşturulur
   - Demo hesaplar otomatik oluşturulur

3. **Port Çakışması:**
   - Backend port 8000 kullanıyorsa, başka bir uygulama kullanmıyor olmalı
   - Frontend port 3000 kullanıyorsa, başka bir uygulama kullanmıyor olmalı

## 🐛 Sorun Giderme

### Backend başlamıyor
```bash
# Python versiyonunu kontrol et
python --version

# Port 8000 kullanımda mı?
netstat -ano | findstr :8000  # Windows
lsof -i :8000                  # Mac/Linux

# Bağımlılıkları tekrar yükle
pip install -r requirements.txt
```

### Frontend başlamıyor
```bash
# Node.js versiyonunu kontrol et
node --version

# node_modules'ı sil ve tekrar yükle
rm -rf node_modules  # Mac/Linux
rmdir /s node_modules  # Windows
npm install
```

### MongoDB bağlantı hatası
- MongoDB servisinin çalıştığından emin olun
- `.env` dosyasındaki `MONGO_URL` doğru mu kontrol edin
- Firewall MongoDB portunu (27017) engelliyor olabilir

### OpenAI API hatası
- `.env` dosyasında `OPENAI_API_KEY` var mı kontrol edin
- API anahtarının geçerli olduğundan emin olun
- API limitinizi kontrol edin: https://platform.openai.com/usage

## 📞 Yardım

Sorun yaşıyorsanız:
1. Backend ve Frontend loglarını kontrol edin
2. `.env` dosyalarının doğru yapılandırıldığından emin olun
3. Tüm bağımlılıkların yüklü olduğunu kontrol edin

---

**Başarılar! 🚀**

