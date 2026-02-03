import React from 'react';
import { COLOR_SCHEMES, PHOTO_SIZES } from '../config/customization';
import { PhotoShape, PhotoPosition, PhotoSize } from '../types/resume';

interface HeaderProps {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
  photo?: string;
  colorScheme?: string;
  template?: string;
  photoShape?: PhotoShape;
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
}

const Header: React.FC<HeaderProps> = ({
  name,
  title,
  email,
  phone,
  location,
  linkedin,
  github,
  website,
  photo,
  colorScheme = 'blue',
  template = 'modern',
  photoShape = 'circle',
  photoPosition = 'center',
  photoSize = 'medium',
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];
  const sizeConfig = PHOTO_SIZES[photoSize];
  
  const getPhotoShapeClass = () => {
    switch (photoShape) {
      case 'circle': return 'rounded-full';
      case 'square': return 'rounded-none';
      case 'rounded-square': return 'rounded-lg';
      default: return 'rounded-full';
    }
  };
  
  const getPhotoSizeStyle = () => ({
    width: sizeConfig.sizes.default,
    height: sizeConfig.sizes.default,
  });
  
  const getPhotoPrintSizeClass = () => {
    // Keep the same physical size across media
    switch (photoSize) {
      case 'small': return '';
      case 'medium': return '';
      case 'large': return '';
      default: return '';
    }
  };

  if (template === 'creative' && photo) {
    return (
      <header className="flex items-start gap-6 mb-6 pb-6 border-b-2" style={{ borderColor: colors.accent }}>
        <img
          src={photo}
          alt={name}
          className={`object-cover ${getPhotoShapeClass()} ${getPhotoPrintSizeClass()}`}
          style={getPhotoSizeStyle()}
        />
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>{name}</h1>
          <h2 className="text-xl mb-4" style={{ color: colors.secondary }}>{title}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>{email}</span>
            <span>•</span>
            <span>{phone}</span>
            <span>•</span>
            <span>{location}</span>
            {linkedin && (
              <>
                <span className="print:hidden">•</span>
                <a href={`https://${linkedin}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
                  {linkedin}
                </a>
              </>
            )}
            {github && (
              <>
                <span className="print:hidden">•</span>
                <a href={`https://${github}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
                  {github}
                </a>
              </>
            )}
            {website && (
              <>
                <span className="print:hidden">•</span>
                <a href={`https://${website}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
                  {website}
                </a>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  if (photo && photoPosition === 'right-corner') {
    const photoWidth = sizeConfig.sizes.default;
    
    return (
      <header className="relative text-center mb-6 pb-6 border-b-2" style={{ borderColor: template === 'classic' ? colors.primary : colors.accent }}>
        <img
          src={photo}
          alt={name}
          className={`absolute top-0 right-0 object-cover ${getPhotoShapeClass()} ${getPhotoPrintSizeClass()}`}
          style={getPhotoSizeStyle()}
        />
        <div style={{ paddingRight: `calc(${photoWidth} + 1rem)` }}>
          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>{name}</h1>
          <h2 className="text-xl mb-4" style={{ color: colors.secondary }}>{title}</h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>{email}</span>
            <span>•</span>
            <span>{phone}</span>
            <span>•</span>
            <span>{location}</span>
            {linkedin && (
              <>
                <span className="print:hidden">•</span>
                <a href={`https://${linkedin}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
                  {linkedin}
                </a>
              </>
            )}
            {github && (
              <>
                <span className="print:hidden">•</span>
                <a href={`https://${github}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
                  {github}
                </a>
              </>
            )}
            {website && (
              <>
                <span className="print:hidden">•</span>
                <a href={`https://${website}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
                  {website}
                </a>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="text-center mb-6 pb-6 border-b-2" style={{ borderColor: template === 'classic' ? colors.primary : colors.accent }}>
      {photo && (
        <img
          src={photo}
          alt={name}
          className={`mx-auto mb-4 object-cover ${getPhotoShapeClass()} ${getPhotoPrintSizeClass()}`}
          style={getPhotoSizeStyle()}
        />
      )}
      <h1 className="text-4xl font-bold mb-2" style={{ color: colors.primary }}>{name}</h1>
      <h2 className="text-xl mb-4" style={{ color: colors.secondary }}>{title}</h2>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>{email}</span>
        <span>•</span>
        <span>{phone}</span>
        <span>•</span>
        <span>{location}</span>
        {linkedin && (
          <>
            <span className="print:hidden">•</span>
            <a href={`https://${linkedin}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
              {linkedin}
            </a>
          </>
        )}
        {github && (
          <>
            <span className="print:hidden">•</span>
            <a href={`https://${github}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
              {github}
            </a>
          </>
        )}
        {website && (
          <>
            <span className="print:hidden">•</span>
            <a href={`https://${website}`} className="hover:opacity-80 print:hidden" style={{ color: colors.primary }}>
              {website}
            </a>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
