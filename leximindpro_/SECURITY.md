# 🔒 LexiMindPro Güvenlik Dokümantasyonu

## 🔐 Authentication (Kimlik Doğrulama) Sistemi

LexiMindPro, **JWT (JSON Web Token)** tabanlı bir authentication sistemi kullanmaktadır.

### Nasıl Çalışır?

1. **Kullanıcı Girişi (`POST /api/auth/login`)**
   - Kullanıcı adı ve şifre gönderilir
   - Backend şifreyi doğrular (bcrypt ile hash'lenmiş)
   - Başarılıysa JWT token oluşturulur ve döndürülür

2. **Token Kullanımı**
   - Frontend token'ı alır ve localStorage'a kaydeder
   - Her API isteğinde token'ı `Authorization: Bearer <token>` header'ında gönderir
   - Backend token'ı doğrular ve kullanıcı bilgilerini çıkarır

3. **Rol Tabanlı Yetkilendirme**
   - Her endpoint, hangi rollerin erişebileceğini belirtir
   - `require_role("admin", "teacher")` - Admin veya Teacher
   - `require_admin()` - Sadece Admin
   - `get_current_user` - Giriş yapmış herhangi bir kullanıcı

## 🛡️ Kelime Yönetimi Endpoint'leri Güvenliği

### Mevcut Güvenlik Önlemleri

Tüm kelime yönetimi endpoint'leri **JWT token** ve **rol kontrolü** ile korunmaktadır:

#### 1. `POST /api/v1/words` - Kelime Ekleme
```python
@api_router.post("/v1/words")
async def create_word_v1(
    word: WordModel, 
    current_user: dict = Depends(require_role("admin", "teacher"))
):
```
- ✅ JWT token zorunlu
- ✅ Sadece admin veya teacher erişebilir
- ✅ Token geçersizse → 401 Unauthorized
- ✅ Yetkisiz rol → 403 Forbidden

#### 2. `GET /api/v1/words` - Kelime Listeleme
```python
@api_router.get("/v1/words")
async def get_all_words_v1(
    current_user: dict = Depends(get_current_user)
):
```
- ✅ JWT token zorunlu
- ✅ Giriş yapmış herhangi bir kullanıcı erişebilir
- ✅ Token geçersizse → 401 Unauthorized

#### 3. `PUT /api/v1/words/{word_id}` - Kelime Güncelleme
```python
@api_router.put("/v1/words/{word_id}")
async def update_word_v1(
    word_id: str,
    word_update: UpdateWordModel,
    current_user: dict = Depends(require_role("admin", "teacher"))
):
```
- ✅ JWT token zorunlu
- ✅ Sadece admin veya teacher erişebilir
- ✅ Token geçersizse → 401 Unauthorized
- ✅ Yetkisiz rol → 403 Forbidden

#### 4. `DELETE /api/v1/words/{word_id}` - Kelime Silme
```python
@api_router.delete("/v1/words/{word_id}")
async def delete_word_v1(
    word_id: str,
    current_user: dict = Depends(require_role("admin", "teacher"))
):
```
- ✅ JWT token zorunlu
- ✅ Sadece admin veya teacher erişebilir
- ✅ Token geçersizse → 401 Unauthorized
- ✅ Yetkisiz rol → 403 Forbidden

## 🔑 JWT Token Detayları

### Token İçeriği
```json
{
  "user_id": "uuid-here",
  "username": "admin",
  "role": "admin",
  "exp": 1234567890  // Expiration timestamp
}
```

### Token Süresi
- **Varsayılan:** 24 saat
- `.env` dosyasında `JWT_EXPIRATION_HOURS` ile ayarlanabilir

### Token Güvenliği
- Token'lar `JWT_SECRET_KEY` ile imzalanır
- Secret key `.env` dosyasında saklanır (asla GitHub'a yüklenmez)
- Token'lar expire olur (süresi dolunca geçersiz olur)

## 🚫 Güvenlik Kontrolleri

### 1. Token Doğrulama
```python
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    # Token geçersizse → 401 Unauthorized
```

### 2. Rol Kontrolü
```python
def require_role(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized")
        return current_user
    return role_checker
```

### 3. Admin Özel Kontrolü
```python
def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir")
    return current_user
```

## 📝 Frontend'de Token Kullanımı

### Token'ı Header'a Ekleme
```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:8000/api/v1/words', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    word: "apple",
    translation: "elma",
    level: 1,
    category: "food"
  })
});
```

### Token Yoksa veya Geçersizse
- Backend **401 Unauthorized** döner
- Frontend kullanıcıyı login sayfasına yönlendirmelidir

## ⚠️ Güvenlik Best Practices

1. **Secret Key Güvenliği**
   - `JWT_SECRET_KEY` asla kod içine yazılmamalı
   - `.env` dosyasında saklanmalı
   - Production'da güçlü, rastgele bir key kullanılmalı

2. **HTTPS Kullanımı**
   - Production'da mutlaka HTTPS kullanın
   - Token'lar HTTP üzerinden gönderilmemelidir

3. **Token Süresi**
   - Çok uzun süreli token'lar kullanmayın
   - Refresh token mekanizması eklenebilir

4. **Rate Limiting**
   - Brute force saldırılarına karşı rate limiting eklenebilir

5. **CORS Ayarları**
   - Sadece güvenilir origin'lere izin verin
   - `.env` dosyasında `CORS_ORIGINS` ayarlayın

## 🔍 Hata Kodları

| Kod | Anlam | Açıklama |
|-----|-------|----------|
| 401 | Unauthorized | Token yok, geçersiz veya süresi dolmuş |
| 403 | Forbidden | Token geçerli ama yetki yok |
| 404 | Not Found | Kaynak bulunamadı |
| 500 | Internal Server Error | Sunucu hatası |

## 🧪 Test Etmek İçin

### 1. Token Olmadan İstek (Başarısız)
```bash
curl -X POST http://localhost:8000/api/v1/words \
  -H "Content-Type: application/json" \
  -d '{"word":"test","translation":"test","level":1,"category":"test"}'
# 401 Unauthorized döner
```

### 2. Token ile İstek (Başarılı)
```bash
# Önce login yapın ve token alın
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:8000/api/v1/words \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"word":"test","translation":"test","level":1,"category":"test"}'
# 201 Created döner
```

### 3. Student Rolü ile İstek (Başarısız)
```bash
# Student token'ı ile
curl -X POST http://localhost:8000/api/v1/words \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"word":"test","translation":"test","level":1,"category":"test"}'
# 403 Forbidden döner
```

## ✅ Güvenlik Kontrol Listesi

- [x] JWT token authentication sistemi mevcut
- [x] Rol tabanlı yetkilendirme (RBAC) mevcut
- [x] Tüm kelime yönetimi endpoint'leri korumalı
- [x] Token expiration kontrolü mevcut
- [x] Hata mesajları açıklayıcı
- [ ] Rate limiting (opsiyonel - eklenebilir)
- [ ] Refresh token mekanizması (opsiyonel - eklenebilir)
- [ ] IP whitelist (opsiyonel - eklenebilir)

---

**Önemli:** Tüm endpoint'ler zaten güvenli! JWT token ve rol kontrolü ile korunmaktadır. 🔒

