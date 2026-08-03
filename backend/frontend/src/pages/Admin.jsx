import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, DollarSign, Bell, Award, Plus, Trash2, Shield, GraduationCap, Calendar, X } from 'lucide-react';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [results, setResults] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  const [newStudent, setNewStudent] = useState({ student_number: '', full_name: '', phone: '', password: '' });
  const [newUpdate, setNewUpdate] = useState({ title: '', content: '' });
  const [newFee, setNewFee] = useState({ user_id: '', amount: '', description: '', due_date: '' });
  const [newResult, setNewResult] = useState({ user_id: '', course_name: '', grade: '', score: '', semester: '', year: '', remarks: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/admin-login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchData(token);
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const [studentsData, feesData, resultsData, updatesData] = await Promise.all([
        fetch('http://localhost:5000/api/students', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        fetch('http://localhost:5000/api/fees', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        fetch('http://localhost:5000/api/results', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        fetch('http://localhost:5000/api/updates').then(res => res.json()),
      ]);
      
      setStudents(studentsData || []);
      setFees(feesData || []);
      setResults(resultsData || []);
      setUpdates(updatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStudents([]);
      setFees([]);
      setResults([]);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin-login');
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch('http://localhost:5000/api/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newStudent),
    }).then(res => res.json());
    setNewStudent({ student_number: '', full_name: '', phone: '', password: '' });
    setShowStudentModal(false);
    fetchData(token);
  };

  const handleDeleteStudent = async (studentId) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/students/${studentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData(token);
  };

  const handleCreateUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch('http://localhost:5000/api/updates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newUpdate),
    }).then(res => res.json());
    setNewUpdate({ title: '', content: '' });
    setShowUpdateModal(false);
    fetchData(token);
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch('http://localhost:5000/api/fees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...newFee, amount: parseFloat(newFee.amount) }),
    }).then(res => res.json());
    setNewFee({ user_id: '', amount: '', description: '', due_date: '' });
    setShowFeeModal(false);
    fetchData(token);
  };

  const handleMarkFeePaid = async (feeId) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/fees/${feeId}/pay`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData(token);
  };

  const handleDeleteFee = async (feeId) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/fees/${feeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData(token);
  };

  const handleCreateResult = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await fetch('http://localhost:5000/api/results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...newResult, score: parseFloat(newResult.score), year: parseInt(newResult.year) }),
    }).then(res => res.json());
    setNewResult({ user_id: '', course_name: '', grade: '', score: '', semester: '', year: '', remarks: '' });
    setShowResultModal(false);
    fetchData(token);
  };

  const handleDeleteResult = async (resultId) => {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5000/api/results/${resultId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData(token);
  };

  const getFeeStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-yellow-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Mushagashe Vocational Training Centre</h1>
                <p className="text-gray-500 text-sm">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-800">{user?.full_name}</p>
                <p className="text-sm text-gray-500">Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl hover:bg-yellow-200 transition-all duration-200 font-medium"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
          <p className="text-gray-600">Manage students, fees, results, and announcements</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-md">
                  <Users className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Students</p>
                  <p className="text-2xl font-bold text-gray-800">{students.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-md">
                  <DollarSign className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Fees</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${totalFees.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-md">
                  <Award className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Results</p>
                  <p className="text-2xl font-bold text-gray-800">{results.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-md">
                  <Bell className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Updates</p>
                  <p className="text-2xl font-bold text-gray-800">{updates.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 border border-gray-100">
          <div className="flex border-b border-gray-100">
            {['students', 'fees', 'results', 'updates'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-b-2 border-yellow-500 text-yellow-600 bg-yellow-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users size={24} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Student Management</h2>
              </div>
              <button
                onClick={() => setShowStudentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Add Student
              </button>
            </div>
            
            {students.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500">No students registered</p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors duration-200 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <GraduationCap className="text-purple-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{student.full_name}</h3>
                        <p className="text-sm text-gray-600">Student Number: {student.student_number}</p>
                        <p className="text-sm text-gray-600">Phone: {student.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fees Tab */}
        {activeTab === 'fees' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign size={24} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Fee Management</h2>
              </div>
              <button
                onClick={() => setShowFeeModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Add Fee
              </button>
            </div>
            
            {fees.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <DollarSign className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500">No fee records found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fees.map((fee) => (
                  <div key={fee.id} className="border border-gray-200 rounded-xl p-5 hover:border-green-300 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{fee.full_name} ({fee.student_number})</h3>
                        <p className="text-2xl font-bold text-green-600">${fee.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{fee.description || 'Course Fee'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-4 py-2 rounded-full text-xs font-semibold border ${getFeeStatusColor(fee.status)}`}>
                          {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                        </span>
                        {fee.status === 'unpaid' && (
                          <button
                            onClick={() => handleMarkFeePaid(fee.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFee(fee.id)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    {fee.due_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>Due: {new Date(fee.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Award size={24} className="text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Results Management</h2>
              </div>
              <button
                onClick={() => setShowResultModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Add Result
              </button>
            </div>
            
            {results.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Award className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500">No results posted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border border-gray-200 rounded-xl p-5 hover:border-yellow-300 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{result.course_name}</h3>
                        <p className="text-sm text-gray-600">Student: {result.full_name} ({result.student_number})</p>
                        <p className="text-sm text-gray-600">Grade: {result.grade} | Score: {result.score || 'N/A'}</p>
                        <p className="text-sm text-gray-600">Semester: {result.semester || 'N/A'} | Year: {result.year || 'N/A'}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteResult(result.id)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Bell size={24} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Announcements</h2>
              </div>
              <button
                onClick={() => setShowUpdateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                Post Update
              </button>
            </div>
            
            {updates.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Bell className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500">No updates posted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div key={update.id} className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors duration-200">
                    <h3 className="font-semibold text-gray-800 text-lg mb-2">{update.title}</h3>
                    <p className="text-gray-600 mb-3">{update.content}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={16} />
                      <span>Posted: {new Date(update.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 font-medium">© 2024 Mushagashe Vocational Training Centre</p>
          <p className="text-gray-500 text-sm mt-1">Financed by Ecobank</p>
        </div>
      </footer>

      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Add New Student</h3>
              <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Student Number</label>
                <input
                  type="text"
                  value={newStudent.student_number}
                  onChange={(e) => setNewStudent({ ...newStudent, student_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Add Student
                </button>
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Post New Update</h3>
              <button onClick={() => setShowUpdateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newUpdate.title}
                  onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                <textarea
                  value={newUpdate.content}
                  onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all duration-200"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Post Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fee Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Add New Fee</h3>
              <button onClick={() => setShowFeeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateFee} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                <input
                  type="number"
                  value={newFee.user_id}
                  onChange={(e) => setNewFee({ ...newFee, user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newFee.amount}
                  onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newFee.description}
                  onChange={(e) => setNewFee({ ...newFee, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={newFee.due_date}
                  onChange={(e) => setNewFee({ ...newFee, due_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Add Fee
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Add New Result</h3>
              <button onClick={() => setShowResultModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateResult} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                <input
                  type="number"
                  value={newResult.user_id}
                  onChange={(e) => setNewResult({ ...newResult, user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
                <input
                  type="text"
                  value={newResult.course_name}
                  onChange={(e) => setNewResult({ ...newResult, course_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                <input
                  type="text"
                  value={newResult.grade}
                  onChange={(e) => setNewResult({ ...newResult, grade: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Score</label>
                <input
                  type="number"
                  step="0.01"
                  value={newResult.score}
                  onChange={(e) => setNewResult({ ...newResult, score: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Semester</label>
                <input
                  type="text"
                  value={newResult.semester}
                  onChange={(e) => setNewResult({ ...newResult, semester: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  value={newResult.year}
                  onChange={(e) => setNewResult({ ...newResult, year: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={newResult.remarks}
                  onChange={(e) => setNewResult({ ...newResult, remarks: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none transition-all duration-200"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Add Result
                </button>
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
