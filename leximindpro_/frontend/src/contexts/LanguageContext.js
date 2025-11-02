import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations = {
  tr: {
    // Dashboard
    dashboard: 'Ana Sayfa',
    profile: 'Profil',
    logout: 'Çıkış Yap',
    admin: 'Yönetici',
    teacher: 'Öğretmen',
    student: 'Öğrenci',
    points: 'puan',
    
    // Student Panel
    welcome: 'Hoş geldin',
    todayLearn: 'Bugün Ne Öğrenmek İstersin?',
    studyWords: 'Kelime Çalış',
    playGame: 'Oyun Oyna',
    viewRankings: 'Sıralamayı Gör',
    newWords: 'Yeni kelimeler öğren',
    learnFun: 'Eğlenerek öğren',
    compete: 'Diğer öğrencilerle yarış',
    wordList: 'Kelime Listesi',
    words: 'kelime',
    myGames: 'Oyun Geçmişim',
    noGames: 'Henüz oyun oynamadınız.',
    achievements: 'Başarılar',
    leaderboard: 'Liderlik Tablosu',
    weeklyLeague: 'Haftalık Lig',
    
    // Admin Panel
    adminPanel: 'Yönetici Paneli',
    users: 'Kullanıcılar',
    statistics: 'İstatistikler',
    userManagement: 'Kullanıcı Yönetimi',
    addUser: 'Yeni Kullanıcı Ekle',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    role: 'Rol',
    class: 'Sınıf',
    add: 'Ekle',
    delete: 'Sil',
    wordManagement: 'Kelime Yönetimi',
    addWord: 'Yeni Kelime Ekle',
    english: 'İngilizce',
    turkish: 'Türkçe',
    difficulty: 'Zorluk',
    category: 'Kategori',
    
    // Teacher Panel
    teacherPanel: 'Öğretmen Paneli',
    students: 'Öğrenciler',
    studentList: 'Öğrenci Listesi',
    studentName: 'Öğrenci Adı',
    wordsLearned: 'Öğrenilen Kelime',
    gamesPlayed: 'Oynanan Oyun',
    generalStats: 'Genel İstatistikler',
    totalStudents: 'Toplam Öğrenci',
    totalWords: 'Toplam Kelime',
    totalGames: 'Toplam Oyun',
    
    // Games
    selectGame: 'Oyun Seç',
    flashcardGame: 'Kart Oyunu',
    matchingGame: 'Eşleştirme',
    speedGame: 'Hız Yarışması',
    sentenceGame: 'Cümle Tamamlama',
    storyMode: 'AI Hikaye Modu',
    
    // Common
    loading: 'Yükleniyor...',
    save: 'Kaydet',
    cancel: 'İptal',
    edit: 'Düzenle',
    close: 'Kapat',
    confirm: 'Onayla',
    error: 'Hata',
    success: 'Başarılı',
  },
  en: {
    // Dashboard
    dashboard: 'Dashboard',
    profile: 'Profile',
    logout: 'Logout',
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
    points: 'points',
    
    // Student Panel
    welcome: 'Welcome',
    todayLearn: 'What Do You Want to Learn Today?',
    studyWords: 'Study Words',
    playGame: 'Play Game',
    viewRankings: 'View Rankings',
    newWords: 'Learn new words',
    learnFun: 'Learn while having fun',
    compete: 'Compete with other students',
    wordList: 'Word List',
    words: 'words',
    myGames: 'My Games',
    noGames: 'You haven\'t played any games yet.',
    achievements: 'Achievements',
    leaderboard: 'Leaderboard',
    weeklyLeague: 'Weekly League',
    
    // Admin Panel
    adminPanel: 'Admin Panel',
    users: 'Users',
    statistics: 'Statistics',
    userManagement: 'User Management',
    addUser: 'Add New User',
    username: 'Username',
    password: 'Password',
    role: 'Role',
    class: 'Class',
    add: 'Add',
    delete: 'Delete',
    wordManagement: 'Word Management',
    addWord: 'Add New Word',
    english: 'English',
    turkish: 'Turkish',
    difficulty: 'Difficulty',
    category: 'Category',
    
    // Teacher Panel
    teacherPanel: 'Teacher Panel',
    students: 'Students',
    studentList: 'Student List',
    studentName: 'Student Name',
    wordsLearned: 'Words Learned',
    gamesPlayed: 'Games Played',
    generalStats: 'General Statistics',
    totalStudents: 'Total Students',
    totalWords: 'Total Words',
    totalGames: 'Total Games',
    
    // Games
    selectGame: 'Select Game',
    flashcardGame: 'Flashcard Game',
    matchingGame: 'Matching Game',
    speedGame: 'Speed Game',
    sentenceGame: 'Sentence Game',
    storyMode: 'AI Story Mode',
    
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    error: 'Error',
    success: 'Success',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'tr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'tr' ? 'en' : 'tr');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

