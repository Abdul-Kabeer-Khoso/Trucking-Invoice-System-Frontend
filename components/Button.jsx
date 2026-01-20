const Button = ({
  name,
  styling,
  icon,
  onClick,
  bgColor,
  textColor = "#ffffff",
}) => {
  return (
    <div
      className={`flex justify-center items-center border border-gray-200 rounded-md px-2 py-1 shadow-md hover:cursor-pointer hover:opacity-90 transition-all duration-200 ${styling}`}
      onClick={onClick}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {icon && <i className={`${icon}`} style={{ color: textColor }}></i>}
      <span className={`ml-2 ${icon ? "" : ""}`}>{name}</span>
    </div>
  );
};

export default Button;
