# 🎓 LexiMindPro

İngilizce Kelime Öğrenme Platformu - Modern, interaktif ve eğlenceli bir dil öğrenme deneyimi.

![LexiMindPro](https://img.shields.io/badge/LexiMindPro-Beta-blue)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110.1-009688)
![MongoDB](https://img.shields.io/badge/MongoDB-4.5.0-47A248)

## 🌟 Özellikler

### 👨‍💼 Admin Paneli
- Kullanıcı yönetimi (admin, öğretmen, öğrenci)
- Kelime yönetimi ve kategorilendirme
- Liderlik tablosu ve istatistikler
- Öğrenci başarı takibi
- AI destekli kelime örneği oluşturma

### 👩‍🏫 Öğretmen Paneli
- Öğrenci performans takibi
- Aktivite heatmap'i
- Progression timeline
- Goal tracking ve hedef belirleme
- Haftalık aktivite raporları

### 🎓 Öğrenci Paneli
- 5 farklı interaktif oyun:
  - 📚 **Flashcard Game** - Kelime kartları
  - 🎯 **Matching Game** - Eşleştirme
  - ⚡ **Speed Game** - Hız yarışması
  - 📝 **Sentence Game** - Cümle oluşturma
  - 📖 **Story Mode** - AI destekli hikaye modu
- Başarı puanları ve rozetler
- Liderlik tablosu
- Kelime koleksiyonu
- Haftalık lig sistemi

## 🚀 Hızlı Başlangıç

### Gereksinimler

- **Node.js 16+** ve npm (https://nodejs.org/)
- **Python 3.8+** (https://www.python.org/)
- **MongoDB** (Atlas veya yerel - https://www.mongodb.com/)
- **Git** (https://git-scm.com/)

### Kurulum Adımları (Detaylı)

#### 1. Repository'yi Klonla
```bash
git clone https://github.com/azracayakk/leximindpro.git
cd leximindpro_version_beta1/leximindpro_
```

#### 2. Backend Kurulumu

**Adım 1: Backend klasörüne git**
```bash
cd backend
```

**Adım 2: Python Virtual Environment oluştur (Önerilir)**
```bash
# Windows için:
python -m venv venv
venv\Scripts\activate

# Mac/Linux için:
python3 -m venv venv
source venv/bin/activate
```

**Adım 3: Bağımlılıkları yükle**
```bash
pip install -r requirements.txt
```

**Adım 4: Environment dosyası oluştur**
```bash
# Windows için:
copy env.example .env

# Mac/Linux için:
cp env.example .env
```

**Adım 5: .env dosyasını düzenle**
`.env` dosyasını açın ve şu değerleri ayarlayın:
```env
MONGO_URL=mongodb://localhost:27017/leximind
# veya MongoDB Atlas için:
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/leximind

DB_NAME=leximind

JWT_SECRET_KEY=your-super-secret-key-change-this-in-production-12345

EMERGENT_LLM_KEY=your-emergent-api-key-optional

ADMIN_PASSWORD=admin123

CORS_ORIGINS=http://localhost:3000
```

**Adım 6: Backend'i başlat**
```bash
# Windows/Mac/Linux:
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000

# veya direkt:
python server.py
```

Backend http://localhost:8000 adresinde çalışacak!

#### 3. Frontend Kurulumu

**Adım 1: Yeni bir terminal açın ve frontend klasörüne gidin**
```bash
cd frontend
```

**Adım 2: Bağımlılıkları yükle**
```bash
npm install
```

**Adım 3: Environment dosyası oluştur (opsiyonel)**
```bash
# Windows için:
copy env.example .env

# Mac/Linux için:
cp env.example .env
```

**Adım 4: .env dosyasını düzenle (opsiyonel)**
`.env` dosyasını açın ve backend URL'ini ayarlayın:
```env
REACT_APP_API_URL=http://localhost:8000/api
```

**Adım 5: Frontend'i başlat**
```bash
npm start
```

Frontend http://localhost:3000 adresinde açılacak!

### ✅ Başlatma Kontrol Listesi

- [ ] Node.js yüklü mü? (`node --version`)
- [ ] Python yüklü mü? (`python --version`)
- [ ] MongoDB çalışıyor mu? (yerel veya Atlas bağlantısı)
- [ ] Backend bağımlılıkları yüklendi mi? (`pip list`)
- [ ] Frontend bağımlılıkları yüklendi mi? (`npm list`)
- [ ] Backend `.env` dosyası oluşturuldu mu?
- [ ] MongoDB URL'i `.env` dosyasında doğru mu?
- [ ] Backend çalışıyor mu? (http://localhost:8000/docs)
- [ ] Frontend çalışıyor mu? (http://localhost:3000)

### 🐛 Sorun Giderme

**Backend başlamıyor:**
- Python versiyonunu kontrol edin (3.8+)
- Virtual environment aktif mi?
- Port 8000 kullanımda mı? (`netstat -ano | findstr :8000`)

**Frontend başlamıyor:**
- Node.js versiyonunu kontrol edin (16+)
- `node_modules` klasörünü silip `npm install` tekrar çalıştırın
- Port 3000 kullanımda mı?

**MongoDB bağlantı hatası:**
- MongoDB servisi çalışıyor mu?
- `.env` dosyasındaki `MONGO_URL` doğru mu?
- Firewall MongoDB portunu (27017) engelliyor mu?

## 🎮 Demo Hesaplar

| Rol | Kullanıcı Adı | Şifre |
|-----|---------------|-------|
| 👑 Admin | admin | admin123 |
| 👩‍🏫 Öğretmen | demo_teacher | teacher123 |
| 🎓 Öğrenci | demo_student | student123 |

## 📚 Teknoloji Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Routing
- **React Toastify** - Bildirimler
- **CSS3** - Modern styling

### Backend
- **FastAPI** - Python web framework
- **Motor** - MongoDB async driver
- **PyJWT** - Authentication
- **Passlib** - Password hashing
- **Uvicorn** - ASGI server

### Database
- **MongoDB** - NoSQL database

### Optional (AI Features)
- **Emergent LLM** - AI entegrasyonu

## 🗂️ Proje Yapısı

```
leximindpro_/
├── backend/
│   ├── server.py           # FastAPI server
│   ├── requirements.txt    # Python dependencies
│   ├── env.example         # Environment variables template
│   └── .env               # Environment variables (oluşturulmalı)
│
├── frontend/
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.js
│   │   │   ├── TeacherPanel.js
│   │   │   ├── StudentPanel.js
│   │   │   ├── Login.js
│   │   │   └── games/     # Oyun bileşenleri
│   │   ├── App.js         # Ana component
│   │   └── index.js       # Entry point
│   ├── package.json
│   └── .env              # Frontend environment variables
│
├── README.md              # Bu dosya
└── DEPLOYMENT.md          # Production deployment guide
```

## 🌐 Production Deploy

Detaylı deployment rehberi için: [DEPLOYMENT.md](DEPLOYMENT.md)

### Kısa Özet:
1. MongoDB Atlas cluster oluştur
2. Backend'i hostla (Render, Railway, Heroku)
3. Frontend'i build al (`npm run build`)
4. Frontend'i Vercel/Netlify'a deploy et
5. Environment variables'ları ayarla
6. SSL sertifikası ekle

## 🔒 Güvenlik

- JWT token-based authentication
- Bcrypt password hashing
- CORS protection
- Role-based access control
- Environment variables için secrets management

## 🤝 Katkıda Bulunma

Pull request'ler kabul edilir! Büyük değişiklikler için önce bir issue açın.

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE.txt` dosyasına bakın.

## 🐛 Bilinen Sorunlar

- [ ] AI features emergentintegrations paketi gerektiriyor (opsiyonel)
- [ ] Bazı tarayıcılarda emoji desteği sınırlı olabilir

## 🗺️ Roadmap

- [ ] Mobil uygulama (React Native)
- [ ] Çok dilli dil desteği (TR, EN, DE, FR)
- [ ] Sosyal özellikler (arkadaş sistemi)
- [ ] Daha fazla oyun modu
- [ ] Offline mod desteği
- [ ] Ses telaffuz özelliği

## 📞 İletişim

- **GitHub Issues**: https://github.com/yourusername/leximindpro/issues
- **Email**: support@leximindpro.com

## 🙏 Teşekkürler

Bu projeye katkıda bulunan herkese teşekkür ederiz!

---

**LexiMindPro** - Modern İngilizce Kelime Öğrenme Platformu 🚀

Made with ❤️ using React & FastAPI

