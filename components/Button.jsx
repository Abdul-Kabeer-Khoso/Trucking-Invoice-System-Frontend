const Button = ({ name, styling, icon, onClick }) => {
  return (
    <div
      className={`flex justify-center items-center bg-gray-300 border border-gray-200 rounded-md px-2 py-1 shadow-md hover:cursor-pointer ${styling}`}
         onClick={onClick}
    >
      <i className={`${icon}`} style={{ color: "#ffffff" }}></i>
      <span className="ml-2">{name}</span>
    </div>
  );
};

export default Button;
