# LexiMindPro - Production Deployment Guide 🚀

## 📋 Production Deployment Checklist

### 1. **Backend Hazırlık**

#### MongoDB Kurulumu
- **Seçenek 1: MongoDB Atlas (Önerilen - Cloud)**
  - https://www.mongodb.com/cloud/atlas adresinden ücretsiz cluster oluştur
  - Connection string'i al (örnek: `mongodb+srv://username:password@cluster.mongodb.net/`)

- **Seçenek 2: Yerel MongoDB**
  - https://www.mongodb.com/try/download/community adresinden indir
  - MongoDB servisini başlat

#### Backend Environment Variables
`backend/.env` dosyası oluştur:

```env
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
# Veya Atlas için: mongodb+srv://username:password@cluster.mongodb.net/

DB_NAME=leximind

# JWT Configuration - PRODUCTION'DA MUTLAKA DEĞİŞTİR!
JWT_SECRET_KEY=your-super-secret-production-key-change-this-immediately

# AI Configuration (Opsiyonel - AI özellikleri için)
EMERGENT_LLM_KEY=your-emergent-api-key

# Admin Configuration - PRODUCTION'DA DEĞİŞTİR!
ADMIN_PASSWORD=secure-admin-password-change-this

# CORS Configuration - PRODUCTION'DA DOMAIN BELİRT!
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Backend Bağımlılıkları
```bash
cd backend
pip install -r requirements.txt
```

#### Backend Başlatma
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### 2. **Frontend Hazırlık**

#### Frontend Environment Variables
`frontend/.env` dosyası oluştur:

```env
# Production API URL - Backend domain'inizi yazın!
REACT_APP_API_URL=https://your-api-domain.com/api

# Development için:
# REACT_APP_API_URL=http://localhost:8000/api
```

#### Frontend Bağımlılıkları
```bash
cd frontend
npm install
```

#### Production Build
```bash
npm run build
```

Bu komut `frontend/build` klasörü oluşturur. Bu klasörü hosting'e yükleyeceksin.

---

### 3. **Deployment Seçenekleri**

#### A. **Vercel** (Önerilen - React için ücretsiz)
```bash
# Vercel CLI kurulumu
npm i -g vercel

# Proje root'unda
cd leximindpro_
vercel

# Domain ekle
vercel --prod
```

**Not:** Backend'i ayrı bir serviste (Render, Railway, Heroku) hostla.

#### B. **Netlify**
```bash
# Netlify CLI kurulumu
npm i -g netlify-cli

# Frontend build klasörünü deploy et
cd frontend
npm run build
netlify deploy --prod --dir=build
```

#### C. **GitHub Pages**
```bash
cd frontend
npm run build

# build klasörünü GitHub Pages'e pushla
git add build
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix frontend/build origin gh-pages
```

#### D. **Custom VPS/Dedicated Server**

**NGINX Configuration** (`/etc/nginx/sites-available/leximindpro`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        root /path/to/leximindpro_/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}

# Backend için reverse proxy
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 4. **SSL/HTTPS Kurulumu (Let's Encrypt)**

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### 5. **Güvenlik Kontrol Listesi** 🔒

- [ ] `JWT_SECRET_KEY` değiştirildi
- [ ] `ADMIN_PASSWORD` değiştirildi
- [ ] `CORS_ORIGINS` production domain'e ayarlandı
- [ ] MongoDB bağlantısı güvenli
- [ ] `.env` dosyası `.gitignore`'da
- [ ] HTTPS aktif
- [ ] Firewall ayarları yapıldı
- [ ] Demo hesapları production'da kapat (opsiyonel)

---

### 6. **Post-Deployment Test**

- [ ] Login/Logout çalışıyor
- [ ] Admin paneli erişilebilir
- [ ] Teacher paneli erişilebilir
- [ ] Student paneli erişilebilir
- [ ] Oyunlar çalışıyor
- [ ] API istekleri başarılı
- [ ] MongoDB bağlantısı stabil
- [ ] Mobil responsive çalışıyor

---

### 7. **Yedekleme Stratejisi** 💾

#### MongoDB Backup
```bash
# MongoDB Atlas'ta otomatik backup aktif
# Veya yerel için:
mongodump --uri="mongodb://localhost:27017" --db=leximind --out=/path/to/backup
```

#### Kod Yedekleme
```bash
# Git repository'ye push
git add .
git commit -m "Production release"
git push origin main
```

---

### 8. **Monitoring & Logs** 📊

#### Backend Logs
```bash
# Uvicorn logs
tail -f /var/log/uvicorn.log

# Application logs
python -m uvicorn app.main:app --log-level info
```

#### Frontend Logs
- Browser console errors
- Network tab
- React DevTools

---

### 9. **Demo Hesaplar** 👥

Production'da otomatik oluşturulan demo hesaplar:

| Rol | Kullanıcı Adı | Şifre |
|-----|---------------|-------|
| 👑 Admin | admin | admin123 (DEĞİŞTİR!) |
| 👩‍🏫 Öğretmen | demo_teacher | teacher123 |
| 🎓 Öğrenci | demo_student | student123 |

**ÖNEMLİ:** Production'da admin şifresini mutlaka değiştir!

---

### 10. **Sorun Giderme** 🔧

#### MongoDB Bağlantı Hatası
```bash
# MongoDB servisi çalışıyor mu?
sudo systemctl status mongod

# MongoDB başlat
sudo systemctl start mongod
```

#### CORS Hataları
- Backend `.env`'de `CORS_ORIGINS` doğru mu?
- Frontend domain'i listede var mı?

#### Build Hataları
```bash
# Cache temizle
cd frontend
rm -rf node_modules build
npm install
npm run build
```

---

## 🎉 Başarılı Deployment!

Production'da çalışan uygulamanız hazır! Herhangi bir sorun için GitHub Issues'da bildirin.

## 📞 Destek

- GitHub: https://github.com/yourusername/leximindpro
- Email: support@leximindpro.com

---

**Son Güncelleme:** Kasım 2025

