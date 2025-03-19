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
  const [activeTab, setActiveTab] = useState('overview'); // ['overview', 'detailed']

  const search = useCallback(async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/feedback/analysis/${course?.common_id}`,
        {
          withCredentials: true,
        }
      );
      return response;
    } catch (err) {
      setError(`Error: ${err?.response?.status} - ${err?.response?.data?.message || 'Something went wrong'}`);
      return null;
    }
  }, [course]);

  useEffect(() => {
    if (course?.common_id) {
      setLoading(true);
      setError(null);
      search()
        .then((response) => {
          if (response && response.data?.data) {
            const sortedData = response.data.data.sort(
              (a, b) => a.fields?.questionNo - b.fields?.questionNo
            );
            setData(sortedData);
          }
        })
        .catch((err) => {
          setError(`Error: ${err.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [course, search]);

  const calculateAverageRating = () => {
    if (!data || data.length === 0) return 0;
    const ratingQuestions = data.filter(q => q.fields?.questionType === 'rate');
    if (ratingQuestions.length === 0) return 0;
    const sum = ratingQuestions.reduce((acc, curr) => acc + (curr.integersValues || 0), 0);
    return ((sum / ratingQuestions.length) * 20).toFixed(1);
  };

  const getTotalResponses = () => {
    if (!data || data.length === 0) return 0;
    return data.reduce((acc, curr) => acc + (curr.totalResponses || 0), 0);
  };

  if (loading) {
    return <Loading count={7} containerClassName="!my-10" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-center stroke-[2px] tracking-wider italic align-middle h-[80%] text-xl-custom font-bold text-red-500">
        <h1>{error}</h1>
      </div>
    );
  }

  return (
    <div className="h-full">
      <SearchBar setCourse={setCourse} />
      {data ? (
        !Array.isArray(data) || data.length === 0 ? (
          <div className="flex items-center justify-center text-center stroke-[2px] tracking-wider italic align-middle h-[80%] text-4xl-custom font-black text-gray-500 uppercase">
            <h1>No Feedback Data Available</h1>
          </div>
        ) : (
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
                    {getTotalResponses()} total responses
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

            {activeTab === 'overview' ? (
              /* Overview Tab */
              <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Overall Rating Card */}
                <div className="bg-white shadow-lg rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Rating</h3>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl font-bold text-primary-600">
                      {calculateAverageRating()}%
                    </div>
                    <Rating percent={calculateAverageRating()} className="w-32" />
                  </div>
                </div>

                {/* Course Satisfaction Card */}
                <div className="bg-white shadow-lg rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Satisfaction</h3>
                  <div className="flex items-center gap-6">
                    <PieChart
                      yesPer={data[1]?.integersValues * 100 || 0}
                      width="120px"
                    />
                    <div>
                      <p className="font-medium mb-2">
                        <span className="text-accent-500 text-xl">
                          {((data[1]?.integersValues || 0) * 100).toFixed(1)}%
                        </span>
                        <br />
                        satisfaction rate
                      </p>
                      <p className="text-sm text-gray-500">
                        Based on {data[1]?.totalResponses || 0} responses
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Card */}
                <div className="bg-white shadow-lg rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Difficulty</span>
                        <span>{((data[0]?.integersValues || 0) * 20).toFixed(1)}%</span>
                      </div>
                      <Rating percent={((data[0]?.integersValues || 0) * 20).toFixed(1)} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Interest</span>
                        <span>{((data[2]?.integersValues || 0) * 20).toFixed(1)}%</span>
                      </div>
                      <Rating percent={((data[2]?.integersValues || 0) * 20).toFixed(1)} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Industry Relevance</span>
                        <span>{((data[3]?.integersValues || 0) * 20).toFixed(1)}%</span>
                      </div>
                      <Rating percent={((data[3]?.integersValues || 0) * 20).toFixed(1)} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Detailed Analysis Tab */
              <div className="space-y-6">
                {/* Response Statistics */}
                <div className="bg-white shadow-lg rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Response Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Responses</p>
                      <p className="text-2xl font-bold text-primary-600">{getTotalResponses()}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Average per Question</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {(getTotalResponses() / data.length).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Questions Analyzed</p>
                      <p className="text-2xl font-bold text-primary-600">{data.length}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="bg-white shadow-lg rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Metrics</h3>
                  <div className="space-y-6">
                    {data.map((item, index) => (
                      <div key={index} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">Question {item.fields?.questionNo}</p>
                            <p className="text-sm text-gray-500">{item.fields?.questionType}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.totalResponses} responses</p>
                            {item.integersValues && (
                              <p className="text-sm text-primary-600">
                                {(item.integersValues * 20).toFixed(1)}% rating
                              </p>
                            )}
                          </div>
                        </div>
                        {item.integersValues && (
                          <Rating percent={(item.integersValues * 20).toFixed(1)} />
                        )}
                        {item.nonIntegersValues && item.nonIntegersValues.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            {item.nonIntegersValues.slice(0, 3).map((value, i) => (
                              <p key={i} className="italic">"{value}"</p>
                            ))}
                            {item.nonIntegersValues.length > 3 && (
                              <p className="text-primary-600 mt-1">
                                +{item.nonIntegersValues.length - 3} more responses
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="flex items-center justify-center text-center stroke-[2px] tracking-wider italic align-middle h-[80%] text-4xl-custom font-black text-gray-500 uppercase">
          <h1>Select a course to analyse</h1>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
