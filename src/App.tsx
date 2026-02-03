import { useEffect, useState, useRef } from 'react';
import {
  ResumeData,
  TemplateType,
  ColorScheme,
  FontFamily,
  CustomSection,
  SectionPlacementConfig,
  PhotoShape,
  PhotoPosition,
  PhotoSize,
} from './types/resume';
import { FONTS, DEFAULT_SECTION_ORDER, DEFAULT_SIDEBAR_PLACEMENT } from './config/customization';
import CustomizationPanel from './components/CustomizationPanel';
import TemplateWrapper from './components/TemplateWrapper';
import PageOverflowWarning from './components/PageOverflowWarning';
import MultiPagePreview from './components/MultiPagePreview';
import { usePageOverflow } from './hooks/usePageOverflow';
import { useAutoFitToPage, binarySearchToFit } from './hooks/useAutoFitToPage';
import * as storage from './utils/storage';
import {
  PersistedSettings,
  CURRENT_SCHEMA_VERSION,
  validateAndMigrateSettings,
} from './utils/settingsSchema';
import * as profiles from './utils/profiles';
import ProfileManager from './components/ProfileManager';
import ShareableLinkModal from './components/ShareableLinkModal';
import TailorPanel from './components/TailorPanel';
import * as shareableLink from './utils/shareableLink';
import * as resumeStore from './utils/resumeStore';

