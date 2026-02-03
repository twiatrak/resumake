import React from 'react';

interface PageOverflowWarningProps {
  isOverflowing: boolean;
  overflowPercentage: number;
  contentHeight: number;
  maxHeight: number;
}

const PageOverflowWarning: React.FC<PageOverflowWarningProps> = ({
  isOverflowing,
  overflowPercentage,
  contentHeight,
  maxHeight,
}) => {
  if (!isOverflowing) {
    return null;
  }

  return (
    <div className="print:hidden fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-orange-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Page Overflow Warning
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>
                Your resume content is <strong>{overflowPercentage}%</strong> larger than the A4 page size.
                Content height: {Math.round(contentHeight)}px, Max height: {Math.round(maxHeight)}px.
              </p>
              <p className="mt-1">
                To fit within one A4 page, consider:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Reducing font size using the customization panel</li>
                <li>Removing or shortening some sections</li>
                <li>Using a more compact template (e.g., Skills Sidebar)</li>
                <li>Condensing bullet points or descriptions</li>
              </ul>
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            <div className="text-xs text-orange-600 font-semibold">
              +{overflowPercentage}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageOverflowWarning;
