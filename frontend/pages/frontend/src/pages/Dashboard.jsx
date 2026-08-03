import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, DollarSign, Bell, Award, Download, GraduationCap, User, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [fees, setFees] = useState([]);
  const [results, setResults] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/student-login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchData(token);
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const [feesData, resultsData, updatesData] = await Promise.all([
        fetch('http://localhost:5000/api/fees', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        fetch('http://localhost:5000/api/results', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        fetch('http://localhost:5000/api/updates').then(res => res.json()),
      ]);
      
      setFees(feesData || []);
      setResults(resultsData || []);
      setUpdates(updatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
    navigate('/student-login');
  };

  const getFeeStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const checkAllFeesPaid = () => {
    return fees.length > 0 && fees.every(fee => fee.status === 'paid');
  };

  const downloadResultsPDF = () => {
    const token = localStorage.getItem('token');
    let content = `Mushagashe Vocational Training Centre - Student Results\n`;
    content += `Student: ${user?.full_name}\n`;
    content += `Student Number: ${user?.student_number}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += `Results:\n`;
    content += `${'='.repeat(50)}\n`;
    
    results.forEach((result, index) => {
      content += `${index + 1}. ${result.course_name}\n`;
      content += `   Grade: ${result.grade}\n`;
      content += `   Score: ${result.score || 'N/A'}\n`;
      content += `   Semester: ${result.semester || 'N/A'}\n`;
      content += `   Year: ${result.year || 'N/A'}\n`;
      content += `   Remarks: ${result.remarks || 'N/A'}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${user?.student_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const outstandingBalance = fees.filter(f => f.status === 'unpaid').reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl shadow-md">
                <GraduationCap className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Mushagashe Vocational Training Centre</h1>
                <p className="text-gray-500 text-sm">Student Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-800">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.student_number}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all duration-200 font-medium"
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {user?.full_name}!</h2>
          <p className="text-gray-600">Here's an overview of your academic journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-md">
                  <DollarSign className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${outstandingBalance.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-md">
                  <Award className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Results Available</p>
                  <p className="text-2xl font-bold text-gray-800">{results.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-md">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fees Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign size={24} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Fee Status</h2>
            </div>
            
            {fees.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <DollarSign className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500">No fee records found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fees.map((fee) => (
                  <div key={fee.id} className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{fee.description || 'Course Fee'}</h3>
                        <p className="text-2xl font-bold text-purple-600">${fee.amount.toFixed(2)}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-xs font-semibold border ${getFeeStatusColor(fee.status)}`}>
                        {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                      </span>
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

          {/* Results Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Award size={24} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">My Results</h2>
              </div>
              {checkAllFeesPaid() && results.length > 0 && (
                <button
                  onClick={downloadResultsPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
                >
                  <Download size={18} />
                  Download
                </button>
              )}
            </div>
            
            {!checkAllFeesPaid() ? (
              <div className="text-center py-12 bg-yellow-50 rounded-xl border border-yellow-200">
                <Lock className="text-yellow-500 mx-auto mb-3" size={48} />
                <p className="text-yellow-800 font-semibold mb-1">Fee Payment Required</p>
                <p className="text-yellow-700 text-sm">Complete all fee payments to view results</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Award className="text-gray-300 mx-auto mb-3" size={48} />
                <p className="text-gray-500">No results available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="border border-gray-200 rounded-xl p-5 hover:border-purple-300 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{result.course_name}</h3>
                        <p className="text-sm text-gray-600">
                          Semester: {result.semester || 'N/A'} | Year: {result.year || 'N/A'}
                        </p>
                      </div>
                      <span className="px-4 py-2 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                        {result.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Score:</span>
                      <span>{result.score || 'N/A'}</span>
                    </div>
                    {result.remarks && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium">Remarks:</span> {result.remarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Updates Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Bell size={24} className="text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Latest Updates</h2>
          </div>
          
          {updates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Bell className="text-gray-300 mx-auto mb-3" size={48} />
              <p className="text-gray-500">No updates available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update.id} className="border border-gray-200 rounded-xl p-5 hover:border-yellow-300 transition-colors duration-200">
                  <h3 className="font-semibold text-gray-800 text-lg mb-2">{update.title}</h3>
                  <p className="text-gray-600 mb-3">{update.content}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>Posted: {new Date(update.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 font-medium">© 2024 Mushagashe Vocational Training Centre</p>
          <p className="text-gray-500 text-sm mt-1">Financed by Ecobank</p>
        </div>
      </footer>
    </div>
  );
}
