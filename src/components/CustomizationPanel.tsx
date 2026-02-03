import React from 'react';
import { TemplateType, ColorScheme, FontFamily, CustomSection, SectionPlacementConfig, PhotoShape, PhotoPosition, PhotoSize } from '../types/resume';
import { TEMPLATES, COLOR_SCHEMES, FONTS, PHOTO_SHAPES, PHOTO_POSITIONS, PHOTO_SIZES } from '../config/customization';
import PlacementWarningDialog from './PlacementWarningDialog';

interface CustomizationPanelProps {
  template: TemplateType;
  colorScheme: ColorScheme;
  fontFamily: FontFamily;
  photo: string | null;
  customSections: CustomSection[];
  sectionOrder: string[];
  sectionPlacement: SectionPlacementConfig;
  globalFontSizeMultiplier: number;
  photoShape: PhotoShape;
  photoPosition: PhotoPosition;
  photoSize: PhotoSize;
  onTemplateChange: (template: TemplateType) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onFontFamilyChange: (font: FontFamily) => void;
  onPhotoChange: (photo: string | null) => void;
  onAddCustomSection: (section: CustomSection) => void;
  onRemoveCustomSection: (id: string) => void;
  onReorderSections: (order: string[]) => void;
  onSectionPlacementChange: (placement: SectionPlacementConfig) => void;
  onGlobalFontSizeChange: (multiplier: number) => void;
  onPhotoShapeChange: (shape: PhotoShape) => void;
  onPhotoPositionChange: (position: PhotoPosition) => void;
  onPhotoSizeChange: (size: PhotoSize) => void;
}

