import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Loading } from "./../../../components";
import SearchBar from "./Searchbar";
import PieChart from "./PieChart";
import Rating from "./Rating";

const BASE_URL = process.env.REACT_APP_URL;

const AnalyticsPage = () => {
  const [course, setCourse] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ totalQuestions: 0, totalResponses: 0 });

  const search = useCallback(async () => {
    if (!course?.common_id) return null;

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${BASE_URL}/api/v1/feedback/analysis/${course.common_id}`,
        { withCredentials: true }
      );
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Something went wrong';
      setError(`Error: ${err.response?.status} - ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    if (course?.common_id) {
      search()
        .then((response) => {
          if (response && response.data) {
            const { data, totalQuestions, totalResponses, message } = response.data;
            setData(data);
            setStats({ totalQuestions, totalResponses });
            if (message) {
              setError(message);
            }
          }
        })
        .catch((err) => {
          setError(`Error: ${err.message}`);
        });
    }
  }, [course, search]);

  const calculateAverageRating = () => {
    if (!data || data.length === 0) return 0;
    const ratingQuestions = data.filter(q => q.fields.questionType === 'rate');
    if (ratingQuestions.length === 0) return 0;
    const sum = ratingQuestions.reduce((acc, curr) => acc + (curr.integersValues || 0), 0);
    return ((sum / ratingQuestions.length) * 20).toFixed(1);
  };

  if (loading) {
    return <Loading count={7} containerClassName="!my-10" />;
  }

  const getTrueFalseQuestions = () => {
    if (!data) return [];
    return data.filter(q => q.fields.questionType === 'true/false');
  };

  return (
    <div className="h-full">
      <SearchBar setCourse={setCourse} />
      {!course ? (
        <div className="flex items-center justify-center text-center h-[80%] text-2xl text-gray-500">
          <h1>Please select a course to view feedback analysis</h1>
        </div>
      ) : data && data.length > 0 ? (
        <div>
          {/* Heading of course */}
          <header className="my-8 w-full">
            <h1 className="mt-4 mx-2 text-3xl-custom text-primary-600 font-bold">
              {course.title?.cur}
            </h1>
            <div className="flex flex-wrap gap-2 items-center">
              <h2 className="mx-2 inline text-xl-custom text-secondary-500">
                {course.level?.cur}
              </h2>
              <h2 className="mx-2 inline text-xl-custom text-secondary-500">
                {course.program?.cur}
              </h2>
              <div className="mx-2 px-4 py-1 bg-primary-100 rounded-full">
                <span className="font-semibold text-primary-700">
                  {stats.totalResponses} total responses
                </span>
              </div>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'detailed'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Detailed Analysis
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Overall Rating</h3>
                <div className="flex items-center justify-center">
                  <Rating value={calculateAverageRating()} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Course Satisfaction</h3>
                <div className="flex items-center justify-center">
                  <PieChart data={getTrueFalseQuestions()} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {data.map((item) => (
                <div key={item.fields.questionNo} className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">
                    {item.fields.questionNo}. {item.fields.question}
                  </h3>
                  {item.fields.questionType === 'rate' ? (
                    <Rating value={(item.integersValues * 20).toFixed(1)} />
                  ) : item.fields.questionType === 'true/false' ? (
                    <PieChart data={[item]} />
                  ) : (
                    <div className="space-y-2">
                      {item.nonIntegersValues?.map((response, i) => (
                        <p key={i} className="text-gray-600 bg-gray-50 p-3 rounded">
                          {response}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-sm text-gray-500">
                    {item.totalResponses} responses
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center text-center h-[80%] text-xl-custom font-bold text-gray-500">
          <h1>{error || "No feedback data available for this course"}</h1>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
