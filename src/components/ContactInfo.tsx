import React from 'react';
import { COLOR_SCHEMES } from '../config/customization';

interface ContactInfoProps {
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
  colorScheme?: string;
  light?: boolean;
}

const ContactInfo: React.FC<ContactInfoProps> = ({
  email,
  phone,
  location,
  linkedin,
  github,
  website,
  colorScheme = 'blue',
  light = false,
}) => {
  const colors = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES];
  const textColor = light ? 'text-white' : 'text-gray-700';
  const linkColor = light ? 'rgba(255, 255, 255, 0.9)' : colors.primary;

  // Build contact items array
  const contactItems: (string | React.ReactNode)[] = [
    email,
    phone,
    location,
  ];

  if (linkedin) {
    contactItems.push(
      <>
        <a 
          href={`https://${linkedin}`} 
          className="hover:opacity-80 print:hidden break-words" 
          style={{ color: linkColor }}
        >
          {linkedin}
        </a>
        <span className="hidden print:inline break-words">{linkedin}</span>
      </>
    );
  }

  if (github) {
    contactItems.push(
      <>
        <a 
          href={`https://${github}`} 
          className="hover:opacity-80 print:hidden break-words" 
          style={{ color: linkColor }}
        >
          {github}
        </a>
        <span className="hidden print:inline break-words">{github}</span>
      </>
    );
  }

  if (website) {
    contactItems.push(
      <>
        <a 
          href={`https://${website}`} 
          className="hover:opacity-80 print:hidden break-words" 
          style={{ color: linkColor }}
        >
          {website}
        </a>
        <span className="hidden print:inline break-words">{website}</span>
      </>
    );
  }

  return (
    <section className="mb-6 print:mb-4" data-sidebar-exempt="true">
      <h3
        className={`text-sm font-semibold mb-3 uppercase tracking-wide print:text-xs print:mb-2 ${light ? 'text-white' : ''}`}
        style={{ color: light ? 'white' : colors.primary }}
      >
        Contact
      </h3>
      <ul className={`sidebar-list text-xs print:text-[10px] ${textColor}`}>
        {contactItems.map((item, index) => (
          <li key={index} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ContactInfo;
