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

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

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
            // Reset analysis when course changes
            setAiAnalysis(null);
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

  const getTrueFalseQuestions = () => {
    if (!data) return [];
    return data.filter(q => q.fields.questionType === 'true/false');
  };

  const handleAnalyzeFeedback = async () => {
      if (!data) return;
      
      // Extract text feedback
      const textFeedback = [];
      data.forEach(item => {
          if (item.nonIntegersValues && item.nonIntegersValues.length > 0) {
              textFeedback.push(...item.nonIntegersValues);
          }
      });

      if (textFeedback.length === 0) {
          alert("No text feedback available to analyze.");
          return;
      }

      setAnalyzing(true);
      try {
          const response = await axios.post(`${BASE_URL}/api/v1/ai/analyze-feedback`, {
              feedbackTexts: textFeedback
          });
          setAiAnalysis(response.data);
      } catch (error) {
          console.error("Analysis failed", error);
          alert("Failed to generate AI insights.");
      } finally {
          setAnalyzing(false);
      }
  };

  if (loading) {
    return <Loading count={7} containerClassName="!my-10" />;
  }

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
          <div className="flex gap-4 mb-6 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'detailed'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Detailed Analysis
            </button>
            <button
              onClick={() => setActiveTab('ai-insights')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'ai-insights'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.394a.75.75 0 010 1.422l-1.183.394c-.447.15-.799.5-.948.948l-.394 1.183a.75.75 0 01-1.422 0l-.394-1.183a1.5 1.5 0 00-.948-.948l-1.183-.394a.75.75 0 010-1.422l1.183-.394c.447-.15.799-.5.948-.948l.394-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
              </svg>
              AI Insights
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
          ) : activeTab === 'detailed' ? (
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
          ) : (
            /* AI Insights Tab */
            <div className="space-y-6">
                {!aiAnalysis ? (
                    <div className="bg-white p-10 rounded-xl shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.394a.75.75 0 010 1.422l-1.183.394c-.447.15-.799.5-.948.948l-.394 1.183a.75.75 0 01-1.422 0l-.394-1.183a1.5 1.5 0 00-.948-.948l-1.183-.394a.75.75 0 010-1.422l1.183-.394c.447-.15.799-.5.948-.948l.394-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Generate Deep AI Insights</h3>
                        <p className="text-gray-600 mb-6 max-w-md">
                            Use AI to perform a deep dive analysis: Aspect-based sentiment, Actionable Recommendations, and Critical Alerts.
                        </p>
                        <button
                            onClick={handleAnalyzeFeedback}
                            disabled={analyzing}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {analyzing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </>
                            ) : (
                                "Analyze Feedback"
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {/* Critical Alerts Banner */}
                        {aiAnalysis.criticalAlerts && aiAnalysis.criticalAlerts.length > 0 && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-bold text-red-800">Critical Attention Required</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <ul className="list-disc pl-5 space-y-1">
                                                {aiAnalysis.criticalAlerts.map((alert, i) => (
                                                    <li key={i}>{alert}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Executive Summary */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Executive Summary
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                {aiAnalysis.executiveSummary || aiAnalysis.summary}
                            </p>
                        </div>

                        {/* Aspect Analysis Grid */}
                        {aiAnalysis.aspectAnalysis && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(aiAnalysis.aspectAnalysis).map(([key, data]) => (
                                    <div key={key} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="capitalize font-bold text-gray-700">{key}</h4>
                                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                                                data.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                                                data.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {data.sentiment}
                                            </span>
                                        </div>
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Score</span>
                                                <span>{data.score}/10</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full ${
                                                        data.score >= 7 ? 'bg-green-500' : 
                                                        data.score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`} 
                                                    style={{ width: `${data.score * 10}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {data.keyPoints.slice(0, 2).map((point, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="mt-1.5 w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></span>
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Actionable Recommendations */}
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Action Plan
                                </h3>
                                <div className="space-y-3">
                                    {aiAnalysis.actionableRecommendations && aiAnalysis.actionableRecommendations.map((rec, index) => (
                                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase mt-0.5 ${
                                                rec.priority === 'High' ? 'bg-red-100 text-red-700' :
                                                rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {rec.priority}
                                            </span>
                                            <p className="text-sm text-gray-700">{rec.action}</p>
                                        </div>
                                    ))}
                                    {(!aiAnalysis.actionableRecommendations || aiAnalysis.actionableRecommendations.length === 0) && (
                                        <p className="text-gray-500 italic">No specific actions recommended.</p>
                                    )}
                                </div>
                            </div>

                            {/* Sentiment Analysis (Simplified) */}
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Overall Sentiment</h3>
                                <div className="flex flex-col gap-4 justify-center h-full">
                                    <div className="flex items-center gap-3">
                                        <span className="w-20 font-medium text-green-600">Positive</span>
                                        <div className="flex-grow bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div className="bg-green-500 h-full rounded-full" style={{ width: `${aiAnalysis.sentiment.positive}%` }}></div>
                                        </div>
                                        <span className="w-12 text-right text-sm font-bold">{aiAnalysis.sentiment.positive}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-20 font-medium text-gray-600">Neutral</span>
                                        <div className="flex-grow bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div className="bg-gray-400 h-full rounded-full" style={{ width: `${aiAnalysis.sentiment.neutral}%` }}></div>
                                        </div>
                                        <span className="w-12 text-right text-sm font-bold">{aiAnalysis.sentiment.neutral}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="w-20 font-medium text-red-600">Negative</span>
                                        <div className="flex-grow bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div className="bg-red-500 h-full rounded-full" style={{ width: `${aiAnalysis.sentiment.negative}%` }}></div>
                                        </div>
                                        <span className="w-12 text-right text-sm font-bold">{aiAnalysis.sentiment.negative}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
