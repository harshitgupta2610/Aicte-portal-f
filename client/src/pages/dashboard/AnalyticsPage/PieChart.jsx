import classNames from "classnames"

function PieChart({ data, width, yesColor, noColor, className }) {
  if (!width) width = "150px"
  if (!yesColor) yesColor = "#008AD4"
  if (!noColor) noColor = "#B6E8FF"

  // Calculate percentage from feedback data
  const calculatePercentage = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return 0;

    const question = data[0]; // Get the first question since we're only showing one at a time
    if (!question || !question.responses || !question.totalResponses) return 0;

    const trueResponses = question.responses.filter(r => r === 'true').length;
    return (trueResponses / question.totalResponses) * 100;
  };

  const yesPer = calculatePercentage();
  const pieClass = classNames("pie", className);

  const pieStyle = {
    "--percent": yesPer || 0,
    "--color1": yesColor,
    "--color2": noColor,
    "--w": width,
  }
  
  return (
    <>
      <div className={pieClass} style={pieStyle}>
        <p className="absolute inset-0 m-auto w-fit h-fit text-base">
          {(yesPer || 0).toFixed(2)}%
        </p>
      </div>
    </>
  )
}

export default PieChart;