const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  template,
  colorScheme,
  fontFamily,
  photo,
  customSections,
  sectionOrder,
  sectionPlacement,
  globalFontSizeMultiplier,
  photoShape,
  photoPosition,
  photoSize,
  onTemplateChange,
  onColorSchemeChange,
  onFontFamilyChange,
  onPhotoChange,
  onAddCustomSection,
  onRemoveCustomSection,
  onReorderSections,
  onSectionPlacementChange,
  onGlobalFontSizeChange,
  onPhotoShapeChange,
  onPhotoPositionChange,
  onPhotoSizeChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [newSectionContent, setNewSectionContent] = React.useState('');
  const [warningDialog, setWarningDialog] = React.useState<{ isOpen: boolean; sectionId: string; sectionName: string }>({
    isOpen: false,
    sectionId: '',
    sectionName: '',
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onPhotoChange(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomSection = () => {
    if (newSectionTitle.trim()) {
      const newSection: CustomSection = {
        id: `custom-${Date.now()}`,
        title: newSectionTitle,
        content: newSectionContent,
      };
      onAddCustomSection(newSection);
      setNewSectionTitle('');
      setNewSectionContent('');
    }
  };

  const moveSectionUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...sectionOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      onReorderSections(newOrder);
    }
  };

  const moveSectionDown = (index: number) => {
    if (index < sectionOrder.length - 1) {
      const newOrder = [...sectionOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      onReorderSections(newOrder);
    }
  };

  const getSectionLabel = (sectionId: string): string => {
    if (sectionId.startsWith('custom-')) {
      const customSection = customSections.find(s => s.id === sectionId);
      return customSection?.title || 'Custom Section';
    }
    return sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  };

  const toggleSectionPlacement = (sectionId: string) => {
    const currentPlacement = sectionPlacement[sectionId] || 'main';
    const newPlacement = currentPlacement === 'main' ? 'sidebar' : 'main';
    
    // Warn for large sections moving to sidebar
    const largeSections = ['experience', 'education'];
    if (newPlacement === 'sidebar' && largeSections.includes(sectionId)) {
      setWarningDialog({
        isOpen: true,
        sectionId,
        sectionName: getSectionLabel(sectionId),
      });
    } else {
      onSectionPlacementChange({ ...sectionPlacement, [sectionId]: newPlacement });
    }
  };

  const confirmPlacementChange = () => {
    const newPlacement = (sectionPlacement[warningDialog.sectionId] || 'main') === 'main' ? 'sidebar' : 'main';
    onSectionPlacementChange({ ...sectionPlacement, [warningDialog.sectionId]: newPlacement });
    setWarningDialog({ isOpen: false, sectionId: '', sectionName: '' });
  };

  const cancelPlacementChange = () => {
    setWarningDialog({ isOpen: false, sectionId: '', sectionName: '' });
  };

  const isTwoColumnTemplate = template === 'skills-sidebar' || template === 'modern-split' || template === 'accent-sidebar';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg print:hidden z-50"
      >
        {isOpen ? 'Close' : 'Customize'}
      </button>

      {isOpen && (
        <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl overflow-y-auto print:hidden z-40 border-l border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Customize CV</h2>

            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Template</label>
              <div className="space-y-2">
                {Object.entries(TEMPLATES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => onTemplateChange(key as TemplateType)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      template === key
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{value.name}</div>
                    <div className="text-xs text-gray-600">{value.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {photo && (
                <button
                  onClick={() => onPhotoChange(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Photo Customization - only show when photo is uploaded */}
            {photo && (
              <>
                {/* Photo Shape */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Shape</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PHOTO_SHAPES).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => onPhotoShapeChange(key as PhotoShape)}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          photoShape === key
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={value.description}
                      >
                        <div className="text-xs text-gray-700 font-medium">{value.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Position */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PHOTO_POSITIONS).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => onPhotoPositionChange(key as PhotoPosition)}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          photoPosition === key
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={value.description}
                      >
                        <div className="text-xs text-gray-700 font-medium">{value.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Size */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PHOTO_SIZES).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => onPhotoSizeChange(key as PhotoSize)}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          photoSize === key
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xs text-gray-700 font-medium">{value.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Color Scheme */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Color Scheme</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(COLOR_SCHEMES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => onColorSchemeChange(key as ColorScheme)}
                    className={`p-2 rounded-lg border-2 transition-colors ${
                      colorScheme === key
                        ? 'border-blue-600 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded mb-1"
                      style={{ backgroundColor: value.primary }}
                    />
                    <div className="text-xs text-gray-700">{value.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Font</label>
              <select
                value={fontFamily}
                onChange={(e) => onFontFamilyChange(e.target.value as FontFamily)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(FONTS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Global Text Size Control */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Text Size: {Math.round((globalFontSizeMultiplier - 1) * 100)}%
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onGlobalFontSizeChange(Math.max(0.8, globalFontSizeMultiplier - 0.02))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  title="Decrease text size by 2%"
                >
                  -2%
                </button>
                <button
                  onClick={() => onGlobalFontSizeChange(1.0)}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex-1"
                  title="Reset to default size"
                >
                  Reset
                </button>
                <button
                  onClick={() => onGlobalFontSizeChange(Math.min(1.3, globalFontSizeMultiplier + 0.02))}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  title="Increase text size by 2%"
                >
                  +2%
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Adjust all text sizes proportionally (±2% per click)
              </p>
            </div>

            {/* Section Order */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Section Order {isTwoColumnTemplate && <span className="text-xs text-gray-500">(with Placement)</span>}
              </label>
              <div className="space-y-2">
                {sectionOrder.map((sectionId, index) => (
                  <div
                    key={sectionId}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="flex-1 text-sm text-gray-700">
                      {getSectionLabel(sectionId)}
                      {isTwoColumnTemplate && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({sectionPlacement[sectionId] || 'main'})
                        </span>
                      )}
                    </div>
                    {isTwoColumnTemplate && (
                      <button
                        onClick={() => toggleSectionPlacement(sectionId)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Toggle between Main and Sidebar"
                      >
                        {sectionPlacement[sectionId] === 'sidebar' ? '← Main' : 'Sidebar →'}
                      </button>
                    )}
                    <button
                      onClick={() => moveSectionUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSectionDown(index)}
                      disabled={index === sectionOrder.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Sections */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Sections</label>
              {customSections.length > 0 && (
                <div className="space-y-2 mb-3">
                  {customSections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <span className="text-sm text-gray-700">{section.title}</span>
                      <button
                        onClick={() => onRemoveCustomSection(section.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Section title"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Section content"
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <button
                  onClick={handleAddCustomSection}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Add Custom Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PlacementWarningDialog
        isOpen={warningDialog.isOpen}
        sectionName={warningDialog.sectionName}
        onConfirm={confirmPlacementChange}
        onCancel={cancelPlacementChange}
      />
    </>
  );
};

export default CustomizationPanel;