function App() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResumeForUndo, setLastResumeForUndo] = useState<ResumeData | null>(null);

  // Customization state
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('blue');
  const [fontFamily, setFontFamily] = useState<FontFamily>('inter');
  const [photo, setPhoto] = useState<string | null>(null);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [sectionPlacement, setSectionPlacement] = useState<SectionPlacementConfig>(DEFAULT_SIDEBAR_PLACEMENT);
  const [globalFontSizeMultiplier, setGlobalFontSizeMultiplier] = useState<number>(1.0);
  const [photoShape, setPhotoShape] = useState<PhotoShape>('circle');
  const [photoPosition, setPhotoPosition] = useState<PhotoPosition>('center');
  const [photoSize, setPhotoSize] = useState<PhotoSize>('medium');

  // Print options
  const [autoFitEnabled, setAutoFitEnabled] = useState<boolean>(true);
  const [nonOrphanEnabled, setNonOrphanEnabled] = useState<boolean>(true);
  const [compressionFactor, setCompressionFactor] = useState<number>(0); // 0 = no compression, 1 = max compression

  // Preview options
  const [pagedPreviewEnabled, setPagedPreviewEnabled] = useState<boolean>(false);
  const [separatePagesEnabled, setSeparatePagesEnabled] = useState<boolean>(true);

  // Manual spacing multipliers
  const [mainSpacingMult, setMainSpacingMult] = useState<number>(1);
  const [sidebarSpacingMult, setSidebarSpacingMult] = useState<number>(1);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile management state
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [profilesMap, setProfilesMap] = useState<profiles.ProfilesMap>({});

  // Shareable link state
  const [isTemporarySettings, setIsTemporarySettings] = useState<boolean>(false);
  const [shareableLinkModal, setShareableLinkModal] = useState<{ isOpen: boolean; settings?: PersistedSettings }>({
    isOpen: false,
  });

  // Tailor CV state
  const [showTailor, setShowTailor] = useState<boolean>(false);

  // Ref for the resume container to detect overflow
  const resumeContainerRef = useRef<HTMLDivElement>(null);

  // Detect page overflow (disable when separate pages preview is on)
  const overflowState = usePageOverflow(resumeContainerRef, {
    enabled: !separatePagesEnabled,
    checkInterval: 500,
  });

  // Apply auto-fit and non-orphan breaks on print
  useAutoFitToPage(resumeContainerRef, {
    autoFitEnabled,
    nonOrphanEnabled,
    manualCompressionFactor: compressionFactor > 0 ? compressionFactor : undefined,
  });

  // Apply per-area spacing multipliers to CSS variables
  useEffect(() => {
    const el = resumeContainerRef.current;
    if (!el) return;
    el.style.setProperty('--main-spacing-mult', String(mainSpacingMult));
    el.style.setProperty('--sidebar-spacing-mult', String(sidebarSpacingMult));
  }, [mainSpacingMult, sidebarSpacingMult]);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    // Skip persistence during initial load (before resume data is loaded)
    if (loading || !activeProfileId) return;

    // Skip persistence when in temporary settings mode
    if (isTemporarySettings) return;

    const settings: PersistedSettings = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      template,
      colorScheme,
      fontFamily,
      sectionOrder,
      sectionPlacement,
      globalFontSizeMultiplier,
      photoShape,
      photoPosition,
      photoSize,
      photo,
      customSections,
      autoFitEnabled,
      nonOrphanEnabled,
      compressionFactor,
      pagedPreviewEnabled,
      separatePagesEnabled,
      mainSpacingMult,
      sidebarSpacingMult,
    };

    // Update active profile with new settings
    profiles.updateProfile(activeProfileId, settings);
    
    // Refresh profiles map
    setProfilesMap(profiles.getProfiles());
  }, [
    loading,
    activeProfileId,
    isTemporarySettings,
    template,
    colorScheme,
    fontFamily,
    sectionOrder,
    sectionPlacement,
    globalFontSizeMultiplier,
    photoShape,
    photoPosition,
    photoSize,
    photo,
    customSections,
    autoFitEnabled,
    nonOrphanEnabled,
    compressionFactor,
    pagedPreviewEnabled,
    separatePagesEnabled,
    mainSpacingMult,
    sidebarSpacingMult,
  ]);

  useEffect(() => {
    // Initialize profiles system
    const activeProfile = profiles.initializeProfiles();
    setActiveProfileId(activeProfile.id);
    setProfilesMap(profiles.getProfiles());

    // Check for resume override in localStorage
    const resumeOverride = resumeStore.getOverride();
    
    const loadResumeData = (data: ResumeData) => {
      setResumeData(data);

      // Load customization from data if available
      if (data.customization) {
        if (data.customization.template) setTemplate(data.customization.template);
        if (data.customization.colorScheme) setColorScheme(data.customization.colorScheme);
        if (data.customization.fontFamily) setFontFamily(data.customization.fontFamily);
        if (data.customization.sectionOrder) setSectionOrder(data.customization.sectionOrder);
        if (data.customization.sectionPlacement) setSectionPlacement(data.customization.sectionPlacement);
        if (data.customization.photoShape) setPhotoShape(data.customization.photoShape);
        if (data.customization.photoPosition) setPhotoPosition(data.customization.photoPosition);
        if (data.customization.photoSize) setPhotoSize(data.customization.photoSize);
      }
      if (data.header.photo) setPhoto(data.header.photo);
      if (data.customSections) {
        setCustomSections(data.customSections);
        // Add custom sections to section order if not already present
        if (!data.customization?.sectionOrder) {
          const customSectionIds = data.customSections.map((s: CustomSection) => `custom-${s.id}`);
          setSectionOrder([...DEFAULT_SECTION_ORDER, ...customSectionIds]);
          // Default custom sections to main content area
          const customPlacement: SectionPlacementConfig = {};
          customSectionIds.forEach((id: string) => {
            customPlacement[id] = 'main';
          });
          setSectionPlacement({ ...DEFAULT_SIDEBAR_PLACEMENT, ...customPlacement });
        }
      }

      // Load active profile settings (overrides resume.json)
      const savedSettings = activeProfile.data.settings;
      if (savedSettings) {
        if (savedSettings.template !== undefined) setTemplate(savedSettings.template);
        if (savedSettings.colorScheme !== undefined) setColorScheme(savedSettings.colorScheme);
        if (savedSettings.fontFamily !== undefined) setFontFamily(savedSettings.fontFamily);
        if (savedSettings.sectionOrder !== undefined) setSectionOrder(savedSettings.sectionOrder);
        if (savedSettings.sectionPlacement !== undefined) setSectionPlacement(savedSettings.sectionPlacement);
        if (savedSettings.globalFontSizeMultiplier !== undefined) setGlobalFontSizeMultiplier(savedSettings.globalFontSizeMultiplier);
        if (savedSettings.photoShape !== undefined) setPhotoShape(savedSettings.photoShape);
        if (savedSettings.photoPosition !== undefined) setPhotoPosition(savedSettings.photoPosition);
        if (savedSettings.photoSize !== undefined) setPhotoSize(savedSettings.photoSize);
        if (savedSettings.photo !== undefined) setPhoto(savedSettings.photo);
        if (savedSettings.customSections !== undefined) setCustomSections(savedSettings.customSections);
        if (savedSettings.autoFitEnabled !== undefined) setAutoFitEnabled(savedSettings.autoFitEnabled);
        if (savedSettings.nonOrphanEnabled !== undefined) setNonOrphanEnabled(savedSettings.nonOrphanEnabled);
        if (savedSettings.compressionFactor !== undefined) setCompressionFactor(savedSettings.compressionFactor);
        if (savedSettings.pagedPreviewEnabled !== undefined) setPagedPreviewEnabled(savedSettings.pagedPreviewEnabled);
        if (savedSettings.separatePagesEnabled !== undefined) setSeparatePagesEnabled(savedSettings.separatePagesEnabled);
        if (savedSettings.mainSpacingMult !== undefined) setMainSpacingMult(savedSettings.mainSpacingMult);
        if (savedSettings.sidebarSpacingMult !== undefined) setSidebarSpacingMult(savedSettings.sidebarSpacingMult);
      }

      setLoading(false);

      // Check for settings in URL hash
      const hashSettings = shareableLink.parseSettingsFromHash();
      if (hashSettings && hashSettings.valid && hashSettings.settings) {
        // Show the modal to let user decide what to do
        setShareableLinkModal({
          isOpen: true,
          settings: hashSettings.settings,
        });
      } else if (hashSettings && !hashSettings.valid) {
        // Invalid settings in hash
        showToast(hashSettings.error || 'Invalid settings in link', 'error');
        shareableLink.clearSettingsHash();
      }
    };

    if (resumeOverride) {
      // Use override from localStorage
      loadResumeData(resumeOverride);
    } else {
      // Fetch from public/resume.json
      fetch('/resume.json')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load resume data');
          return res.json();
        })
        .then((data) => {
          loadResumeData(data);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, []);

  // Load selected font
  useEffect(() => {
    const fontConfig = FONTS[fontFamily];
    const linkId = 'custom-font-link';
    let link = document.getElementById(linkId) as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    link.href = fontConfig.googleFontUrl;
  }, [fontFamily]);

  const handleAddCustomSection = (section: CustomSection) => {
    setCustomSections([...customSections, section]);
    const sectionId = `custom-${section.id}`;
    setSectionOrder([...sectionOrder, sectionId]);
    // Default custom sections to main content area
    setSectionPlacement({ ...sectionPlacement, [sectionId]: 'main' });
  };

  const handleRemoveCustomSection = (id: string) => {
    setCustomSections(customSections.filter(s => s.id !== id));
    const sectionId = `custom-${id}`;
    setSectionOrder(sectionOrder.filter(s => s !== sectionId));
    // Remove from section placement
    const newPlacement = { ...sectionPlacement };
    delete newPlacement[sectionId];
    setSectionPlacement(newPlacement);
  };

  // Compression control handlers
  const handleCompress = () => {
    setCompressionFactor(prev => Math.min(1, prev + 0.05));
  };

  const handleDecompress = () => {
    setCompressionFactor(prev => Math.max(0, prev - 0.05));
  };

  const handleReset = () => {
    setCompressionFactor(0);
  };

  const handleFitToOnePage = () => {
    const container = resumeContainerRef.current;
    if (!container) return;

    // Get page height
    const maxHeight = container.clientHeight || container.offsetHeight || 1123; // A4 at 96dpi

    // Use binary search to find optimal compression
    const optimalC = binarySearchToFit(container, maxHeight, 0.70, 0.95, 0.90);
    setCompressionFactor(optimalC);
  };

  const handleResetAll = () => {
    const confirmed = window.confirm(
      'This will reset the current profile to default settings. Are you sure?'
    );
    if (confirmed) {
      const defaultSettings = profiles.getDefaultSettings();
      profiles.updateProfile(activeProfileId, defaultSettings);
      
      // Reload to apply default settings
      window.location.reload();
    }
  };

  // Profile management handlers
  const handleProfileChange = (profileId: string) => {
    const profile = profiles.getProfile(profileId);
    if (!profile) {
      showToast('Profile not found', 'error');
      return;
    }

    // Set as active
    profiles.setActiveProfileId(profileId);
    setActiveProfileId(profileId);

    // Clear temporary settings flag
    setIsTemporarySettings(false);

    // Apply profile settings
    const settings = profile.settings;
    if (settings.template !== undefined) setTemplate(settings.template);
    if (settings.colorScheme !== undefined) setColorScheme(settings.colorScheme);
    if (settings.fontFamily !== undefined) setFontFamily(settings.fontFamily);
    if (settings.sectionOrder !== undefined) setSectionOrder(settings.sectionOrder);
    if (settings.sectionPlacement !== undefined) setSectionPlacement(settings.sectionPlacement);
    if (settings.globalFontSizeMultiplier !== undefined) setGlobalFontSizeMultiplier(settings.globalFontSizeMultiplier);
    if (settings.photoShape !== undefined) setPhotoShape(settings.photoShape);
    if (settings.photoPosition !== undefined) setPhotoPosition(settings.photoPosition);
    if (settings.photoSize !== undefined) setPhotoSize(settings.photoSize);
    if (settings.photo !== undefined) setPhoto(settings.photo);
    if (settings.customSections !== undefined) setCustomSections(settings.customSections);
    if (settings.autoFitEnabled !== undefined) setAutoFitEnabled(settings.autoFitEnabled);
    if (settings.nonOrphanEnabled !== undefined) setNonOrphanEnabled(settings.nonOrphanEnabled);
    if (settings.compressionFactor !== undefined) setCompressionFactor(settings.compressionFactor);
    if (settings.pagedPreviewEnabled !== undefined) setPagedPreviewEnabled(settings.pagedPreviewEnabled);
    if (settings.separatePagesEnabled !== undefined) setSeparatePagesEnabled(settings.separatePagesEnabled);
    if (settings.mainSpacingMult !== undefined) setMainSpacingMult(settings.mainSpacingMult);
    if (settings.sidebarSpacingMult !== undefined) setSidebarSpacingMult(settings.sidebarSpacingMult);

    // Refresh profiles map
    setProfilesMap(profiles.getProfiles());
    showToast(`Switched to profile: ${profile.name}`, 'success');
  };

  const handleCreateProfile = (name: string) => {
    // Create new profile with default settings
    const defaultSettings = profiles.getDefaultSettings();
    const newProfileId = profiles.createProfile(name, defaultSettings);

    // Switch to the new profile
    handleProfileChange(newProfileId);
    showToast(`Profile "${name}" created`, 'success');
  };

  const handleRenameProfile = (profileId: string, newName: string) => {
    const success = profiles.renameProfile(profileId, newName);
    if (success) {
      setProfilesMap(profiles.getProfiles());
      showToast('Profile renamed', 'success');
    } else {
      showToast('Failed to rename profile', 'error');
    }
  };

  const handleDuplicateProfile = (profileId: string) => {
    const newProfileId = profiles.duplicateProfile(profileId);
    if (newProfileId) {
      setProfilesMap(profiles.getProfiles());
      showToast('Profile duplicated', 'success');
    } else {
      showToast('Failed to duplicate profile', 'error');
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    const success = profiles.deleteProfile(profileId);
    if (success) {
      // Get the new active profile after deletion
      const newActiveId = profiles.getActiveProfileId();
      if (newActiveId && newActiveId !== activeProfileId) {
        handleProfileChange(newActiveId);
      }
      setProfilesMap(profiles.getProfiles());
      showToast('Profile deleted', 'success');
    } else {
      showToast('Failed to delete profile', 'error');
    }
  };

  const handleExportSettings = () => {
    try {
      const settings: PersistedSettings = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        template,
        colorScheme,
        fontFamily,
        sectionOrder,
        sectionPlacement,
        globalFontSizeMultiplier,
        photoShape,
        photoPosition,
        photoSize,
        photo,
        customSections,
        autoFitEnabled,
        nonOrphanEnabled,
        compressionFactor,
        pagedPreviewEnabled,
        separatePagesEnabled,
        mainSpacingMult,
        sidebarSpacingMult,
      };
      storage.exportSettings(settings);
      showToast('Settings exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export settings. Please try again.', 'error');
    }
  };

  const handleImportSettings = async () => {
    try {
      const data = await storage.importSettings();
      const validation = validateAndMigrateSettings(data);

      if (!validation.valid) {
        showToast(validation.error || 'Invalid settings file', 'error');
        return;
      }

      // Ask user if they want to replace current profile or create a new one
      const choice = window.confirm(
        'Click OK to replace the current profile, or Cancel to import as a new profile.'
      );

      const settings = validation.settings!;

      if (choice) {
        // Replace current profile
        profiles.updateProfile(activeProfileId, settings);
        
        // Apply all settings
        if (settings.template !== undefined) setTemplate(settings.template);
        if (settings.colorScheme !== undefined) setColorScheme(settings.colorScheme);
        if (settings.fontFamily !== undefined) setFontFamily(settings.fontFamily);
        if (settings.sectionOrder !== undefined) setSectionOrder(settings.sectionOrder);
        if (settings.sectionPlacement !== undefined) setSectionPlacement(settings.sectionPlacement);
        if (settings.globalFontSizeMultiplier !== undefined) setGlobalFontSizeMultiplier(settings.globalFontSizeMultiplier);
        if (settings.photoShape !== undefined) setPhotoShape(settings.photoShape);
        if (settings.photoPosition !== undefined) setPhotoPosition(settings.photoPosition);
        if (settings.photoSize !== undefined) setPhotoSize(settings.photoSize);
        if (settings.photo !== undefined) setPhoto(settings.photo);
        if (settings.customSections !== undefined) setCustomSections(settings.customSections);
        if (settings.autoFitEnabled !== undefined) setAutoFitEnabled(settings.autoFitEnabled);
        if (settings.nonOrphanEnabled !== undefined) setNonOrphanEnabled(settings.nonOrphanEnabled);
        if (settings.compressionFactor !== undefined) setCompressionFactor(settings.compressionFactor);
        if (settings.pagedPreviewEnabled !== undefined) setPagedPreviewEnabled(settings.pagedPreviewEnabled);
        if (settings.separatePagesEnabled !== undefined) setSeparatePagesEnabled(settings.separatePagesEnabled);
        if (settings.mainSpacingMult !== undefined) setMainSpacingMult(settings.mainSpacingMult);
        if (settings.sidebarSpacingMult !== undefined) setSidebarSpacingMult(settings.sidebarSpacingMult);

        setProfilesMap(profiles.getProfiles());
        showToast('Settings imported and applied to current profile!', 'success');
      } else {
        // Import as new profile
        const profileName = window.prompt('Enter a name for the new profile:', 'Imported Profile');
        if (!profileName) {
          return; // User cancelled
        }

        const newProfileId = profiles.createProfile(profileName, settings);
        handleProfileChange(newProfileId);
        showToast(`Settings imported as new profile "${profileName}"!`, 'success');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'File selection cancelled') {
        // User cancelled, don't show error
        return;
      }
      showToast('Failed to import settings. Please check the file and try again.', 'error');
    }
  };

  const handleExportResume = () => {
    if (!resumeData) {
      showToast('No resume data to export', 'error');
      return;
    }

    try {
      storage.exportJsonFile('resume.json', resumeData);
      showToast('Resume exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export resume. Please try again.', 'error');
    }
  };

  const handleImportResume = async () => {
    try {
      const data = await storage.importJsonFile();
      
      // Validate that the data looks like a resume
      if (!resumeStore.isValidResumeLike(data)) {
        showToast('Invalid resume file. Please check that it has header, experience, or skills sections.', 'error');
        return;
      }

      // Save previous resume for undo
      if (resumeData) {
        setLastResumeForUndo(resumeData);
      }

      // Update state with imported resume
      setResumeData(data);

      // Persist to localStorage
      const success = resumeStore.setOverride(data);
      if (!success) {
        showToast('Resume imported but failed to persist (localStorage may be full). Changes will be lost on reload.', 'error');
      } else {
        showToast('Resume imported successfully!', 'success');
      }

      // Update photo and custom sections if present in imported data
      if (data.header?.photo) {
        setPhoto(data.header.photo);
      }
      if (data.customSections) {
        setCustomSections(data.customSections);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'File selection cancelled') {
        // User cancelled, don't show error
        return;
      }
      showToast('Failed to import resume. Please check the file and try again.', 'error');
    }
  };

  const handleClearResumeOverride = () => {
    const confirmed = window.confirm(
      'This will clear the resume override and revert to the bundled resume.json. Your customization settings will be kept. Are you sure?'
    );
    
    if (!confirmed) {
      return;
    }

    // Clear override from localStorage
    resumeStore.clearOverride();

    // Reload from public/resume.json
    fetch('/resume.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load resume data');
        return res.json();
      })
      .then((data) => {
        setResumeData(data);
        
        // Update photo and custom sections from loaded data
        if (data.header?.photo) {
          setPhoto(data.header.photo);
        }
        if (data.customSections) {
          setCustomSections(data.customSections);
        }
        
        showToast('Resume override cleared. Using bundled resume.json', 'success');
      })
      .catch((err) => {
        showToast(`Failed to load resume.json: ${err.message}`, 'error');
      });
  };

  const handleUndoResumeChange = () => {
    if (!lastResumeForUndo) {
      showToast('No changes to undo', 'error');
      return;
    }

    // Restore previous resume
    setResumeData(lastResumeForUndo);
    
    // Update localStorage
    resumeStore.setOverride(lastResumeForUndo);
    
    // Clear undo state
    setLastResumeForUndo(null);
    
    showToast('Resume changes undone', 'success');
  };

  const handleApplyTailoredResume = (updatedResume: ResumeData, notes?: string) => {
    // Save current resume for undo
    if (resumeData) {
      setLastResumeForUndo(resumeData);
    }

    // Update state
    setResumeData(updatedResume);

    // Persist to localStorage
    const success = resumeStore.setOverride(updatedResume);
    
    // Update photo and custom sections if present
    if (updatedResume.header?.photo) {
      setPhoto(updatedResume.header.photo);
    }
    if (updatedResume.customSections) {
      setCustomSections(updatedResume.customSections);
    }

    // Show toast with notes if provided
    let message = 'Applied to current CV';
    if (notes) {
      message += `. Note: ${notes}`;
    }
    
    if (!success) {
      showToast(`${message} (failed to persist - changes may be lost on reload)`, 'error');
    } else {
      showToast(message, 'success');
    }
  };

  const handleCopyShareableLink = async () => {
    try {
      const settings: PersistedSettings = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        template,
        colorScheme,
        fontFamily,
        sectionOrder,
        sectionPlacement,
        globalFontSizeMultiplier,
        photoShape,
        photoPosition,
        photoSize,
        photo,
        customSections,
        autoFitEnabled,
        nonOrphanEnabled,
        compressionFactor,
        pagedPreviewEnabled,
        separatePagesEnabled,
        mainSpacingMult,
        sidebarSpacingMult,
      };

      const result = shareableLink.generateShareableUrl(settings);

      if (result.tooLarge) {
        showToast(
          `Settings are too large (${Math.round(result.size / 1024)} KB). Please use file export instead.`,
          'error'
        );
        return;
      }

      if (result.shouldWarn) {
        const confirmed = window.confirm(
          `The shareable link is large (${Math.round(result.size / 1024)} KB). It may not work in all browsers. Continue anyway?`
        );
        if (!confirmed) {
          return;
        }
      }

      await shareableLink.copyToClipboard(result.url);
      showToast('Shareable link copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to copy shareable link. Please try again.', 'error');
    }
  };

  const handleShareableLinkApplyTemporarily = () => {
    if (!shareableLinkModal.settings) return;

    const settings = shareableLinkModal.settings;

    // Apply settings temporarily without saving to profile
    if (settings.template !== undefined) setTemplate(settings.template);
    if (settings.colorScheme !== undefined) setColorScheme(settings.colorScheme);
    if (settings.fontFamily !== undefined) setFontFamily(settings.fontFamily);
    if (settings.sectionOrder !== undefined) setSectionOrder(settings.sectionOrder);
    if (settings.sectionPlacement !== undefined) setSectionPlacement(settings.sectionPlacement);
    if (settings.globalFontSizeMultiplier !== undefined) setGlobalFontSizeMultiplier(settings.globalFontSizeMultiplier);
    if (settings.photoShape !== undefined) setPhotoShape(settings.photoShape);
    if (settings.photoPosition !== undefined) setPhotoPosition(settings.photoPosition);
    if (settings.photoSize !== undefined) setPhotoSize(settings.photoSize);
    if (settings.photo !== undefined) setPhoto(settings.photo);
    if (settings.customSections !== undefined) setCustomSections(settings.customSections);
    if (settings.autoFitEnabled !== undefined) setAutoFitEnabled(settings.autoFitEnabled);
    if (settings.nonOrphanEnabled !== undefined) setNonOrphanEnabled(settings.nonOrphanEnabled);
    if (settings.compressionFactor !== undefined) setCompressionFactor(settings.compressionFactor);
    if (settings.pagedPreviewEnabled !== undefined) setPagedPreviewEnabled(settings.pagedPreviewEnabled);
    if (settings.separatePagesEnabled !== undefined) setSeparatePagesEnabled(settings.separatePagesEnabled);
    if (settings.mainSpacingMult !== undefined) setMainSpacingMult(settings.mainSpacingMult);
    if (settings.sidebarSpacingMult !== undefined) setSidebarSpacingMult(settings.sidebarSpacingMult);

    // Mark as temporary
    setIsTemporarySettings(true);

    // Close modal and clear hash
    setShareableLinkModal({ isOpen: false });
    shareableLink.clearSettingsHash();

    showToast('Settings applied temporarily. They will not be saved to your profile.', 'success');
  };

  const handleShareableLinkSaveAsNewProfile = (name: string) => {
    if (!shareableLinkModal.settings) return;

    const newProfileId = profiles.createProfile(name, shareableLinkModal.settings);
    
    // Switch to the new profile (this will apply the settings)
    handleProfileChange(newProfileId);

    // Close modal and clear hash
    setShareableLinkModal({ isOpen: false });
    shareableLink.clearSettingsHash();

    showToast(`Settings saved as new profile "${name}"!`, 'success');
  };

  const handleShareableLinkCancel = () => {
    setShareableLinkModal({ isOpen: false });
    shareableLink.clearSettingsHash();
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading résumé...</div>
      </div>
    );
  }

  if (error || !resumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error || 'Failed to load résumé data'}</div>
      </div>
    );
  }

  // Merge photo and custom sections into resume data
  const enhancedResumeData = {
    ...resumeData,
    header: { ...resumeData.header, photo: photo || undefined },
    customSections,
  };

  const resumeInner = (
    <TemplateWrapper
      resumeData={enhancedResumeData}
      template={template}
      colorScheme={colorScheme}
      fontFamily={FONTS[fontFamily].family}
      sectionOrder={sectionOrder}
      sectionPlacement={sectionPlacement}
      globalFontSizeMultiplier={globalFontSizeMultiplier}
      photoShape={photoShape}
      photoPosition={photoPosition}
      photoSize={photoSize}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:py-0 print:bg-white">
      {/* Shareable Link Modal */}
      <ShareableLinkModal
        isOpen={shareableLinkModal.isOpen}
        onApplyTemporarily={handleShareableLinkApplyTemporarily}
        onSaveAsNewProfile={handleShareableLinkSaveAsNewProfile}
        onCancel={handleShareableLinkCancel}
      />

      {/* Tailor CV Panel */}
      <TailorPanel
        isOpen={showTailor}
        onClose={() => setShowTailor(false)}
        resumeData={resumeData}
        onApplyTailoredResume={handleApplyTailoredResume}
      />

      {/* Temporary Settings Banner */}
      {isTemporarySettings && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 text-center z-40 print:hidden">
          <span className="font-medium">⚠️ Temporary Settings Active</span>
          <span className="ml-2 text-sm">
            Changes will not be saved to your profile. Switch profiles or save as a new profile to persist changes.
          </span>
          <button
            onClick={() => setIsTemporarySettings(false)}
            className="ml-4 px-3 py-1 bg-white text-amber-600 rounded hover:bg-amber-50 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Overflow Warning overlay */}
      <PageOverflowWarning
        isOverflowing={!separatePagesEnabled && overflowState.isOverflowing}
        overflowPercentage={overflowState.overflowPercentage}
        contentHeight={overflowState.contentHeight}
        maxHeight={overflowState.maxHeight}
      />

      {/* A4 Aspect Ratio Container */}
      <div
        id="resume"
        ref={resumeContainerRef}
        className={`mx-auto print:mx-0 ${pagedPreviewEnabled && !separatePagesEnabled ? 'paged-preview' : ''}`}
        style={{
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          background: '#fff',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {separatePagesEnabled ? (
          <MultiPagePreview>
            <div data-preview-source>
              {resumeInner}
            </div>
          </MultiPagePreview>
        ) : (
          resumeInner
        )}
      </div>

      {/* Actions and disclaimer (screen only) */}
      <div className="text-center mt-4 print:hidden">
        {/* Compression controls */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="text-sm font-semibold text-gray-700 mb-1">
            Compression: {Math.round(compressionFactor * 100)}%
          </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleDecompress}
              disabled={compressionFactor === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reduce compression by 5%"
            >
              Decompress
            </button>
            <button
              onClick={handleCompress}
              disabled={compressionFactor === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Increase compression by 5%"
            >
              Compress
            </button>
            <button
              onClick={handleFitToOnePage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Automatically find minimal compression to fit one page"
            >
              Fit to One Page
            </button>
            <button
              onClick={handleReset}
              disabled={compressionFactor === 0}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset to no compression"
            >
              Reset
            </button>
          </div>

          {/* Per-area spacing controls */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-700">Main spacing</span>
              <button
                onClick={() => setMainSpacingMult(v => Math.max(0.6, +(v - 0.02).toFixed(2)))}
                className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-100"
                title="Decrease main column spacing"
              >
                −
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">{(mainSpacingMult).toFixed(2)}x</span>
              <button
                onClick={() => setMainSpacingMult(v => Math.min(2.0, +(v + 0.02).toFixed(2)))}
                className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-100"
                title="Increase main column spacing"
              >
                +
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-700">Sidebar spacing</span>
              <button
                onClick={() => setSidebarSpacingMult(v => Math.max(0.6, +(v - 0.02).toFixed(2)))}
                className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-100"
                title="Decrease sidebar spacing"
              >
                −
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">{(sidebarSpacingMult).toFixed(2)}x</span>
              <button
                onClick={() => setSidebarSpacingMult(v => Math.min(2.0, +(v + 0.02).toFixed(2)))}
                className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-100"
                title="Increase sidebar spacing"
              >
                +
              </button>
            </div>
          </div>

          {compressionFactor > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Compression applied: spacing, line-height, and font size adjusted
            </p>
          )}
        </div>

        {/* Print options */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoFitEnabled}
              onChange={(e) => setAutoFitEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>Auto-fit to a single A4 page when possible</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={nonOrphanEnabled}
              onChange={(e) => setNonOrphanEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>Keep sections intact (no orphan headings)</span>
          </label>
        </div>

        {/* Profile Manager */}
        <ProfileManager
          profiles={profilesMap}
          activeProfileId={activeProfileId}
          onProfileChange={handleProfileChange}
          onCreateProfile={handleCreateProfile}
          onRenameProfile={handleRenameProfile}
          onDuplicateProfile={handleDuplicateProfile}
          onDeleteProfile={handleDeleteProfile}
        />

        {/* Preview options */}
        <div className="mb-4 flex flex-col items-center gap-2 border-t pt-4">
          <div className="text-sm font-semibold text-gray-700 mb-1">Preview Options</div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={pagedPreviewEnabled}
              onChange={(e) => setPagedPreviewEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>Paged preview (page boundaries on a long scroll)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={separatePagesEnabled}
              onChange={(e) => setSeparatePagesEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>Separate pages preview (discrete A4 pages with gaps)</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print / Save as PDF
          </button>
          <button
            onClick={handleExportSettings}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Export current settings as JSON file"
          >
            Export Settings
          </button>
          <button
            onClick={handleImportSettings}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title="Import settings from JSON file"
          >
            Import Settings
          </button>
          <button
            onClick={handleCopyShareableLink}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            title="Copy a shareable link with current settings"
          >
            Copy Shareable Link
          </button>
          <button
            onClick={() => setShowTailor(true)}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            title="Tailor your CV to a job description"
          >
            Tailor CV
          </button>
          <button
            onClick={handleExportResume}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            title="Export current resume as JSON file"
          >
            Export Resume
          </button>
          <button
            onClick={handleImportResume}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
            title="Import resume from JSON file"
          >
            Import Resume
          </button>
          <button
            onClick={handleClearResumeOverride}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            title="Clear resume override and revert to bundled resume.json"
          >
            Clear Resume Override
          </button>
          {lastResumeForUndo && (
            <button
              onClick={handleUndoResumeChange}
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              title="Undo last resume change"
            >
              Undo Resume Change
            </button>
          )}
          <button
            onClick={handleResetAll}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Reset current profile to default settings"
          >
            Reset Current Profile
          </button>
        </div>

        {/* Import Settings clarification */}
        <div className="text-xs text-gray-600 mt-2 text-center">
          <strong>Note:</strong> "Import Settings" imports customization only (template, colors, fonts, etc.), not resume content. Use "Import Resume" to replace your resume data.
        </div>

        {/* Toast notification */}
        {toast && (
          <div
            className={`mt-4 px-6 py-3 rounded-lg text-white text-center font-medium ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
            role="alert"
          >
            {toast.message}
          </div>
        )}

        {!separatePagesEnabled && overflowState.isOverflowing && (
          <p className="mt-2 text-sm text-amber-700">
            Note: Your résumé exceeds one A4 page.
            {autoFitEnabled
              ? ' Auto-fit will attempt to shrink content to fit when printing.'
              : ' The PDF will span multiple pages. Enable auto-fit if you prefer a single page.'}
          </p>
        )}
      </div>

      <CustomizationPanel
        template={template}
        colorScheme={colorScheme}
        fontFamily={fontFamily}
        photo={photo}
        customSections={customSections}
        sectionOrder={sectionOrder}
        sectionPlacement={sectionPlacement}
        globalFontSizeMultiplier={globalFontSizeMultiplier}
        photoShape={photoShape}
        photoPosition={photoPosition}
        photoSize={photoSize}
        onTemplateChange={setTemplate}
        onColorSchemeChange={setColorScheme}
        onFontFamilyChange={setFontFamily}
        onPhotoChange={setPhoto}
        onAddCustomSection={handleAddCustomSection}
        onRemoveCustomSection={handleRemoveCustomSection}
        onReorderSections={setSectionOrder}
        onSectionPlacementChange={setSectionPlacement}
        onGlobalFontSizeChange={setGlobalFontSizeMultiplier}
        onPhotoShapeChange={setPhotoShape}
        onPhotoPositionChange={setPhotoPosition}
        onPhotoSizeChange={setPhotoSize}
      />
    </div>
  );
}

export default App;
