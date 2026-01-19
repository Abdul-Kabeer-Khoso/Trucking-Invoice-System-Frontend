const InputField = ({ type, label, value, onChange}) => {

  return (
   <input type={type} placeholder={label}   value={value}
      onChange={onChange} className="w-[47%] p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"/>
  );
};

export default InputField;
