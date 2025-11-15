import React, { useState, useEffect } from 'react';
import './TeacherPanel.css';
import GameSelector from './games/GameSelector';

function TeacherPanel({ user, apiUrl }) {
  const [showDashboard, setShowDashboard] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [words, setWords] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [studentSummaries, setStudentSummaries] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [dashboardActions, setDashboardActions] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState([]);
  const [assignmentTargetType, setAssignmentTargetType] = useState('student');
  const [assignmentTargetId, setAssignmentTargetId] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [editingWordId, setEditingWordId] = useState(null);
  const [wordModalStatus, setWordModalStatus] = useState(null);
  const [wordFormData, setWordFormData] = useState({
    english: '',
    turkish: '',
    difficulty: '1',
    category: ''
  });
  const [quickWord, setQuickWord] = useState({
    english: '',
    turkish: '',
    difficulty: '1',
    category: 'general'
  });
  const [wordActionStatus, setWordActionStatus] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classActionStatus, setClassActionStatus] = useState(null);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classFormData, setClassFormData] = useState({
    name: '',
    description: ''
  });
  const [classModalStatus, setClassModalStatus] = useState(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    username: '',
    password: '',
    class_name: ''
  });
  const [studentModalStatus, setStudentModalStatus] = useState(null);
  const [studentActionStatus, setStudentActionStatus] = useState(null);
  const [showGames, setShowGames] = useState(false);
  const [selectedHeatmapClass, setSelectedHeatmapClass] = useState('all');

  useEffect(() => {
    if (!showDashboard) {
      switch (activeTab) {
        case 'students':
          fetchStudents();
          if (classes.length === 0) {
            fetchClasses();
          }
          if (heatmapData.length === 0) {
            fetchClassHeatmap('all');
          }
          break;
        case 'classes':
          fetchClasses();
          fetchStudents();
          break;
        case 'words':
          fetchWords();
          fetchAssignments();
          if (classes.length === 0) {
            fetchClasses();
          }
          break;
        case 'summary':
          fetchStudentSummaries();
          break;
        case 'overview':
          fetchStatistics();
          fetchDashboardActions();
          break;
        case 'stats':
          fetchStatistics();
          break;
        case 'heatmap':
          if (classes.length === 0) {
            fetchClasses();
          }
          fetchClassHeatmap(selectedHeatmapClass);
          break;
        default:
          break;
      }
    }
  }, [activeTab, showDashboard]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
    setLoading(false);
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/words`, {
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

  const fetchStudentSummaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/students/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentSummaries(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching student summaries:', error);
    }
    setLoading(false);
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/statistics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
    setLoading(false);
  };

  const fetchStudentProfile = async (studentId) => {
    if (!studentId) return;
    setStudentProfileLoading(true);
    setSelectedStudentId(studentId);
    setAssignmentStatus(null);
    try {
      const response = await fetch(`${apiUrl}/teacher/students/${studentId}/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentProfile(data);
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
    }
    setStudentProfileLoading(false);
  };

  const fetchDashboardActions = async () => {
    try {
      const response = await fetch(`${apiUrl}/teacher/dashboard/actions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardActions(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard actions:', error);
    }
  };

  const fetchClassHeatmap = async (classFilter = 'all') => {
    setHeatmapLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter && classFilter !== 'all') {
        params.append('class_name', classFilter);
      }
      const query = params.toString();
      const url = query
        ? `${apiUrl}/teacher/statistics/class-activity?${query}`
        : `${apiUrl}/teacher/statistics/class-activity`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHeatmapData(data.heatmap || []);
      }
    } catch (error) {
      console.error('Error fetching class heatmap:', error);
    }
    setHeatmapLoading(false);
  };

  const fetchClasses = async () => {
    setClassesLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/classes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const classList = Array.isArray(data) ? data : data.classes || [];
        setClasses(classList);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
    setClassesLoading(false);
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`${apiUrl}/teacher/assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleOpenStudentProfile = (studentId) => {
    fetchStudentProfile(studentId);
  };

  const handleCloseStudentProfile = () => {
    setSelectedStudentId(null);
    setStudentProfile(null);
    setStudentProfileLoading(false);
  };

  const handleWordSelect = (wordId) => {
    if (!selectionMode) {
      return;
    }
    setSelectedWordIds((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedWordIds([]);
      }
      return !prev;
    });
  };

  const clearSelection = () => {
    setSelectedWordIds([]);
  };

  const openAssignmentModal = () => {
    if (selectedWordIds.length === 0) {
      setAssignmentStatus({
        type: 'warning',
        message: 'Ödev hazırlamak için en az bir kelime seçmelisiniz.'
      });
      return;
    }
    setAssignmentModalOpen(true);
    setAssignmentStatus(null);
  };

  const closeAssignmentModal = () => {
    setAssignmentModalOpen(false);
  };

  const openClassModal = () => {
    setClassFormData({
      name: '',
      description: ''
    });
    setClassModalStatus(null);
    setClassActionStatus(null);
    setClassModalOpen(true);
  };

  const closeClassModal = () => {
    setClassModalOpen(false);
    setClassModalStatus(null);
  };

  const handleClassFormChange = (event) => {
    const { name, value } = event.target;
    setClassFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const submitClassForm = async (event) => {
    event.preventDefault();
    setClassModalStatus(null);
    const payload = {
      name: classFormData.name.trim(),
      description: classFormData.description.trim()
    };

    if (!payload.name) {
      setClassModalStatus({
        type: 'warning',
        message: 'Lütfen sınıf adını girin.'
      });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/teacher/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        closeClassModal();
        setClassActionStatus({
          type: 'success',
          message: 'Sınıf başarıyla oluşturuldu.'
        });
        fetchClasses();
      } else {
        const errorData = await response.json();
        setClassModalStatus({
          type: 'error',
          message: errorData.detail || 'Sınıf oluşturulurken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Error creating class:', error);
      setClassModalStatus({
        type: 'error',
        message: 'Sınıf oluşturulurken beklenmeyen bir hata oluştu.'
      });
    }
  };

  const openStudentModal = () => {
    setStudentFormData({
      username: '',
      password: '',
      class_name: ''
    });
    setStudentModalStatus(null);
    setStudentActionStatus(null);
    setStudentModalOpen(true);
  };

  const closeStudentModal = () => {
    setStudentModalOpen(false);
    setStudentModalStatus(null);
  };

  const handleStudentFormChange = (event) => {
    const { name, value } = event.target;
    setStudentFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const submitStudentForm = async (event) => {
    event.preventDefault();
    setStudentModalStatus(null);
    const payload = {
      username: studentFormData.username.trim(),
      password: studentFormData.password,
      class_name: studentFormData.class_name || null
    };

    if (!payload.username) {
      setStudentModalStatus({
        type: 'warning',
        message: 'Lütfen öğrenci kullanıcı adını girin.'
      });
      return;
    }

    if (!payload.password || payload.password.length < 6) {
      setStudentModalStatus({
        type: 'warning',
        message: 'Şifre en az 6 karakter olmalıdır.'
      });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/teacher/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        closeStudentModal();
        setStudentActionStatus({
          type: 'success',
          message: 'Öğrenci başarıyla oluşturuldu.'
        });
        fetchStudents();
        if (payload.class_name) {
          fetchClasses();
        }
      } else {
        const errorData = await response.json();
        setStudentModalStatus({
          type: 'error',
          message: errorData.detail || 'Öğrenci oluşturulurken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Error creating student:', error);
      setStudentModalStatus({
        type: 'error',
        message: 'Öğrenci oluşturulurken beklenmeyen bir hata oluştu.'
      });
    }
  };

  const openWordModal = (word = null) => {
    if (word) {
      setEditingWordId(word.id);
      setWordFormData({
        english: word.english || '',
        turkish: word.turkish || '',
        difficulty: String(word.difficulty || '1'),
        category: word.category || ''
      });
    } else {
      setEditingWordId(null);
      setWordFormData({
        english: '',
        turkish: '',
        difficulty: '1',
        category: ''
      });
    }
    setWordModalStatus(null);
    setWordModalOpen(true);
  };

  const closeWordModal = () => {
    setWordModalOpen(false);
    setWordModalStatus(null);
    setEditingWordId(null);
  };

  const handleWordFormChange = (event) => {
    const { name, value } = event.target;
    setWordFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const submitWordForm = async (event) => {
    event.preventDefault();
    setWordModalStatus(null);
    const payload = {
      english: wordFormData.english.trim(),
      turkish: wordFormData.turkish.trim(),
      difficulty: Number(wordFormData.difficulty),
      category: wordFormData.category.trim()
    };

    if (!payload.english || !payload.turkish) {
      setWordModalStatus({
        type: 'warning',
        message: 'Lütfen İngilizce ve Türkçe alanlarını doldurun.'
      });
      return;
    }

    try {
      const endpoint = editingWordId
        ? `${apiUrl}/teacher/words/${editingWordId}`
        : `${apiUrl}/teacher/words`;
      const method = editingWordId ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setWordModalStatus({
          type: 'success',
          message: editingWordId ? 'Kelime güncellendi.' : 'Kelime eklendi.'
        });
        closeWordModal();
        fetchWords();
      } else {
        const errorData = await response.json();
        setWordModalStatus({
          type: 'error',
          message: errorData.detail || 'Kelime kaydedilirken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Error saving word:', error);
      setWordModalStatus({
        type: 'error',
        message: 'Kelime kaydedilirken beklenmeyen bir hata oluştu.'
      });
    }
  };

  const handleDeleteWord = async (wordId) => {
    const confirmDelete = window.confirm('Bu kelimeyi silmek istediğinize emin misiniz?');
    if (!confirmDelete) {
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/teacher/words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setWordActionStatus({
          type: 'success',
          message: 'Kelime silindi.'
        });
        fetchWords();
        setSelectedWordIds((prev) => prev.filter((id) => id !== wordId));
      } else {
        const errorData = await response.json();
        setWordActionStatus({
          type: 'error',
          message: errorData.detail || 'Kelime silinirken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      setWordActionStatus({
        type: 'error',
        message: 'Kelime silinirken beklenmeyen bir hata oluştu.'
      });
    }
  };

  const handleAssignmentSubmit = async (event) => {
    event.preventDefault();
    if (!assignmentTargetId) {
      setAssignmentStatus({
        type: 'warning',
        message: 'Lütfen ödev atamak için bir öğrenci veya sınıf seçin.'
      });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/teacher/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          assigned_to_id: assignmentTargetId,
          assigned_to_type: assignmentTargetType,
          word_ids: selectedWordIds
        })
      });

      if (response.ok) {
        setAssignmentStatus({
          type: 'success',
          message: 'Ödev başarıyla oluşturuldu.'
        });
        setAssignmentModalOpen(false);
        setSelectedWordIds([]);
        setAssignmentTargetId('');
        fetchAssignments();
      } else {
        const errorData = await response.json();
        setAssignmentStatus({
          type: 'error',
          message: errorData.detail || 'Ödev oluşturulurken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setAssignmentStatus({
        type: 'error',
        message: 'Ödev oluşturulurken beklenmeyen bir hata oluştu.'
      });
    }
  };

  const handleQuickWordSubmit = async (event) => {
    event.preventDefault();
    setWordActionStatus(null);

    if (!quickWord.english.trim() || !quickWord.turkish.trim()) {
      setWordActionStatus({
        type: 'warning',
        message: 'Lütfen İngilizce ve Türkçe alanlarını doldurun.'
      });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/teacher/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          english: quickWord.english.trim(),
          turkish: quickWord.turkish.trim(),
          difficulty: Number(quickWord.difficulty) || 1,
          category: quickWord.category || 'general'
        })
      });

      if (response.ok) {
        setWordActionStatus({
          type: 'success',
          message: 'Kelime başarıyla eklendi.'
        });
        setQuickWord({
          english: '',
          turkish: '',
          difficulty: '1',
          category: quickWord.category
        });
        fetchWords();
      } else {
        const errorData = await response.json();
        setWordActionStatus({
          type: 'error',
          message: errorData.detail || 'Kelime eklenirken bir sorun oluştu.'
        });
      }
    } catch (error) {
      console.error('Error creating word:', error);
      setWordActionStatus({
        type: 'error',
        message: 'Kelime eklenirken beklenmeyen bir hata oluştu.'
      });
    }
  };

  const handleCsvUpload = async (event) => {
    event.preventDefault();
    if (!csvFile) {
      setWordActionStatus({
        type: 'warning',
        message: 'Lütfen yüklemek için bir CSV dosyası seçin.'
      });
      return;
    }

    setCsvLoading(true);
    const reader = new FileReader();

    reader.onload = async (fileEvent) => {
      try {
        const text = fileEvent.target.result;
        const lines = text.split('\n').filter((line) => line.trim());
        const startIndex = lines[0].toLowerCase().includes('english') ? 1 : 0;
        const wordsData = [];

        for (let i = startIndex; i < lines.length; i += 1) {
          const parts = lines[i].split(',').map((part) => part.trim());
          if (parts.length >= 2) {
            wordsData.push({
              english: parts[0],
              turkish: parts[1],
              difficulty: parseInt(parts[2], 10) || 1,
              category: parts[3] || 'general'
            });
          }
        }

        if (wordsData.length === 0) {
          setWordActionStatus({
            type: 'warning',
            message: 'CSV dosyasında geçerli kelime bulunamadı.'
          });
          setCsvLoading(false);
          return;
        }

        const response = await fetch(`${apiUrl}/words/bulk-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            words: wordsData,
            auto_generate_examples: false
          })
        });

        if (response.ok) {
          const data = await response.json();
          setWordActionStatus({
            type: 'success',
            message: `${data.count || wordsData.length} kelime başarıyla yüklendi.`
          });
          setCsvFile(null);
          fetchWords();
        } else {
          const errorData = await response.json();
          setWordActionStatus({
            type: 'error',
            message: errorData.detail || 'Toplu yükleme sırasında bir hata oluştu.'
          });
        }
      } catch (error) {
        console.error('CSV upload error:', error);
        setWordActionStatus({
          type: 'error',
          message: 'CSV dosyası işlenirken bir hata oluştu.'
        });
      } finally {
        setCsvLoading(false);
      }
    };

    reader.readAsText(csvFile);
  };

  const handleGenerateExamples = async (word) => {
    setAiLoading(true);
    setWordActionStatus(null);
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
        setWordActionStatus({
          type: 'success',
          message: `${data.examples?.length || 0} örnek cümle oluşturuldu.`
        });
        fetchWords();
      } else {
        const errorData = await response.json();
        setWordActionStatus({
          type: 'error',
          message: errorData.detail || 'Örnek cümle oluşturulamadı.'
        });
      }
    } catch (error) {
      console.error('AI example error:', error);
      setWordActionStatus({
        type: 'error',
        message: 'AI servisi şu anda kullanılamıyor.'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const classOptionsFromStudents = Array.from(
    new Set(
      students
        .map((student) => student.class_name)
        .filter((className) => Boolean(className))
    )
  );
  const classOptions = classes.length > 0
    ? classes.map((cls) => cls.name)
    : classOptionsFromStudents;

  const selectedWords = words.filter((word) => selectedWordIds.includes(word.id));
  const selectedStudentBasic = selectedStudentId
    ? students.find((student) => student.id === selectedStudentId)
    : null;
  const selectedStudentSummary = selectedStudentId
    ? studentSummaries.find((summary) => summary.id === selectedStudentId)
    : null;

  const getHeatmapLevel = (percent) => {
    if (percent >= 80) return 4;
    if (percent >= 60) return 3;
    if (percent >= 40) return 2;
    if (percent >= 20) return 1;
    return 0;
  };

  const strugglingStudents = dashboardActions?.struggling_students || [];
  const inactiveStudentsList = dashboardActions?.inactive_students || [];
  const challengingWords = dashboardActions?.challenging_words || [];
  const categoryOptions = Array.from(
    new Set(['general', ...words.map((word) => word.category).filter(Boolean)])
  );

  const filteredWords = words.filter((word) => {
    const matchesSearch =
      word.english?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.turkish?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || String(word.difficulty) === levelFilter;
    const matchesCategory = categoryFilter === 'all' || word.category === categoryFilter;
    return matchesSearch && matchesLevel && matchesCategory;
  });

  const dashboardCards = [
    {
      id: 'students',
      icon: '👨‍🎓',
      title: 'Öğrenciler',
      description: 'Öğrenci listesi ve takibi',
      color: '#3b82f6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('students');
      }
    },
    {
      id: 'words',
      icon: '📚',
      title: 'Kelimeler',
      description: 'Kelime listesi',
      color: '#10b981',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('words');
      }
    },
    {
      id: 'stats',
      icon: '📊',
      title: 'İstatistikler',
      description: 'Detaylı istatistikler',
      color: '#f59e0b',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('stats');
      }
    },
    {
      id: 'summary',
      icon: '📋',
      title: 'Öğrenci Özeti',
      description: 'Quiz performansı özetleri',
      color: '#6366f1',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('summary');
      }
    },
    {
      id: 'heatmap',
      icon: '🔥',
      title: 'Aktivite Haritası',
      description: 'Öğrenci aktivite haritası',
      color: '#ef4444',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('heatmap');
      }
    }
  ];

  if (showDashboard) {
    return (
      <div className="admin-dashboard">
        <div className="welcome-section">
          <h1 className="welcome-title">Hoş Geldin, {user.username}!</h1>
          <p className="welcome-subtitle">Profesyonel öğretmen paneli</p>
        </div>
        
        <div className="dashboard-cards">
          {dashboardCards.map((card) => (
            <div
              key={card.id}
              className="dashboard-card"
              onClick={card.onClick}
              style={{ borderTopColor: card.color }}
            >
              <div className="card-icon" style={{ color: card.color }}>
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-panel">
      <div className="panel-header">
        <h2>Öğretmen Paneli</h2>
        <button className="back-to-dashboard" onClick={() => setShowDashboard(true)}>
          Ana Menü
        </button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          📊 Genel Bakış
        </button>
        <button 
          className={activeTab === 'students' ? 'active' : ''} 
          onClick={() => setActiveTab('students')}
        >
          👥 Öğrenciler
        </button>
        <button 
          className={activeTab === 'summary' ? 'active' : ''} 
          onClick={() => setActiveTab('summary')}
        >
          📋 Öğrenci Özeti
        </button>
        <button 
          className={activeTab === 'classes' ? 'active' : ''} 
          onClick={() => setActiveTab('classes')}
        >
          🏫 Sınıflar
        </button>
        <button 
          className={activeTab === 'games' ? 'active' : ''} 
          onClick={() => setActiveTab('games')}
        >
          🎮 Oyunlar
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid-overview">
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#10b981' }}>{statistics.total_students || 0}</div>
                <div className="stat-label-overview">Toplam Öğrenci</div>
              </div>
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#10b981' }}>{statistics.active_students || 0}</div>
                <div className="stat-label-overview">Aktif Öğrenci</div>
              </div>
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#f59e0b' }}>{statistics.total_words || 0}</div>
                <div className="stat-label-overview">Toplam Kelime</div>
              </div>
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#10b981' }}>{statistics.total_games || 0}</div>
                <div className="stat-label-overview">Toplam Oyun</div>
              </div>
            </div>
            <div className="action-section">
              <h3>🚨 Acil Aksiyonlar</h3>
              <div className="action-grid">
                <div className="action-card">
                  <div className="action-card-header struggling">
                    <span className="action-icon">📉</span>
                    <h4>Zorlanan Öğrenciler</h4>
                  </div>
                  <div className="action-card-content">
                    {dashboardActions ? (
                      strugglingStudents.length > 0 ? (
                        <ul>
                          {strugglingStudents.slice(0, 4).map((student) => (
                            <li key={student.id}>
                              <strong>{student.username}</strong>
                              <span className="action-meta">{'Son 24 saatte < %50 başarı'}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Tebrikler! Son 24 saatte sınavda zorlanan öğrenci yok.</p>
                      )
                    ) : (
                      <p>Veriler yükleniyor...</p>
                    )}
                  </div>
                </div>

                <div className="action-card">
                  <div className="action-card-header inactive">
                    <span className="action-icon">⏰</span>
                    <h4>İlgisiz Öğrenciler</h4>
                  </div>
                  <div className="action-card-content">
                    {dashboardActions ? (
                      inactiveStudentsList.length > 0 ? (
                        <ul>
                          {inactiveStudentsList.slice(0, 4).map((student) => (
                            <li key={student.id}>
                              <strong>{student.username}</strong>
                              <span className="action-meta">
                                {student.last_login_date
                                  ? `${new Date(student.last_login_date).toLocaleDateString('tr-TR')} tarihinde son giriş`
                                  : 'Son giriş bilgisi yok'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Harika! Tüm öğrenciler son 3 günde giriş yaptı.</p>
                      )
                    ) : (
                      <p>Veriler yükleniyor...</p>
                    )}
                  </div>
                </div>

                <div className="action-card">
                  <div className="action-card-header words">
                    <span className="action-icon">🧠</span>
                    <h4>Zorlanılan Kelimeler</h4>
                  </div>
                  <div className="action-card-content">
                    {dashboardActions ? (
                      challengingWords.length > 0 ? (
                        <ul className="word-alert-list">
                          {challengingWords.map((item, index) => (
                            <li key={item.word}>
                              <span className="word-rank">#{index + 1}</span>
                              <strong>{item.word}</strong>
                              <span className="action-meta">{item.count} hata</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Henüz zorlanılan kelime tespit edilmedi.</p>
                      )
                    ) : (
                      <p>Veriler yükleniyor...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            <h3>Öğrenci Listesi</h3>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Öğrenci Adı</th>
                      <th>Sınıf</th>
                      <th>Puan</th>
                      <th>Öğrenilen Kelime</th>
                      <th>Oynanan Oyun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(s => s.role === 'student').map((student) => (
                      <tr key={student.id}>
                        <td>
                          <button
                            type="button"
                            className="student-link"
                            onClick={() => handleOpenStudentProfile(student.id)}
                          >
                            {student.username}
                          </button>
                        </td>
                        <td>{student.class_name || '-'}</td>
                        <td>{student.points || 0}</td>
                        <td>{student.words_learned || 0}</td>
                        <td>{student.games_played || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="student-insights-grid">
              <div className="heatmap-section embedded">
                <h4>🔥 Sınıf Aktivite Haritası</h4>
                <div className="heatmap-toolbar">
                  <select
                    value={selectedHeatmapClass}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedHeatmapClass(value);
                      fetchClassHeatmap(value);
                    }}
                  >
                    <option value="all">Tüm sınıflar</option>
                    {classOptions.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
                {heatmapLoading ? (
                  <p>Yükleniyor...</p>
                ) : heatmapData.length === 0 ? (
                  <p>Henüz aktivite verisi bulunamadı.</p>
                ) : (
                  <>
                    <div className="heatmap-grid class-heatmap">
                      {heatmapData.map((day) => {
                        const level = getHeatmapLevel(day.percent_active || 0);
                        const dateLabel = new Date(day.date).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short'
                        });
                        return (
                          <div
                            key={day.date}
                            className={`heatmap-cell intensity-${level}`}
                            title={`${dateLabel}: %${day.percent_active} aktif öğrenci`}
                          >
                            <span>{dateLabel}</span>
                            <strong>%{day.percent_active}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div className="heatmap-legend">
                      <span>Düşük</span>
                      <div className="legend-colors">
                        <div className="intensity-0"></div>
                        <div className="intensity-1"></div>
                        <div className="intensity-2"></div>
                        <div className="intensity-3"></div>
                        <div className="intensity-4"></div>
                      </div>
                      <span>Yüksek</span>
                    </div>
                  </>
                )}
              </div>

              <div className="timeline-section embedded">
                <h4>⏱️ Aktivite Zaman Çizelgesi</h4>
                <div className="timeline-list inline">
                  {students.slice(0, 10).map((student, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <strong>{student.username}</strong>
                          <span className="timeline-game">🎮 {student.games_played || 0} oyun</span>
                        </div>
                        <div className="timeline-meta">
                          <span>⭐ {student.points || 0} puan</span>
                          <span>📚 {student.words_learned || 0} kelime</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="summary-section">
            <h3>Öğrenci Özetleri</h3>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : studentSummaries.length === 0 ? (
              <p>Henüz öğrenci verisi bulunamadı.</p>
            ) : (
              <div className="data-table summary-table">
                <table>
                  <thead>
                    <tr>
                      <th>Öğrenci</th>
                      <th>Sınıf</th>
                      <th>Ort. Quiz</th>
                      <th>Son Quiz</th>
                      <th>En İyi Quiz</th>
                      <th>Quiz Tamamlama</th>
                      <th>Puan</th>
                      <th>Kelime</th>
                      <th>Oyun</th>
                      <th>Son Giriş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSummaries.map((summary) => (
                      <tr key={summary.id}>
                        <td>{summary.username}</td>
                        <td>{summary.class_name || '-'}</td>
                        <td>
                          {summary.average_quiz_score !== null && summary.average_quiz_score !== undefined
                            ? `${summary.average_quiz_score}`
                            : '-'}
                        </td>
                        <td>
                          {summary.last_quiz_score !== null && summary.last_quiz_score !== undefined
                            ? summary.last_quiz_score
                            : '-'}
                        </td>
                        <td>
                          {summary.best_quiz_score !== null && summary.best_quiz_score !== undefined
                            ? summary.best_quiz_score
                            : '-'}
                        </td>
                        <td>{summary.weekly_quiz_completion_count || 0}</td>
                        <td>{summary.points || 0}</td>
                        <td>{summary.words_learned || 0}</td>
                        <td>{summary.games_played || 0}</td>
                        <td>
                          {summary.last_login_date
                            ? new Date(summary.last_login_date).toLocaleDateString('tr-TR')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="classes-section">
            <div className="classes-header">
              <h3>Sınıflar</h3>
              <div className="classes-toolbar">
                <button className="btn-new-class" onClick={openClassModal}>
                  ➕ Yeni Sınıf Ekle
                </button>
                <button className="btn-new-student" onClick={openStudentModal}>
                  👤 Yeni Öğrenci Ekle
                </button>
              </div>
            </div>
            {classActionStatus && (
              <span className={`assignment-status ${classActionStatus.type}`}>
                {classActionStatus.message}
              </span>
            )}
            {studentActionStatus && (
              <span className={`assignment-status ${studentActionStatus.type}`}>
                {studentActionStatus.message}
              </span>
            )}
            {classesLoading ? (
              <p>Yükleniyor...</p>
            ) : classes.length === 0 ? (
              <p>Henüz sınıf oluşturulmadı.</p>
            ) : (
              <div className="classes-grid">
                {classes.map((cls) => {
                  const createdAt = cls.created_at ? new Date(cls.created_at) : null;
                  const createdLabel = createdAt && !Number.isNaN(createdAt.valueOf())
                    ? createdAt.toLocaleDateString('tr-TR')
                    : '-';
                  return (
                    <div key={cls.id} className="class-card">
                      <div className="class-card-header">
                        <h4>{cls.name}</h4>
                        <span className="class-count">
                          {cls.student_count || 0} öğrenci
                        </span>
                      </div>
                      {cls.description && (
                        <p className="class-description">{cls.description}</p>
                      )}
                      <div className="class-card-meta">
                        <span>Oluşturulma: {createdLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'games' && (
          <div className="games-section">
            <h3>🎮 Oyunlar</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Oyunları oynayarak kelimeleri pratik yapabilirsiniz. Öğretmen hesapları için oyun skorları kaydedilmez ve puanlama listelerine eklenmez.
            </p>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <button
                onClick={() => setShowGames(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                🎮 Oyunları Başlat
              </button>
            </div>
          </div>
        )}

        {activeTab === 'words' && (
          <div className="words-section">
            <h3>Kelime Yönetimi ({words.length} kelime)</h3>

            <form className="word-add-form" onSubmit={handleQuickWordSubmit}>
              <div className="word-input-row">
                <div className="word-input-group">
                  <label>İngilizce Kelime</label>
                  <input
                    type="text"
                    placeholder="Örn: apple"
                    value={quickWord.english}
                    onChange={(event) => setQuickWord((prev) => ({ ...prev, english: event.target.value }))}
                  />
                </div>
                <div className="word-input-group">
                  <label>Türkçe Anlamı</label>
                  <input
                    type="text"
                    placeholder="Örn: elma"
                    value={quickWord.turkish}
                    onChange={(event) => setQuickWord((prev) => ({ ...prev, turkish: event.target.value }))}
                  />
                </div>
                <button type="submit" className="word-add-button">Ekle +</button>
                <button
                  type="button"
                  className="word-ai-button"
                  onClick={() =>
                    setWordActionStatus({
                      type: 'info',
                      message: '✨ Yapay zekâ desteği yakında burada!'
                    })
                  }
                >
                  ✨ AI Destek
                </button>
              </div>
              <div className="word-input-row secondary">
                <div className="word-input-group small">
                  <label>Seviye</label>
                  <select
                    value={quickWord.difficulty}
                    onChange={(event) => setQuickWord((prev) => ({ ...prev, difficulty: event.target.value }))}
                  >
                    <option value="1">Seviye 1</option>
                    <option value="2">Seviye 2</option>
                    <option value="3">Seviye 3</option>
                  </select>
                </div>
                <div className="word-input-group small">
                  <label>Kategori</label>
                  <input
                    type="text"
                    placeholder="Örn: animals"
                    value={quickWord.category}
                    onChange={(event) => setQuickWord((prev) => ({ ...prev, category: event.target.value }))}
                  />
                </div>
              </div>
              {wordActionStatus && (
                <div className={`word-status ${wordActionStatus.type}`}>
                  {wordActionStatus.message}
                </div>
              )}
            </form>

            <div className="word-filter-card">
              <div className="filter-group">
                <label>Seviye</label>
                <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                  <option value="all">Tüm seviyeler</option>
                  <option value="1">Seviye 1</option>
                  <option value="2">Seviye 2</option>
                  <option value="3">Seviye 3</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Kategori</label>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">Tüm kategoriler</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group search">
                <label>Kelime Ara</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Kelime ara..."
                />
              </div>
              <div className="filter-count">
                {filteredWords.length} kelime
              </div>
            </div>

            <div className="word-actions-row">
              <div className="word-actions-left">
                <button
                  className={`btn-select-mode ${selectionMode ? 'active' : ''}`}
                  onClick={toggleSelectionMode}
                  type="button"
                >
                  {selectionMode ? 'Seçimi Bitir' : 'Kelimeleri Seç'}
                </button>
                <button className="btn-assign" onClick={openAssignmentModal} type="button">
                  📌 Ödev Hazırla
                </button>
                <button className="btn-new-word" type="button" onClick={() => openWordModal(null)}>
                  ✏️ Gelişmiş Kelime Ekle
                </button>
              </div>
              {assignmentStatus && (
                <span className={`assignment-status ${assignmentStatus.type}`}>
                  {assignmentStatus.message}
                </span>
              )}
            </div>

            <form className="csv-upload-card" onSubmit={handleCsvUpload}>
              <div>
                <h4>📥 Toplu Kelime Yükle</h4>
                <p>CSV formatında kelime listesi yükleyin (English, Turkish, Difficulty, Category)</p>
              </div>
              <div className="csv-upload-actions">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                />
                <button type="submit" disabled={csvLoading}>
                  {csvLoading ? 'Yükleniyor...' : '📤 Yükle'}
                </button>
              </div>
            </form>

            {selectionMode && (
              <div className="selection-bar">
                <span>
                  {selectedWordIds.length} kelime seçildi
                </span>
                <div className="selection-actions">
                  <button className="selection-action-btn" onClick={openAssignmentModal} type="button">
                    Seçilenleri Ödev Ver
                  </button>
                  <button className="selection-action-btn secondary" onClick={clearSelection} type="button">
                    Seçimi Temizle
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <p>Yükleniyor...</p>
            ) : filteredWords.length === 0 ? (
              <div className="empty-state">
                <p>Henüz kelime bulunamadı.</p>
              </div>
            ) : (
              <div className="words-table-wrapper">
                <table className="words-table">
                  <thead>
                    <tr>
                      {selectionMode && <th>Seç</th>}
                      <th>İngilizce</th>
                      <th>Türkçe</th>
                      <th>Seviye</th>
                      <th>Kategori</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWords.map((word) => {
                      const isSelected = selectedWordIds.includes(word.id);
                      const successPercent =
                        word.success_rate ??
                        word.successPercent ??
                        word.stats?.success_rate ??
                        word.stats?.successPercent ??
                        null;

                      const handleRowClick = selectionMode
                        ? () => handleWordSelect(word.id)
                        : undefined;

                      return (
                        <tr
                          key={word.id}
                          className={isSelected ? 'selected' : ''}
                          onClick={handleRowClick}
                        >
                          {selectionMode && (
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleWordSelect(word.id)}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </td>
                          )}
                          <td>{word.english}</td>
                          <td>{word.turkish}</td>
                          <td>
                            <span className={`word-difficulty-badge difficulty-${word.difficulty}`}>
                              Seviye {word.difficulty}
                            </span>
                            {successPercent !== null && (
                              <span className="word-success-indicator">
                                %{Math.round(successPercent)}
                              </span>
                            )}
                          </td>
                          <td>{word.category}</td>
                          <td className="word-actions-group">
                            <button
                              type="button"
                              className="word-action-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openWordModal(word);
                              }}
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              type="button"
                              className="word-action-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleGenerateExamples(word);
                              }}
                              disabled={aiLoading}
                            >
                              ✨ Örnek Al
                            </button>
                            <button
                              type="button"
                              className="word-action-button danger"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteWord(word.id);
                              }}
                            >
                              🗑️ Sil
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="assignment-list">
              <h4>Son Ödevler</h4>
              {assignments.length === 0 ? (
                <p>Henüz ödev oluşturmadınız.</p>
              ) : (
                <ul>
                  {assignments.slice(0, 5).map((assignment) => (
                    <li key={assignment.id}>
                      <div>
                        <strong>{assignment.assigned_to_name}</strong> • {assignment.assigned_to_type === 'class' ? 'Sınıf' : 'Öğrenci'}
                      </div>
                      <span>{assignment.word_ids.length} kelime atandı</span>
                      <span className="assignment-date">
                        {new Date(assignment.created_at).toLocaleString('tr-TR')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <h3>Genel İstatistikler</h3>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Toplam Öğrenci</h4>
                  <p className="stat-number">{statistics.total_students || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Toplam Kelime</h4>
                  <p className="stat-number">{statistics.total_words || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Toplam Oyun</h4>
                  <p className="stat-number">{statistics.total_games || 0}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="heatmap-section">
            <div className="heatmap-header">
              <h3>🔥 Sınıf Aktivite Haritası (Son {heatmapData.length || 0} Gün)</h3>
              <div className="heatmap-toolbar">
                <label htmlFor="heatmap-class-select">Sınıf Seç</label>
                <select
                  id="heatmap-class-select"
                  value={selectedHeatmapClass}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedHeatmapClass(value);
                    fetchClassHeatmap(value);
                  }}
                >
                  <option value="all">Tüm sınıflar</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {heatmapLoading ? (
              <p>Yükleniyor...</p>
            ) : heatmapData.length === 0 ? (
              <p>Henüz aktivite verisi bulunamadı.</p>
            ) : (
              <>
                <div className="heatmap-grid class-heatmap">
                  {heatmapData.map((day) => {
                    const level = getHeatmapLevel(day.percent_active || 0);
                    const dateLabel = new Date(day.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short'
                    });
                    return (
                      <div
                        key={day.date}
                        className={`heatmap-cell intensity-${level}`}
                        title={`${dateLabel}: %${day.percent_active} aktif öğrenci`}
                      >
                        <span>{dateLabel}</span>
                        <strong>%{day.percent_active}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="heatmap-legend">
                  <span>Düşük</span>
                  <div className="legend-colors">
                    <div className="intensity-0"></div>
                    <div className="intensity-1"></div>
                    <div className="intensity-2"></div>
                    <div className="intensity-3"></div>
                    <div className="intensity-4"></div>
                  </div>
                  <span>Yüksek</span>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="goals-section">
            <h3>🎯 Hedef Takibi</h3>
            <div className="goals-grid">
              <div className="goal-card">
                <h4>📚 Kelime Öğrenme Hedefi</h4>
                <p className="goal-description">Her öğrenci 50 kelime öğrensin</p>
                <div className="goal-students">
                  {students.filter(s => (s.words_learned || 0) >= 50).length} / {students.length} öğrenci tamamladı
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(students.filter(s => (s.words_learned || 0) >= 50).length / students.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="goal-card">
                <h4>🎮 Oyun Oynama Hedefi</h4>
                <p className="goal-description">Her öğrenci 10 oyun oynasın</p>
                <div className="goal-students">
                  {students.filter(s => (s.games_played || 0) >= 10).length} / {students.length} öğrenci tamamladı
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(students.filter(s => (s.games_played || 0) >= 10).length / students.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="goal-card">
                <h4>⭐ Puan Hedefi</h4>
                <p className="goal-description">Her öğrenci 500 puan kazansın</p>
                <div className="goal-students">
                  {students.filter(s => (s.points || 0) >= 500).length} / {students.length} öğrenci tamamladı
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(students.filter(s => (s.points || 0) >= 500).length / students.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {classModalOpen && (
        <div className="word-modal-overlay" onClick={closeClassModal}>
          <div className="word-modal" onClick={(event) => event.stopPropagation()}>
            <div className="word-modal-header">
              <h3>Yeni Sınıf Ekle</h3>
              <button className="close-profile-btn" onClick={closeClassModal}>
                ✕
              </button>
            </div>
            <form className="word-form" onSubmit={submitClassForm}>
              <div className="form-row">
                <label htmlFor="class-name">Sınıf Adı</label>
                <input
                  id="class-name"
                  name="name"
                  type="text"
                  value={classFormData.name}
                  onChange={handleClassFormChange}
                  placeholder="Örn: 5/A, Beginner Group"
                />
              </div>
              <div className="form-row">
                <label htmlFor="class-description">Açıklama (isteğe bağlı)</label>
                <input
                  id="class-description"
                  name="description"
                  type="text"
                  value={classFormData.description}
                  onChange={handleClassFormChange}
                  placeholder="Örn: Haftalık kelime tekrar grubu"
                />
              </div>
              {classModalStatus && (
                <div className={`word-modal-status ${classModalStatus.type}`}>
                  {classModalStatus.message}
                </div>
              )}
              <div className="word-modal-actions">
                <button type="submit" className="btn-save-word">
                  Oluştur
                </button>
                <button type="button" className="btn-ghost-cancel" onClick={closeClassModal}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {studentModalOpen && (
        <div className="word-modal-overlay" onClick={closeStudentModal}>
          <div className="word-modal" onClick={(event) => event.stopPropagation()}>
            <div className="word-modal-header">
              <h3>Yeni Öğrenci Ekle</h3>
              <button className="close-profile-btn" onClick={closeStudentModal}>
                ✕
              </button>
            </div>
            <form className="word-form" onSubmit={submitStudentForm}>
              <div className="form-row">
                <label htmlFor="student-username">Kullanıcı Adı</label>
                <input
                  id="student-username"
                  name="username"
                  type="text"
                  value={studentFormData.username}
                  onChange={handleStudentFormChange}
                  placeholder="Örn: ali.demir"
                />
              </div>
              <div className="form-row">
                <label htmlFor="student-password">Geçici Şifre</label>
                <input
                  id="student-password"
                  name="password"
                  type="password"
                  value={studentFormData.password}
                  onChange={handleStudentFormChange}
                  placeholder="En az 6 karakter"
                />
              </div>
              <div className="form-row">
                <label htmlFor="student-class">Sınıf (isteğe bağlı)</label>
                <select
                  id="student-class"
                  name="class_name"
                  value={studentFormData.class_name}
                  onChange={handleStudentFormChange}
                >
                  <option value="">Sınıf seçin</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>
              {studentModalStatus && (
                <div className={`word-modal-status ${studentModalStatus.type}`}>
                  {studentModalStatus.message}
                </div>
              )}
              <div className="word-modal-actions">
                <button type="submit" className="btn-save-word">
                  Öğrenciyi Oluştur
                </button>
                <button type="button" className="btn-ghost-cancel" onClick={closeStudentModal}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {assignmentModalOpen && (
        <div className="assignment-modal-overlay" onClick={closeAssignmentModal}>
          <div className="assignment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="assignment-modal-header">
              <h3>📌 Ödev Hazırla</h3>
              <button className="close-profile-btn" onClick={closeAssignmentModal}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignmentSubmit}>
              <div className="assignment-section">
                <label htmlFor="assignment-target-type">Hedef</label>
                <div className="assignment-target">
                  <select
                    id="assignment-target-type"
                    value={assignmentTargetType}
                    onChange={(event) => {
                      setAssignmentTargetType(event.target.value);
                      setAssignmentTargetId('');
                    }}
                  >
                    <option value="student">Öğrenci Seç</option>
                    <option value="class">Sınıf Seç</option>
                  </select>
                  {assignmentTargetType === 'student' ? (
                    <select
                      value={assignmentTargetId}
                      onChange={(event) => setAssignmentTargetId(event.target.value)}
                    >
                      <option value="">Öğrenci seçin</option>
                      {students.filter((student) => student.role === 'student').map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.username}
                          {student.class_name ? ` • ${student.class_name}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={assignmentTargetId}
                      onChange={(event) => setAssignmentTargetId(event.target.value)}
                    >
                      <option value="">Sınıf seçin</option>
                      {classOptions.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="assignment-section">
                <label>Seçilen Kelimeler ({selectedWords.length})</label>
                <div className="selected-words-grid">
                  {selectedWords.map((word) => (
                    <span key={word.id} className="selected-word-chip">
                      {word.english} ({word.turkish})
                    </span>
                  ))}
                </div>
              </div>

              <div className="assignment-actions">
                <button type="submit" className="btn-assign-submit">
                  Ödevi Oluştur
                </button>
                <button type="button" className="btn-ghost-cancel" onClick={closeAssignmentModal}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {wordModalOpen && (
        <div className="word-modal-overlay" onClick={closeWordModal}>
          <div className="word-modal" onClick={(event) => event.stopPropagation()}>
            <div className="word-modal-header">
              <h3>{editingWordId ? 'Kelimeyi Düzenle' : 'Yeni Kelime Ekle'}</h3>
              <button className="close-profile-btn" onClick={closeWordModal}>
                ✕
              </button>
            </div>
            <form className="word-form" onSubmit={submitWordForm}>
              <div className="form-row">
                <label htmlFor="word-english">İngilizce Kelime</label>
                <input
                  id="word-english"
                  name="english"
                  type="text"
                  value={wordFormData.english}
                  onChange={handleWordFormChange}
                  placeholder="Örn: understand"
                />
              </div>
              <div className="form-row">
                <label htmlFor="word-turkish">Türkçe Karşılığı</label>
                <input
                  id="word-turkish"
                  name="turkish"
                  type="text"
                  value={wordFormData.turkish}
                  onChange={handleWordFormChange}
                  placeholder="Örn: anlamak"
                />
              </div>
              <div className="form-row two-column">
                <div>
                  <label htmlFor="word-difficulty">Seviye</label>
                  <select
                    id="word-difficulty"
                    name="difficulty"
                    value={wordFormData.difficulty}
                    onChange={handleWordFormChange}
                  >
                    <option value="1">Seviye 1</option>
                    <option value="2">Seviye 2</option>
                    <option value="3">Seviye 3</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="word-category">Kategori</label>
                  <input
                    id="word-category"
                    name="category"
                    type="text"
                    value={wordFormData.category}
                    onChange={handleWordFormChange}
                    placeholder="Örn: günlük yaşam"
                  />
                </div>
              </div>
              {wordModalStatus && (
                <div className={`word-modal-status ${wordModalStatus.type}`}>
                  {wordModalStatus.message}
                </div>
              )}
              <div className="word-modal-actions">
                <button type="submit" className="btn-save-word">
                  {editingWordId ? 'Kaydet' : 'Ekle'}
                </button>
                <button type="button" className="btn-ghost-cancel" onClick={closeWordModal}>
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedStudentId && (
        <div className="student-profile-overlay" onClick={handleCloseStudentProfile}>
          <div className="student-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-profile-header">
              <div>
                <h3>{selectedStudentBasic?.username || studentProfile?.student?.username}</h3>
                <p className="student-profile-meta">
                  {selectedStudentBasic?.class_name || studentProfile?.student?.class_name || 'Sınıf bilgisi yok'}
                </p>
              </div>
              <button className="close-profile-btn" onClick={handleCloseStudentProfile}>
                ✕
              </button>
            </div>

            {studentProfileLoading ? (
              <div className="student-profile-loading">Öğrenci profili yükleniyor...</div>
            ) : studentProfile ? (
              <div className="student-profile-content">
                <div className="profile-summary-grid">
                  <div className="profile-summary-card">
                    <span className="summary-label">Puan</span>
                    <strong>{studentProfile.student?.points || 0}</strong>
                  </div>
                  <div className="profile-summary-card">
                    <span className="summary-label">Öğrenilen Kelime</span>
                    <strong>{studentProfile.student?.words_learned || 0}</strong>
                  </div>
                  <div className="profile-summary-card">
                    <span className="summary-label">Oynanan Oyun</span>
                    <strong>{studentProfile.student?.games_played || 0}</strong>
                  </div>
                  <div className="profile-summary-card">
                    <span className="summary-label">Quiz Ortalama</span>
                    <strong>{selectedStudentSummary?.average_quiz_score ?? '-'}</strong>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Günlük Aktivite (Son 30 Gün)</h4>
                  <div className="profile-activity-bar">
                    {studentProfile.daily_activity?.map((day) => {
                      const intensity =
                        day.games_played * 10 + (day.correct_answers || 0) * 2 + (day.quizzes_completed || 0) * 15;
                      return (
                        <div
                          key={day.date}
                          className="activity-column"
                          style={{ height: `${Math.min(intensity, 100)}%` }}
                          title={`${new Date(day.date).toLocaleDateString('tr-TR')} • ${
                            day.games_played
                          } oyun, ${day.correct_answers} doğru, ${day.quizzes_completed || 0} quiz`}
                        ></div>
                      );
                    })}
                  </div>
                </div>

                <div className="profile-section two-column">
                  <div className="profile-card">
                    <h4>Son Aktiviteler</h4>
                    {studentProfile.game_history && studentProfile.game_history.length > 0 ? (
                      <ul className="profile-activity-list">
                        {studentProfile.game_history.slice(0, 6).map((activity) => (
                          <li key={activity.id}>
                            <div>
                              <strong>{activity.game_type}</strong>
                              <span className="activity-meta">
                                Puan: {activity.score} • Doğru: {activity.correct_answers} • Yanlış:{' '}
                                {activity.wrong_answers}
                              </span>
                            </div>
                            <span className="activity-time">
                              {activity.created_at
                                ? new Date(activity.created_at).toLocaleString('tr-TR')
                                : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Henüz oyun aktivitesi yok.</p>
                    )}
                  </div>

                  <div className="profile-card">
                    <h4>Quiz Geçmişi</h4>
                    {studentProfile.quiz_history && studentProfile.quiz_history.length > 0 ? (
                      <ul className="profile-quiz-list">
                        {studentProfile.quiz_history.slice(0, 6).map((quiz) => (
                          <li key={quiz.id || quiz.submitted_at}>
                            <div>
                              <strong>{quiz.score} puan</strong>
                              <span className="activity-meta">
                                {quiz.correct_answers}/{quiz.total_questions} doğru
                              </span>
                            </div>
                            <span className="activity-time">
                              {quiz.submitted_at ? new Date(quiz.submitted_at).toLocaleString('tr-TR') : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Quiz geçmişi bulunamadı.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p>Öğrenci profili bulunamadı.</p>
            )}
          </div>
        </div>
      )}

      {showGames && (
        <div className="game-modal-overlay" onClick={() => setShowGames(false)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <GameSelector 
              apiUrl={apiUrl} 
              token={localStorage.getItem('token')} 
              onClose={() => setShowGames(false)}
              onNavigate={(targetTab) => {
                setShowGames(false);
                if (targetTab) {
                  setActiveTab(targetTab);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherPanel;

