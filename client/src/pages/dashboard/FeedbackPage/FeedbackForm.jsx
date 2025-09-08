import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loading } from '../../../components';
import { useParams } from 'react-router-dom';
import { useUserContext } from '../../../context';

const BASE_URL = process.env.REACT_APP_URL;

const FeedbackForm = () => {
  const { common_id } = useParams();
  const { user } = useUserContext();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/feedback/form`, {
          withCredentials: true
        });
        setQuestions(response.data.questions);
        // Initialize answers object
        const initialAnswers = {};
        response.data.questions.forEach(q => {
          initialAnswers[q.questionNo] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError('Failed to load feedback questions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleInputChange = (questionNo, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionNo]: value
    }));
  };

  const validateAnswers = () => {
    let isValid = true;
    let emptyFields = [];

    questions.forEach(question => {
      const answer = answers[question.questionNo];
      if (!answer || answer === '') {
        isValid = false;
        emptyFields.push(question.questionNo);
      }
    });

    if (!isValid) {
      alert(`Please fill in all questions. Missing questions: ${emptyFields.join(', ')}`);
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAnswers()) {
      return;
    }

    setSubmitting(true);

    try {
      const formattedAnswers = Object.entries(answers).map(([questionNo, value]) => ({
        questionNo: parseInt(questionNo),
        questionType: questions.find(q => q.questionNo === parseInt(questionNo)).questionType,
        value: value
      }));

      await axios.post(
        `${BASE_URL}/api/v1/feedback/form`,
        {
          subjectId: common_id,
          by: user._id,
          answers: formattedAnswers
        },
        { withCredentials: true }
      );

      alert('Feedback submitted successfully!');
      // Reset form
      const initialAnswers = {};
      questions.forEach(q => {
        initialAnswers[q.questionNo] = '';
      });
      setAnswers(initialAnswers);
    } catch (err) {
      alert('Failed to submit feedback: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading count={5} />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Course Feedback</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map(question => (
          <div key={question.questionNo} className="space-y-2">
            <label className="block font-medium">
              {question.questionNo}. {question.question}
            </label>
            
            {question.questionType === 'rate' && (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleInputChange(question.questionNo, rating)}
                    className={`p-2 rounded ${
                      answers[question.questionNo] === rating
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            )}

            {question.questionType === 'true/false' && (
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`q${question.questionNo}`}
                    value="true"
                    checked={answers[question.questionNo] === 'true'}
                    onChange={(e) => handleInputChange(question.questionNo, e.target.value)}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`q${question.questionNo}`}
                    value="false"
                    checked={answers[question.questionNo] === 'false'}
                    onChange={(e) => handleInputChange(question.questionNo, e.target.value)}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            )}

            {question.questionType === 'select' && (
              <select
                value={answers[question.questionNo]}
                onChange={(e) => handleInputChange(question.questionNo, e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select an option</option>
                {question.options.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {question.questionType === 'descriptive' && (
              <textarea
                value={answers[question.questionNo]}
                onChange={(e) => handleInputChange(question.questionNo, e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Enter your answer..."
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded hover:bg-primary-700 disabled:bg-gray-400"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm; 