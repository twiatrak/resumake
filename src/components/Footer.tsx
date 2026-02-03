import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500 print:mt-2 print:pt-1">
      <p>Generated with Cividussi • {new Date().getFullYear()}</p>
    </footer>
  );
};

export default Footer;
