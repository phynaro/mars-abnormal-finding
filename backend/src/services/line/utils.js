const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=1200&q=60';

function safeText(value, fallback = 'ไม่ระบุ') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? fallback : trimmed;
  }
  return String(value);
}

function getStatusColor(status) {
  const statusColors = {
    open: '#1E7D33',
    assigned: '#FFA500',
    in_progress: '#0066CC',
    completed: '#28A745',
    closed: '#6C757D',
    rejected_final: '#DC3545',
    rejected_pending_l3_review: '#FFC107',
    escalated: '#E83E8C',
    reopened_in_progress: '#17A2B8',
  };

  return statusColors[status] || '#6C757D';
}

function getPriorityColor(priority) {
  const priorityColors = {
    low: '#28A745',
    normal: '#FFA500',
    high: '#FF6B35',
    urgent: '#DC3545',
    critical: '#8B0000',
  };

  return priorityColors[priority] || '#FFA500';
}

function getNotificationTitle(messageType) {
  if (!messageType) {
    return 'Notification';
  }

  const titles = {
    created: 'Created',
    assigned: 'Assigned',
    status_update: 'Status Updated',
    accepted: 'Accepted',
    rejected: 'Rejected',
    completed: 'Completed',
    escalated: 'Escalated',
    closed: 'Closed',
    reopened: 'Reopened',
    reassigned: 'Reassigned',
  };

  return titles[messageType] || 'Notification';
}

function getNotificationSubtitle(messageType) {
  if (!messageType) {
    return 'การแจ้งเตือนจากระบบ CMMS';
  }

  const subtitles = {
    created: 'มีการแจ้ง Abnormal Finding ใหม่',
    assigned: 'มีการมอบหมายใบงานใหม่',
    status_update: 'สถานะใบงานได้รับการอัปเดต',
    accepted: 'ใบงานได้รับการยอมรับและเริ่มดำเนินการ',
    rejected: 'ใบงานถูกปฏิเสธ',
    completed: 'งานซ่อมบำรุงเสร็จสิ้น',
    escalated: 'ใบงานถูกส่งต่อให้ผู้จัดการระดับสูง',
    closed: 'ใบงานถูกปิด',
    reopened: 'ใบงานถูกเปิดใหม่',
    reassigned: 'ใบงานถูกมอบหมายใหม่',
  };

  return subtitles[messageType] || 'การแจ้งเตือนจากระบบ Abnormal Finding';
}

function getStatusText(status) {
  if (!status) {
    return 'ไม่ระบุ';
  }

  const statusTexts = {
    open: 'เปิด',
    assigned: 'มอบหมายแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    closed: 'ปิด',
    rejected_final: 'ปฏิเสธ',
    rejected_pending_l3_review: 'รอ L3 ตรวจสอบ',
    escalated: 'ส่งต่อ',
    reopened_in_progress: 'เปิดใหม่',
  };

  return statusTexts[status] || status || 'ไม่ระบุ';
}

function getPriorityText(priority) {
  if (!priority) {
    return 'ไม่ระบุ';
  }

  const priorityTexts = {
    low: 'ต่ำ',
    normal: 'ปกติ',
    high: 'สูง',
    urgent: 'ด่วน',
    critical: 'วิกฤต',
  };

  return priorityTexts[priority] || priority || 'ไม่ระบุ';
}

function isImageAccessible(url) {
  if (!url) {
    return false;
  }

  const lowerUrl = url.toLowerCase();
  const localPatterns = [
    'localhost',
    '127.0.0.1',
    '192.168.',
    '10.',
    '172.',
    '::1',
    'fe80:',
    'fc00:',
    'fd00:',
  ];

  return !localPatterns.some((pattern) => lowerUrl.includes(pattern));
}

function getAccessibleImages(images, allowLocalImages = false) {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  if (allowLocalImages) {
    return images;
  }

  return images.filter((img) => isImageAccessible(img.url));
}

function buildImageMessages(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  return images.map((img) => ({
    type: 'image',
    originalContentUrl: img.url,
    previewImageUrl: img.url,
  }));
}

function selectHeroImage(images, options = {}) {
  const {
    allowLocalImages = false,
    backendUrl = process.env.BACKEND_URL,
    frontendUrl = process.env.FRONTEND_URL,
    fallbackUrl = DEFAULT_HERO_IMAGE,
  } = options;

  const accessibleImages = getAccessibleImages(images, allowLocalImages);

  if (accessibleImages.length === 0) {
    return fallbackUrl;
  }

  const imageUrl = accessibleImages[0].url;

  if (typeof imageUrl === 'string' && imageUrl.startsWith('/')) {
    const base = backendUrl || frontendUrl || 'http://localhost:3001';
    return `${base}${imageUrl}`;
  }

  return imageUrl || fallbackUrl;
}

function debugImageAccessibility(images, options = {}) {
  const {
    allowLocalImages = false,
    imageHostingService = 'none',
  } = options;

  if (!Array.isArray(images) || images.length === 0) {
    return { total: 0, accessible: 0, local: 0, details: [] };
  }

  const details = images.map((img) => {
    const accessible = isImageAccessible(img.url);

    return {
      url: img.url,
      filename: img.filename,
      accessible,
      reason: accessible ? 'Public URL' : 'Local/Private URL',
    };
  });

  const accessible = details.filter((detail) => detail.accessible).length;
  const local = details.filter((detail) => !detail.accessible).length;

  return {
    total: images.length,
    accessible,
    local,
    details,
    config: {
      allowLocalImages,
      imageHostingService,
    },
  };
}

module.exports = {
  DEFAULT_HERO_IMAGE,
  safeText,
  getStatusColor,
  getPriorityColor,
  getNotificationTitle,
  getNotificationSubtitle,
  getStatusText,
  getPriorityText,
  isImageAccessible,
  getAccessibleImages,
  buildImageMessages,
  selectHeroImage,
  debugImageAccessibility,
};
