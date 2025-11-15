import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './AdminPanel.css';

function AdminPanel({ user, token, apiUrl }) {
  const [showDashboard, setShowDashboard] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  
  // Force CSS injection for modern admin dashboard - ensures styles apply
  useEffect(() => {
    const styleId = 'admin-dashboard-forced-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = `
        /* Modern Admin Dashboard - Tailwind Prensip Uygulaması */
        /* 1. Arka plan: bg-gradient-to-br from-white to-[#eef7ff] */
        main.dashboard-content .admin-dashboard-modern,
        .admin-dashboard-modern,
        .dashboard-content .admin-dashboard-modern,
        div.admin-dashboard-modern {
          background: linear-gradient(to bottom right, #ffffff 0%, #eef7ff 100%) !important;
          min-height: calc(100vh - 80px) !important;
          padding: 0 !important;
          margin: -30px -30px 0 -30px !important;
          width: calc(100% + 60px) !important;
          max-width: none !important;
          position: relative !important;
          box-sizing: border-box !important;
        }
        
        /* 2. Ana container: max-w-6xl mx-auto px-6 py-16 */
        .admin-dashboard-container {
          max-width: 1152px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-left: 24px !important;
          padding-right: 24px !important;
          padding-top: 64px !important;
          padding-bottom: 64px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* 3. Başlık: text-4xl font-bold text-center text-gray-800 mb-4 */
        .welcome-title-modern {
          font-size: 2.25rem !important;
          font-weight: 700 !important;
          text-align: center !important;
          color: #1f2937 !important;
          margin: 0 0 16px 0 !important;
          line-height: 1.2 !important;
        }
        
        /* 3. Alt açıklama: text-gray-500 text-center text-lg mb-14 */
        .welcome-subtitle-modern {
          color: #6b7280 !important;
          text-align: center !important;
          font-size: 1.125rem !important;
          margin: 0 0 56px 0 !important;
          line-height: 1.6 !important;
        }
        
        /* 4. Kart Grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 */
        .dashboard-cards-modern {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 32px !important;
          margin-top: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        @media (min-width: 640px) {
          .dashboard-cards-modern {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        @media (min-width: 1024px) {
          .dashboard-cards-modern {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        
        /* 5. Kart Bileşeni: bg-white p-8 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] */
        .dashboard-card-modern {
          background-color: #ffffff !important;
          padding: 32px !important;
          border-radius: 20px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          text-align: center !important;
          border: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          width: 100% !important;
        }
        
        /* hover:shadow-lg hover:scale-[1.02] */
        .dashboard-card-modern:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          transform: scale(1.02) !important;
        }
        
        /* 6. İkon: text-4xl mb-4 */
        .card-icon-modern {
          font-size: 3rem !important;
          margin-bottom: 16px !important;
          display: block !important;
          line-height: 1 !important;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .dashboard-card-modern:hover .card-icon-modern {
          transform: scale(1.05) !important;
        }
        
        /* Başlık: text-lg font-semibold text-gray-800 mb-1 */
        .card-title-modern {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 0 0 4px 0 !important;
          line-height: 1.4 !important;
        }
        
        /* Açıklama: text-sm text-gray-500 */
        .card-description-modern {
          font-size: 0.875rem !important;
          color: #6b7280 !important;
          margin: 0 !important;
          line-height: 1.5 !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Keep styles persistent
    };
  }, []);
  const [users, setUsers] = useState([]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student', class_name: '', institution_id: '' });
  const [newWord, setNewWord] = useState({ english: '', turkish: '', difficulty: 1, category: 'general' });
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [systemReport, setSystemReport] = useState(null);
  const [systemReportLoading, setSystemReportLoading] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    description: '',
    teacher_limit: 5,
    student_limit: 100
  });
  const [assignTeacherForm, setAssignTeacherForm] = useState({
    institution_id: '',
    teacher_id: ''
  });
  const [classForm, setClassForm] = useState({
    institution_id: '',
    name: '',
    description: '',
    teacher_id: ''
  });
  const [masterWordsLoading, setMasterWordsLoading] = useState(false);
  const [pendingWords, setPendingWords] = useState([]);
  const [approvedWordsCount, setApprovedWordsCount] = useState(0);
  const [wordPacks, setWordPacks] = useState([]);
  const [wordPackForm, setWordPackForm] = useState({
    name: '',
    description: '',
    level: 'A1',
    words: ''
  });
  const [categories, setCategories] = useState(['general', 'animals', 'food', 'education', 'verbs', 'adjectives']);
  const [systemSettings, setSystemSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [league, setLeague] = useState(null);

  useEffect(() => {
    if (!showDashboard) {
      if (activeTab === 'users') {
        fetchUsers();
        fetchInstitutions();
      } else if (activeTab === 'words') {
        fetchWords();
      } else if (activeTab === 'leaderboard') {
        fetchLeaderboard();
      } else if (activeTab === 'achievements') {
        fetchAchievements();
      } else if (activeTab === 'league') {
        fetchLeague();
      } else if (activeTab === 'system') {
        fetchSystemReport();
      } else if (activeTab === 'institutions') {
        fetchInstitutions();
        if (users.length === 0) {
          fetchUsers();
        }
      } else if (activeTab === 'masterWords') {
        fetchMasterWords();
      } else if (activeTab === 'settings') {
        fetchSystemSettings();
      }
    }
  }, [activeTab, showDashboard]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/words`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWords(data);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    }
    setLoading(false);
  };

  const fetchSystemReport = async () => {
    setSystemReportLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/system-report`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSystemReport(data);
      }
    } catch (error) {
      console.error('Error fetching system report:', error);
    }
    setSystemReportLoading(false);
  };

  const fetchInstitutions = async () => {
    setInstitutionsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/institutions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data.institutions || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
    setInstitutionsLoading(false);
  };

  const fetchMasterWords = async () => {
    setMasterWordsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/master-words`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingWords(data.pending_words || []);
        setApprovedWordsCount(data.approved_count || 0);
        setWordPacks(data.word_packs || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching master words:', error);
    }
    setMasterWordsLoading(false);
  };

  const fetchSystemSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/system-settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSystemSettings(data);
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
    setSettingsLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      });
      if (response.ok) {
        toast.success('✅ Kullanıcı başarıyla oluşturuldu!');
        setNewUser({ username: '', password: '', role: 'student', class_name: '', institution_id: '' });
        fetchUsers();
        if (activeTab === 'institutions') {
          fetchInstitutions();
        }
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Kullanıcı oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleCreateInstitution = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/admin/institutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(institutionForm)
      });
      if (response.ok) {
        toast.success('🏛️ Kurum oluşturuldu');
        setInstitutionForm({ name: '', description: '', teacher_limit: 5, student_limit: 100 });
        fetchInstitutions();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Kurum oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleAssignTeacher = async (event) => {
    event.preventDefault();
    if (!assignTeacherForm.institution_id || !assignTeacherForm.teacher_id) {
      toast.error('Lütfen kurum ve öğretmen seçin.');
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/admin/institutions/${assignTeacherForm.institution_id}/assign-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ teacher_id: assignTeacherForm.teacher_id })
      });
      if (response.ok) {
        toast.success('👩‍🏫 Öğretmen kuruma atandı');
        setAssignTeacherForm({ institution_id: '', teacher_id: '' });
        fetchInstitutions();
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Öğretmen atanamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleCreateInstitutionClass = async (event) => {
    event.preventDefault();
    if (!classForm.institution_id || !classForm.name.trim()) {
      toast.error('Lütfen kurum ve sınıf adını girin.');
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/admin/institutions/${classForm.institution_id}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: classForm.name,
          description: classForm.description,
          institution_id: classForm.institution_id,
          teacher_id: classForm.teacher_id || null
        })
      });
      if (response.ok) {
        toast.success('🏫 Sınıf oluşturuldu');
        setClassForm({ institution_id: classForm.institution_id, name: '', description: '', teacher_id: '' });
        fetchInstitutions();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Sınıf oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleApproveWord = async (wordId) => {
    try {
      const response = await fetch(`${apiUrl}/admin/words/${wordId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('✅ Kelime onaylandı');
        fetchMasterWords();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Kelime onaylanamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleRejectWord = async (wordId) => {
    if (!window.confirm('Bu kelimeyi kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`${apiUrl}/teacher/words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('🗑️ Kelime silindi');
        fetchMasterWords();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Kelime silinemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleCreateWordPack = async (event) => {
    event.preventDefault();
    const wordsArray = wordPackForm.words
      .split(',')
      .map((word) => word.trim())
      .filter(Boolean);
    try {
      const response = await fetch(`${apiUrl}/admin/word-packs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: wordPackForm.name,
          description: wordPackForm.description,
          level: wordPackForm.level,
          words: wordsArray
        })
      });
      if (response.ok) {
        toast.success('📦 Kelime paketi oluşturuldu');
        setWordPackForm({ name: '', description: '', level: 'A1', words: '' });
        fetchMasterWords();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Kelime paketi oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      toast.info('Bu kategori zaten mevcut.');
      return;
    }
    setCategories((prev) => [...prev, newCategory.trim()]);
    setNewCategory('');
  };

  const handleRemoveCategory = (category) => {
    setCategories((prev) => prev.filter((item) => item !== category));
  };

  const handleSettingsSave = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/admin/system-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          maintenance_mode: systemSettings?.maintenance_mode,
          feature_flags: systemSettings?.feature_flags,
          email: systemSettings?.email,
          api_keys: systemSettings?.api_keys,
          categories
        })
      });
      if (response.ok) {
        toast.success('⚙️ Ayarlar güncellendi');
        fetchSystemSettings();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Ayarlar güncellenemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const toggleMaintenanceMode = () => {
    setSystemSettings((prev) => ({
      ...prev,
      maintenance_mode: !prev?.maintenance_mode
    }));
  };

  const toggleFeatureFlag = (flagKey) => {
    setSystemSettings((prev) => ({
      ...prev,
      feature_flags: {
        ...(prev?.feature_flags || {}),
        [flagKey]: !prev?.feature_flags?.[flagKey]
      }
    }));
  };

  const handleEmailChange = (field, value) => {
    setSystemSettings((prev) => ({
      ...prev,
      email: {
        ...(prev?.email || {}),
        [field]: value
      }
    }));
  };

  const handleApiKeyChange = (field, value) => {
    setSystemSettings((prev) => ({
      ...prev,
      api_keys: {
        ...(prev?.api_keys || {}),
        [field]: value
      }
    }));
  };

  const handleCreateWord = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newWord)
      });
      if (response.ok) {
        toast.success('✅ Kelime başarıyla eklendi!');
        setNewWord({ english: '', turkish: '', difficulty: 1, category: 'general' });
        fetchWords();
      } else {
        toast.error('Kelime eklenemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('🗑️ Kullanıcı silindi');
        fetchUsers();
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!window.confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${apiUrl}/words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('🗑️ Kelime silindi');
        fetchWords();
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Lütfen bir CSV dosyası seçin');
      return;
    }

    setCsvLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header if exists
        const startIndex = lines[0].toLowerCase().includes('english') ? 1 : 0;
        const wordsData = [];

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 2) {
            wordsData.push({
              english: parts[0],
              turkish: parts[1],
              difficulty: parseInt(parts[2]) || 1,
              category: parts[3] || 'general'
            });
          }
        }

        const response = await fetch(`${apiUrl}/words/bulk-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ words: wordsData, auto_generate_examples: false })
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(`✅ ${data.count} kelime başarıyla yüklendi!`);
          setCsvFile(null);
          fetchWords();
        } else {
          toast.error('Toplu yükleme başarısız');
        }
      } catch (error) {
        toast.error('CSV işleme hatası: ' + error.message);
      } finally {
        setCsvLoading(false);
      }
    };

    reader.readAsText(csvFile);
  };

  const generateAIExamples = async (word) => {
    setAiLoading(true);
    try {
      const response = await fetch(`${apiUrl}/ai/generate-examples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          word: word.english,
          turkish: word.turkish,
          level: word.category || 'beginner',
          count: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`✨ ${data.examples.length} örnek cümle oluşturuldu!`);
        // Optionally update the word with new examples
        fetchWords();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Örnek cümle oluşturulamadı');
      }
    } catch (error) {
      toast.error('AI servisi kullanılamıyor: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
    setLoading(false);
  };

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const [achResponse, userAchResponse] = await Promise.all([
        fetch(`${apiUrl}/achievements`),
        fetch(`${apiUrl}/achievements/user`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      if (achResponse.ok) {
        const achData = await achResponse.json();
        setAchievements(achData);
      }
      
      if (userAchResponse.ok) {
        const userAchData = await userAchResponse.json();
        setUserAchievements(userAchData);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
    setLoading(false);
  };

  const fetchLeague = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/league/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeague(data);
      }
    } catch (error) {
      console.error('Error fetching league:', error);
    }
    setLoading(false);
  };

  const hasAchievement = (achievementId) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  // Filter words based on difficulty and category
  const filteredWords = words.filter(word => {
    const matchesDifficulty = filterDifficulty === 'all' || word.difficulty === parseInt(filterDifficulty);
    const matchesCategory = filterCategory === 'all' || word.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesDifficulty && matchesCategory;
  });

  const dashboardCards = [
    {
      id: 'system',
      icon: '📈',
      title: 'Sistem Raporları',
      description: 'Platformun genel sağlığını izleyin',
      color: '#2563eb',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('system');
      }
    },
    {
      id: 'institutions',
      icon: '🏛️',
      title: 'Kurum & Sınıf Yönetimi',
      description: 'Okulları ve sınıfları yönetin',
      color: '#8b5cf6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('institutions');
      }
    },
    {
      id: 'masterWords',
      icon: '📚',
      title: 'Ana Kelime Kütüphanesi',
      description: 'Kelime onaylama ve paket yönetimi',
      color: '#10b981',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('masterWords');
      }
    },
    {
      id: 'settings',
      icon: '⚙️',
      title: 'Sistem Ayarları',
      description: 'Bakım modu ve özellik yönetimi',
      color: '#f97316',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('settings');
      }
    },
    {
      id: 'users',
      icon: '👥',
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcı listesi ve yönetimi',
      color: '#3b82f6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('users');
      }
    },
    {
      id: 'words',
      icon: '📝',
      title: 'Kelime Yönetimi',
      description: 'Kelime setleri oluştur ve düzenle',
      color: '#f59e0b',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('words');
      }
    }
  ];

  if (showDashboard) {
    const mainCards = dashboardCards.slice(0, 6);
    const adminCard = dashboardCards[6];
    
    return (
      <div 
        className="admin-dashboard-modern"
        style={{
          background: 'linear-gradient(to bottom right, #ffffff 0%, #eef7ff 100%)',
          minHeight: 'calc(100vh - 80px)',
          padding: 0,
          margin: '-30px -30px 0 -30px',
          width: 'calc(100% + 60px)',
          maxWidth: 'none',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="admin-dashboard-container"
          style={{
            maxWidth: '1152px',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingTop: '64px',
            paddingBottom: '64px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="welcome-section-modern"
            style={{
              textAlign: 'center',
              marginBottom: 0
            }}
          >
            <h1 
              className="welcome-title-modern"
              style={{
                fontSize: '2.25rem',
                fontWeight: 700,
                textAlign: 'center',
                color: '#1f2937',
                margin: '0 0 16px 0',
                lineHeight: 1.2
              }}
            >
              Hoş Geldin, admin!
            </h1>
            <p 
              className="welcome-subtitle-modern"
              style={{
                color: '#6b7280',
                textAlign: 'center',
                fontSize: '1.125rem',
                margin: '0 0 56px 0',
                lineHeight: 1.6
              }}
            >
              İngilizce öğrenme yolculuğuna hazır mısın?
            </p>
          </div>
          
          <div 
            className="dashboard-cards-modern"
            style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth >= 1024 ? 'repeat(3, 1fr)' : window.innerWidth >= 640 ? 'repeat(2, 1fr)' : '1fr',
              gap: '32px',
              marginTop: 0,
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {mainCards.map((card) => (
              <div
                key={card.id}
                className="dashboard-card-modern"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Card clicked:', card.id, card.title);
                  if (card.onClick) {
                    card.onClick();
                  } else {
                    console.error('No onClick function for card:', card.id);
                  }
                }}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'center',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div 
                  className="card-icon-modern"
                  style={{
                    fontSize: '3rem',
                    marginBottom: '16px',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  {card.icon}
                </div>
                <h3 
                  className="card-title-modern"
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 4px 0',
                    lineHeight: 1.4
                  }}
                >
                  {card.title}
                </h3>
                <p 
                  className="card-description-modern"
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
          
          {adminCard && (
            <div 
              className="dashboard-cards-bottom-modern"
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginTop: '32px',
                width: '100%'
              }}
            >
              <div
                className="dashboard-card-modern"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (adminCard.onClick) {
                    adminCard.onClick();
                  }
                }}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'center',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  maxWidth: '300px',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div 
                  className="card-icon-modern"
                  style={{
                    fontSize: '3rem',
                    marginBottom: '16px',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  {adminCard.icon}
                </div>
                <h3 
                  className="card-title-modern"
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 4px 0',
                    lineHeight: 1.4
                  }}
                >
                  {adminCard.title}
                </h3>
                <p 
                  className="card-description-modern"
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}
                >
                  {adminCard.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="panel-header">
        
        <button className="back-to-dashboard" onClick={() => setShowDashboard(true)}>
          Ana Menü
        </button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'system' ? 'active' : ''} 
          onClick={() => setActiveTab('system')}
        >
          📈 Sistem Raporları
        </button>
        <button 
          className={activeTab === 'institutions' ? 'active' : ''} 
          onClick={() => setActiveTab('institutions')}
        >
          🏛️ Kurumlar
        </button>
        <button 
          className={activeTab === 'masterWords' ? 'active' : ''} 
          onClick={() => setActiveTab('masterWords')}
        >
          📚 Ana Kütüphane
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Ayarlar
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          👥 Kullanıcılar
        </button>
        <button 
          className={activeTab === 'words' ? 'active' : ''} 
          onClick={() => setActiveTab('words')}
        >
          📚 Kelimeler
        </button>
        <button 
          className={activeTab === 'leaderboard' ? 'active' : ''} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Liderlik Tablosu
        </button>
        <button 
          className={activeTab === 'achievements' ? 'active' : ''} 
          onClick={() => setActiveTab('achievements')}
        >
          🏅 Başarılar
        </button>
        <button 
          className={activeTab === 'league' ? 'active' : ''} 
          onClick={() => setActiveTab('league')}
        >
          🏆 Haftalık Lig
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''} 
          onClick={() => setActiveTab('stats')}
        >
          📊 İstatistikler
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'system' && (
          <div className="system-section">
            <h3>Sistem Raporları</h3>
            {systemReportLoading ? (
              <p>Yükleniyor...</p>
            ) : !systemReport ? (
              <p>Rapor verisi alınamadı.</p>
            ) : (
              <>
                <div className="report-grid">
                  <div className="report-card">
                    <h4>Kullanıcılar</h4>
                    <ul>
                      <li>Toplam Öğretmen: <strong>{systemReport.users?.total_teachers ?? 0}</strong></li>
                      <li>Toplam Öğrenci: <strong>{systemReport.users?.total_students ?? 0}</strong></li>
                      <li>Bugün Yeni: <strong>{systemReport.users?.new_today ?? 0}</strong></li>
                      <li>Bu Hafta Yeni: <strong>{systemReport.users?.new_this_week ?? 0}</strong></li>
                      <li>Aktif Şu An: <strong>{systemReport.users?.active_now ?? 0}</strong></li>
                    </ul>
                  </div>
                  <div className="report-card">
                    <h4>İçerik</h4>
                    <ul>
                      <li>Onaylı Kelime Sayısı: <strong>{systemReport.content?.total_words ?? 0}</strong></li>
                    </ul>
                    <h5>Popüler Kelimeler</h5>
                    <ul className="compact-list">
                      {(systemReport.content?.popular_words || []).map((word) => (
                        <li key={word._id}>
                          <strong>{word._id}</strong> {word.turkish ? `(${word.turkish})` : ''} – {word.count || 0}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="report-card">
                    <h4>Aktivite</h4>
                    <h5>Günlük Oyun Sayısı</h5>
                    <ul className="compact-list">
                      {(systemReport.activity?.daily_games || []).map((item) => (
                        <li key={item.date}>
                          {item.date}: <strong>{item.count}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="report-card">
                    <h4>Lig Zirvesi</h4>
                    <ul className="compact-list">
                      {(systemReport.activity?.league_top || []).map((standing) => (
                        <li key={standing.user_id || standing.username}>
                          #{standing.rank || '-'} {standing.username} – {standing.points} puan
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="report-timestamp">
                  Güncelleme: {new Date(systemReport.generated_at).toLocaleString('tr-TR')}
                </p>
              </>
            )}
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="institutions-section">
            <h3>Kurum ve Sınıf Yönetimi</h3>

            <form className="create-form" onSubmit={handleCreateInstitution}>
              <h4>Yeni Kurum Ekle</h4>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Kurum Adı"
                  value={institutionForm.name}
                  onChange={(e) => setInstitutionForm({ ...institutionForm, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Açıklama (opsiyonel)"
                  value={institutionForm.description}
                  onChange={(e) => setInstitutionForm({ ...institutionForm, description: e.target.value })}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Öğretmen Kotası"
                  value={institutionForm.teacher_limit}
                  onChange={(e) => setInstitutionForm({ ...institutionForm, teacher_limit: parseInt(e.target.value, 10) || 1 })}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Öğrenci Kotası"
                  value={institutionForm.student_limit}
                  onChange={(e) => setInstitutionForm({ ...institutionForm, student_limit: parseInt(e.target.value, 10) || 1 })}
                />
                <button type="submit">Ekle</button>
              </div>
            </form>

            <form className="create-form secondary" onSubmit={handleAssignTeacher}>
              <h4>Öğretmen Ata</h4>
              <div className="form-row">
                <select
                  value={assignTeacherForm.institution_id}
                  onChange={(e) => setAssignTeacherForm({ ...assignTeacherForm, institution_id: e.target.value })}
                  required
                >
                  <option value="">Kurum Seçin</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </select>
                <select
                  value={assignTeacherForm.teacher_id}
                  onChange={(e) => setAssignTeacherForm({ ...assignTeacherForm, teacher_id: e.target.value })}
                  required
                >
                  <option value="">Öğretmen Seçin</option>
                  {users.filter((u) => u.role === 'teacher').map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.username} {teacher.institution_name ? `(${teacher.institution_name})` : ''}
                    </option>
                  ))}
                </select>
                <button type="submit">Ata</button>
              </div>
            </form>

            <form className="create-form secondary" onSubmit={handleCreateInstitutionClass}>
              <h4>Kurum Altında Yeni Sınıf</h4>
              <div className="form-row">
                <select
                  value={classForm.institution_id}
                  onChange={(e) => setClassForm({ ...classForm, institution_id: e.target.value })}
                  required
                >
                  <option value="">Kurum Seçin</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Sınıf Adı"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Açıklama (opsiyonel)"
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                />
                <select
                  value={classForm.teacher_id}
                  onChange={(e) => setClassForm({ ...classForm, teacher_id: e.target.value })}
                >
                  <option value="">Öğretmen Seç (opsiyonel)</option>
                  {users.filter((u) => u.role === 'teacher').map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.username} {teacher.institution_name ? `(${teacher.institution_name})` : ''}
                    </option>
                  ))}
                </select>
                <button type="submit">Sınıf Ekle</button>
              </div>
            </form>

            {institutionsLoading ? (
              <p>Yükleniyor...</p>
            ) : institutions.length === 0 ? (
              <p>Henüz kurum bulunmuyor.</p>
            ) : (
              <div className="institutions-grid">
                {institutions.map((institution) => (
                  <div key={institution.id} className="institution-card">
                    <div className="institution-header">
                      <h4>{institution.name}</h4>
                      <span className="institution-meta">
                        {institution.teacher_count}/{institution.teacher_limit} öğretmen · {institution.student_count}/{institution.student_limit} öğrenci
                      </span>
                    </div>
                    {institution.description && <p className="institution-description">{institution.description}</p>}
                    <div className="institution-classes">
                      <h5>Sınıflar</h5>
                      {institution.classes && institution.classes.length > 0 ? (
                        <ul>
                          {institution.classes.map((cls) => (
                            <li key={cls.id}>
                              <strong>{cls.name}</strong>
                              {cls.teacher_name ? ` • ${cls.teacher_name}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Henüz sınıf eklenmemiş.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'masterWords' && (
          <div className="master-words-section">
            <h3>Ana Kelime Kütüphanesi</h3>
            <p className="subtext">Onay bekleyen kelimeleri inceleyin ve resmi kelime paketleri oluşturun.</p>

            {masterWordsLoading ? (
              <p>Yükleniyor...</p>
            ) : (
              <>
                <div className="pending-words-card">
                  <div className="pending-header">
                    <h4>Onay Bekleyen Kelimeler</h4>
                    <span>{pendingWords.length} kelime bekliyor</span>
                  </div>
                  {pendingWords.length === 0 ? (
                    <p>Tüm kelimeler onaylandı!</p>
                  ) : (
                    <div className="pending-words-grid">
                      {pendingWords.map((word) => (
                        <div key={word.id} className="pending-word-card">
                          <div className="pending-word-header">
                            <strong>{word.english}</strong>
                            <span>{word.turkish}</span>
                          </div>
                          <div className="pending-word-meta">
                            <span>Seviye {word.difficulty}</span>
                            <span>{word.category}</span>
                            <span>Ekleyen: {word.created_by}</span>
                          </div>
                          <div className="pending-word-actions">
                            <button onClick={() => handleApproveWord(word.id)}>Onayla</button>
                            <button className="danger" onClick={() => handleRejectWord(word.id)}>Sil</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="word-pack-wrapper">
                  <div className="word-pack-list">
                    <h4>Varsayılan Paketler</h4>
                    <ul>
                      {wordPacks.map((pack) => (
                        <li key={pack.id}>
                          <strong>{pack.name}</strong> ({pack.level || 'Seviye belirsiz'}) – {pack.words.length} kelime
                        </li>
                      ))}
                    </ul>
                    <p>Toplam onaylı kelime: <strong>{approvedWordsCount}</strong></p>
                  </div>
                  <form className="create-form" onSubmit={handleCreateWordPack}>
                    <h4>Yeni Kelime Paketi Oluştur</h4>
                    <div className="form-column">
                      <input
                        type="text"
                        placeholder="Paket Adı"
                        value={wordPackForm.name}
                        onChange={(e) => setWordPackForm({ ...wordPackForm, name: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Açıklama (opsiyonel)"
                        value={wordPackForm.description}
                        onChange={(e) => setWordPackForm({ ...wordPackForm, description: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Seviye (örn: A1, B1)"
                        value={wordPackForm.level}
                        onChange={(e) => setWordPackForm({ ...wordPackForm, level: e.target.value })}
                      />
                      <textarea
                        placeholder="Paket kelimeleri (virgülle ayırın)"
                        value={wordPackForm.words}
                        onChange={(e) => setWordPackForm({ ...wordPackForm, words: e.target.value })}
                        rows={3}
                      />
                      <button type="submit">Paket Oluştur</button>
                    </div>
                  </form>
                </div>

                <div className="categories-card">
                  <h4>Kategoriler</h4>
                  <div className="categories-list">
                    {categories.map((category) => (
                      <span key={category} className="category-chip">
                        {category}
                        <button type="button" onClick={() => handleRemoveCategory(category)}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="category-add-row">
                    <input
                      type="text"
                      placeholder="Yeni kategori"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <button type="button" onClick={handleAddCategory}>Ekle</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h3>Sistem Ayarları</h3>
            {settingsLoading || !systemSettings ? (
              <p>Yükleniyor...</p>
            ) : (
              <form className="settings-form" onSubmit={handleSettingsSave}>
                <div className="settings-group">
                  <h4>Bakım Modu</h4>
                  <p>Sistemi geçici olarak bakım moduna alırsanız tüm kullanıcılar bilgi mesajı görür.</p>
                  <button
                    type="button"
                    className={systemSettings.maintenance_mode ? 'toggle-btn active' : 'toggle-btn'}
                    onClick={toggleMaintenanceMode}
                  >
                    {systemSettings.maintenance_mode ? 'Bakım Modu Aktif' : 'Bakım Modu Kapalı'}
                  </button>
                </div>

                <div className="settings-group">
                  <h4>Özellikler</h4>
                  <div className="feature-flags">
                    <label>
                      <input
                        type="checkbox"
                        checked={systemSettings.feature_flags?.weeklyLeague ?? true}
                        onChange={() => toggleFeatureFlag('weeklyLeague')}
                      />
                      Haftalık Lig
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={systemSettings.feature_flags?.games ?? true}
                        onChange={() => toggleFeatureFlag('games')}
                      />
                      Oyun Modülleri
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <h4>E-posta Ayarları</h4>
                  <div className="settings-grid">
                    <input
                      type="text"
                      placeholder="SMTP Sunucusu"
                      value={systemSettings.email?.smtp_host || ''}
                      onChange={(e) => handleEmailChange('smtp_host', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="SMTP Port"
                      value={systemSettings.email?.smtp_port || ''}
                      onChange={(e) => handleEmailChange('smtp_port', parseInt(e.target.value, 10) || '')}
                    />
                    <input
                      type="text"
                      placeholder="SMTP Kullanıcısı"
                      value={systemSettings.email?.smtp_user || ''}
                      onChange={(e) => handleEmailChange('smtp_user', e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="SMTP Şifresi"
                      value={systemSettings.email?.smtp_password || ''}
                      onChange={(e) => handleEmailChange('smtp_password', e.target.value)}
                    />
                    <input
                      type="email"
                      placeholder="Gönderici E-posta"
                      value={systemSettings.email?.sender || ''}
                      onChange={(e) => handleEmailChange('sender', e.target.value)}
                    />
                  </div>
                </div>

                <div className="settings-group">
                  <h4>API Anahtarları</h4>
                  <div className="settings-grid">
                    <input
                      type="text"
                      placeholder="Çeviri Servisi Anahtarı"
                      value={systemSettings.api_keys?.translation || ''}
                      onChange={(e) => handleApiKeyChange('translation', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="TTS Servisi Anahtarı"
                      value={systemSettings.api_keys?.tts || ''}
                      onChange={(e) => handleApiKeyChange('tts', e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="save-settings-btn">Ayarları Kaydet</button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h3>Kullanıcı Yönetimi</h3>
            </div>

            <form onSubmit={handleCreateUser} className="create-form">
              <h4>Yeni Kullanıcı Ekle</h4>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Kullanıcı Adı"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="student">Öğrenci</option>
                  <option value="teacher">Öğretmen</option>
                  <option value="admin">Yönetici</option>
                </select>
                <select
                  value={newUser.institution_id}
                  onChange={(e) => setNewUser({...newUser, institution_id: e.target.value})}
                >
                  <option value="">Kurumsuz</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Sınıf (opsiyonel)"
                  value={newUser.class_name}
                  onChange={(e) => setNewUser({...newUser, class_name: e.target.value})}
                />
                <button type="submit">Ekle</button>
              </div>
            </form>

            <div className="data-table">
              {loading ? (
                <p>Yükleniyor...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Kullanıcı Adı</th>
                      <th>Rol</th>
                      <th>Sınıf</th>
                      <th>Kurum</th>
                      <th>Puan</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.role}</td>
                        <td>{u.class_name || '-'}</td>
                        <td>{u.institution_name || '-'}</td>
                        <td>{u.points || 0}</td>
                        <td>
                          {u.username !== 'admin' && (
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="delete-btn"
                            >
                              Sil
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'words' && (
          <div className="words-section">
            <div className="section-header">
              <h3>Kelime Yönetimi</h3>
            </div>

            <form onSubmit={handleCreateWord} className="word-add-form">
              <div className="word-input-row">
                <div className="word-input-group">
                  <label>İngilizce Kelime</label>
                  <input
                    type="text"
                    placeholder="Örn: apple"
                    value={newWord.english}
                    onChange={(e) => setNewWord({...newWord, english: e.target.value})}
                    required
                  />
                </div>
                <div className="word-input-group">
                  <label>Türkçe Anlamı</label>
                  <input
                    type="text"
                    placeholder="Örn: elma"
                    value={newWord.turkish}
                    onChange={(e) => setNewWord({...newWord, turkish: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" className="word-add-button">Ekle +</button>
              </div>
            </form>

            {/* Filter Section */}
            <div className="filter-section">
              <h4>Filtrele</h4>
              <div className="filter-row">
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
                  <option value="all">Tüm Seviyeler</option>
                  <option value="1">Seviye 1</option>
                  <option value="2">Seviye 2</option>
                  <option value="3">Seviye 3</option>
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">Tüm Kategoriler</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <span className="filter-count">{filteredWords.length} kelime</span>
              </div>
            </div>

            {/* CSV Upload Form */}
            <form onSubmit={handleCsvUpload} className="csv-upload-form">
              <h4>📥 Toplu Kelime Yükle</h4>
              <p className="csv-info">
                CSV formatında kelime listesi yükleyin (English, Turkish, Difficulty, Category)
              </p>
              <div className="form-row">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                />
                <button type="submit" disabled={csvLoading}>
                  {csvLoading ? 'Yükleniyor...' : '📤 Yükle'}
                </button>
              </div>
            </form>

            {/* Words Table */}
            {loading ? (
              <p>Yükleniyor...</p>
            ) : filteredWords.length === 0 ? (
              <div className="empty-state">
                <p>Henüz kelime eklenmemiş.</p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>İngilizce</th>
                      <th>Türkçe</th>
                      <th>Seviye</th>
                      <th>Kategori</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWords.map((word) => (
                      <tr key={word.id}>
                        <td>{word.english}</td>
                        <td>{word.turkish}</td>
                        <td>
                          <span className={`difficulty-badge difficulty-${word.difficulty}`}>
                            Seviye {word.difficulty}
                          </span>
                        </td>
                        <td>{word.category}</td>
                        <td>
                          <button 
                            onClick={() => handleDeleteWord(word.id)}
                            className="delete-btn"
                          >
                            Sil
                          </button>
                          <button 
                            onClick={() => generateAIExamples(word)}
                            disabled={aiLoading}
                            className="ai-btn"
                          >
                            ✨ AI Örnekler
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <h3>İstatistikler</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Toplam Kullanıcı</h4>
                <p className="stat-number">{users.length}</p>
              </div>
              <div className="stat-card">
                <h4>Toplam Kelime</h4>
                <p className="stat-number">{words.length}</p>
              </div>
              <div className="stat-card">
                <h4>Toplam Öğrenci</h4>
                <p className="stat-number">{users.filter(u => u.role === 'student').length}</p>
              </div>
              <div className="stat-card">
                <h4>Toplam Öğretmen</h4>
                <p className="stat-number">{users.filter(u => u.role === 'teacher').length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <div className="section-header">
              <h3>🏆 Liderlik Tablosu</h3>
            </div>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Sıra</th>
                      <th>Kullanıcı Adı</th>
                      <th>Puan</th>
                      <th>Kelime</th>
                      <th>Oyun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{entry.username}</td>
                        <td>⭐ {entry.points || 0}</td>
                        <td>📚 {entry.words_learned || 0}</td>
                        <td>🎮 {entry.games_played || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-section">
            <div className="section-header">
              <h3>🏅 Başarılar ve Rozetler</h3>
            </div>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="achievements-grid">
                {achievements.map((ach) => (
                  <div key={ach.id} className={`achievement-card ${hasAchievement(ach.id) ? 'earned' : ''}`}>
                    <div className="achievement-icon">{ach.icon || '🏅'}</div>
                    <h4>{ach.name}</h4>
                    <p>{ach.description}</p>
                    <div className="achievement-points">⭐ {ach.points} puan</div>
                    {hasAchievement(ach.id) && (
                      <div className="achievement-badge">✓ Kazanıldı</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'league' && (
          <div className="league-section">
            <div className="section-header">
              <h3>🏆 Haftalık Lig</h3>
            </div>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : league ? (
              <div className="league-info">
                <div className="league-stats">
                  <div className="stat-card">
                    <h4>Toplam Katılımcı</h4>
                    <p className="stat-number">{league.total_participants || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Senin Sıran</h4>
                    <p className="stat-number">{league.your_rank || '-'}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Toplam Puan</h4>
                    <p className="stat-number">⭐ {league.your_points || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p>Henüz lig başlamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;

