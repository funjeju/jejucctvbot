import React from 'react';

interface CheckboxGroupProps {
  label?: string;
  // Use either options or optionGroups
  options?: string[];
  optionGroups?: Record<string, string[]>;
  selectedOptions?: string[]; // 기존
  selectedValues?: string[]; // 새로운 prop 추가
  onChange: (option: string | string[]) => void; // string[] 타입도 허용
  baseOption?: string;
  className?: string;
  onSelectAll?: (allOptions: string[]) => void;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  optionGroups,
  selectedOptions,
  selectedValues, // 새로운 prop
  onChange,
  baseOption,
  className = '',
  onSelectAll
}) => {
  // selectedValues 또는 selectedOptions 사용 (둘 다 지원)
  const selected = selectedValues || selectedOptions || [];
  const isBaseSelected = baseOption ? selected.includes(baseOption) : false;

  const handleBaseOptionClick = (option: string) => {
    if (option === baseOption && onSelectAll) {
      // baseOption 클릭 시 전체 선택
      const allOptions = optionGroups
        ? Object.values(optionGroups).flat()
        : options || [];
      onSelectAll(allOptions);
    } else {
      // selectedValues prop이 사용되는 경우 (배열 전체를 반환)
      if (selectedValues !== undefined) {
        const newSelected = selected.includes(option)
          ? selected.filter(o => o !== option)
          : [...selected, option];
        onChange(newSelected);
      } else {
        // 기존 방식 (단일 옵션 토글)
        onChange(option);
      }
    }
  };

  const renderCheckboxes = (opts: string[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {opts.map((option) => (
        <label
          key={option}
          className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            checked={selected.includes(option)}
            onChange={() => handleBaseOptionClick(option)}
          />
          <span className="text-sm text-gray-800">{option}</span>
        </label>
      ))}
    </div>
  );

  const allGroups = optionGroups || (options ? { _default: options } : {});
  const baseGroupKey = baseOption ? Object.keys(allGroups).find(key => allGroups[key].includes(baseOption)) : null;

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="mt-2 space-y-4">
        {/* Render base group if it exists */}
        {baseGroupKey && (
          <div>
            {allGroups[baseGroupKey].length > 1 && <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{baseGroupKey}</h4>}
            {renderCheckboxes(allGroups[baseGroupKey])}
          </div>
        )}

        {/* Separator and message for "especially" options */}
        {isBaseSelected && Object.keys(allGroups).some(key => key !== baseGroupKey) && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-indigo-700">
              ... 특히 이런 경우/시즌에 더 추천합니다:
            </p>
          </div>
        )}
        
        {/* Render other groups */}
        <div className="space-y-4">
          {Object.entries(allGroups).map(([groupName, groupOptions]) => {
            if (groupName === baseGroupKey) return null;
            return (
              <div key={groupName}>
                {groupName !== '_default' && <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{groupName}</h4>}
                {renderCheckboxes(groupOptions)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CheckboxGroup;
