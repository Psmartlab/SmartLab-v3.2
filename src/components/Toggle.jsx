import React from 'react';

const Toggle = ({ checked, onChange, disabled }) => (
  <label className={`relative inline-flex items-center ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
    <input 
      type="checkbox" 
      className="sr-only peer" 
      checked={checked} 
      onChange={onChange} 
      disabled={disabled} 
    />
    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
  </label>
);

export default Toggle;
