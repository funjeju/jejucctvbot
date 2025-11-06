import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id?: string;
  options?: string[];
  children?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ label, id, options, children, ...props }) => {
  const selectId = id || label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={selectId}
        {...props}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        {options && options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {children}
      </select>
    </div>
  );
};

export default Select;