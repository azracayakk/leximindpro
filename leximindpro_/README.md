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

- Node.js 16+ ve npm
- Python 3.8+
- MongoDB (Atlas veya yerel)

### Kurulum

#### 1. Repository'yi klonla
```bash
git clone https://github.com/yourusername/leximindpro.git
cd leximindpro_/leximindpro_
```

#### 2. Backend Kurulumu
```bash
cd backend

# Virtual environment oluştur (opsiyonel)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Environment dosyası oluştur
cp env.example .env

# .env dosyasını düzenle
# MONGO_URL, JWT_SECRET_KEY ve diğer ayarları yap

# Backend'i başlat
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Kurulumu
```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Frontend'i başlat
npm start
```

Uygulama http://localhost:3000 adresinde açılacak!

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

