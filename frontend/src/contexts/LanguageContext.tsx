import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation keys
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.tickets': 'Tickets',
    'nav.machines': 'Machines',
    'nav.reports': 'Reports',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    
    // Authentication
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.email': 'Email',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.employeeID': 'Employee ID',
    'auth.department': 'Department',
    'auth.shift': 'Shift',
    'auth.currentPassword': 'Current Password',
    'auth.newPassword': 'New Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.changePassword': 'Change Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.rememberMe': 'Remember Me',
    'auth.loginSuccess': 'Login successful',
    'auth.logoutSuccess': 'Logout successful',
    'auth.registrationSuccess': 'Registration successful',
    'auth.passwordChangeSuccess': 'Password changed successfully',
    
    // User roles
    'role.l1_operator': 'L1 Operator',
    'role.l2_engineer': 'L2 Engineer',
    'role.l3_manager': 'L3 Manager',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.totalTickets': 'Total Tickets',
    'dashboard.openTickets': 'Open Tickets',
    'dashboard.closedTickets': 'Closed Tickets',
    'dashboard.recentActivity': 'Recent Activity',
    
    // Profile
    'profile.title': 'User Profile',
    'profile.personalInfo': 'Personal Information',
    'profile.workInfo': 'Work Information',
    'profile.lastLogin': 'Last Login',
    'profile.memberSince': 'Member Since',
    
    // Settings
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    
    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.auto': 'Auto',
    
    // Language
    'language.english': 'English',
    'language.thai': 'ไทย',
    
    // Errors
    'error.invalidCredentials': 'Invalid username or password',
    'error.userNotFound': 'User not found',
    'error.unauthorized': 'Unauthorized access',
    'error.forbidden': 'Access forbidden',
    'error.notFound': 'Page not found',
    'error.serverError': 'Internal server error',
    'error.networkError': 'Network error',
    'error.validationError': 'Validation error',
    
    // Validation
    'validation.required': 'This field is required',
    'validation.email': 'Please enter a valid email address',
    'validation.passwordLength': 'Password must be at least 6 characters long',
    'validation.passwordMatch': 'Passwords do not match',
    'validation.usernameLength': 'Username must be at least 3 characters long',
  },
  th: {
    // Common
    'common.loading': 'กำลังโหลด...',
    'common.error': 'ข้อผิดพลาด',
    'common.success': 'สำเร็จ',
    'common.cancel': 'ยกเลิก',
    'common.save': 'บันทึก',
    'common.edit': 'แก้ไข',
    'common.delete': 'ลบ',
    'common.confirm': 'ยืนยัน',
    'common.back': 'กลับ',
    'common.next': 'ถัดไป',
    'common.previous': 'ก่อนหน้า',
    
    // Navigation
    'nav.dashboard': 'แดชบอร์ด',
    'nav.tickets': 'ตั๋วงาน',
    'nav.machines': 'เครื่องจักร',
    'nav.reports': 'รายงาน',
    'nav.users': 'ผู้ใช้',
    'nav.settings': 'ตั้งค่า',
    
    // Authentication
    'auth.login': 'เข้าสู่ระบบ',
    'auth.logout': 'ออกจากระบบ',
    'auth.register': 'ลงทะเบียน',
    'auth.username': 'ชื่อผู้ใช้',
    'auth.password': 'รหัสผ่าน',
    'auth.email': 'อีเมล',
    'auth.firstName': 'ชื่อ',
    'auth.lastName': 'นามสกุล',
    'auth.employeeID': 'รหัสพนักงาน',
    'auth.department': 'แผนก',
    'auth.shift': 'กะ',
    'auth.currentPassword': 'รหัสผ่านปัจจุบัน',
    'auth.newPassword': 'รหัสผ่านใหม่',
    'auth.confirmPassword': 'ยืนยันรหัสผ่าน',
    'auth.changePassword': 'เปลี่ยนรหัสผ่าน',
    'auth.forgotPassword': 'ลืมรหัสผ่าน?',
    'auth.rememberMe': 'จดจำฉัน',
    'auth.loginSuccess': 'เข้าสู่ระบบสำเร็จ',
    'auth.logoutSuccess': 'ออกจากระบบสำเร็จ',
    'auth.registrationSuccess': 'ลงทะเบียนสำเร็จ',
    'auth.passwordChangeSuccess': 'เปลี่ยนรหัสผ่านสำเร็จ',
    
    // User roles
    'role.l1_operator': 'ผู้ปฏิบัติการ L1',
    'role.l2_engineer': 'วิศวกร L2',
    'role.l3_manager': 'ผู้จัดการ L3',
    
    // Dashboard
    'dashboard.welcome': 'ยินดีต้อนรับ',
    'dashboard.totalTickets': 'ตั๋วงานทั้งหมด',
    'dashboard.openTickets': 'ตั๋วงานที่เปิดอยู่',
    'dashboard.closedTickets': 'ตั๋วงานที่ปิดแล้ว',
    'dashboard.recentActivity': 'กิจกรรมล่าสุด',
    
    // Profile
    'profile.title': 'โปรไฟล์ผู้ใช้',
    'profile.personalInfo': 'ข้อมูลส่วนตัว',
    'profile.workInfo': 'ข้อมูลการทำงาน',
    'profile.lastLogin': 'เข้าสู่ระบบล่าสุด',
    'profile.memberSince': 'เป็นสมาชิกตั้งแต่',
    
    // Settings
    'settings.title': 'ตั้งค่า',
    'settings.appearance': 'ลักษณะ',
    'settings.language': 'ภาษา',
    'settings.notifications': 'การแจ้งเตือน',
    'settings.security': 'ความปลอดภัย',
    
    // Theme
    'theme.light': 'สว่าง',
    'theme.dark': 'มืด',
    'theme.auto': 'อัตโนมัติ',
    
    // Language
    'language.english': 'English',
    'language.thai': 'ไทย',
    
    // Errors
    'error.invalidCredentials': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'error.userNotFound': 'ไม่พบผู้ใช้',
    'error.unauthorized': 'การเข้าถึงไม่ได้รับอนุญาต',
    'error.forbidden': 'การเข้าถึงถูกห้าม',
    'error.notFound': 'ไม่พบหน้า',
    'error.serverError': 'ข้อผิดพลาดของเซิร์ฟเวอร์',
    'error.networkError': 'ข้อผิดพลาดเครือข่าย',
    'error.validationError': 'ข้อผิดพลาดการตรวจสอบ',
    
    // Validation
    'validation.required': 'กรุณากรอกข้อมูลในช่องนี้',
    'validation.email': 'กรุณากรอกอีเมลที่ถูกต้อง',
    'validation.passwordLength': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'validation.passwordMatch': 'รหัสผ่านไม่ตรงกัน',
    'validation.usernameLength': 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || 'en';
  });

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language);
    
    // Set document language
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
