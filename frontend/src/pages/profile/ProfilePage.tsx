import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import type { FileUploadRef } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Cropper from 'react-easy-crop';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, Key, MessageSquare, User, Unlink, LogOut } from 'lucide-react';
import { getApiBaseUrl, getAvatarUrl } from '@/utils/url';
import { compressImage, formatFileSize, isFileSizeValid } from '@/utils/imageCompression';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Original values for change detection
  const [originalValues, setOriginalValues] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: (user as any)?.phone || ''
  });
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showLineHelp, setShowLineHelp] = useState(false);
  const fileInputRef = useRef<FileUploadRef>(null);
  
  // LINE profile and unlink state
  const [lineProfile, setLineProfile] = useState<any>(null);
  const [lineProfileLoading, setLineProfileLoading] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [showLogoutInstruction, setShowLogoutInstruction] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const uploadsBase = getApiBaseUrl().replace(/\/$/, '').replace(/\/api$/, '');

  // Check if profile fields have changed
  const hasProfileChanges = () => {
    return (
      firstName !== originalValues.firstName ||
      lastName !== originalValues.lastName ||
      email !== originalValues.email ||
      phone !== originalValues.phone
    );
  };

  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        },
        body: JSON.stringify({ firstName, lastName, email, phone })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || t('profile.failedToUpdateProfile'));
      await refreshUser();
      
      // Update original values to current values after successful save
      setOriginalValues({
        firstName,
        lastName,
        email,
        phone
      });
      
      alert(t('profile.profileUpdated'));
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToUpdateProfile'));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || t('profile.failedToChangePassword'));
      setCurrentPassword('');
      setNewPassword('');
      alert(t('profile.passwordChanged'));
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToChangePassword'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch LINE profile information
  const fetchLineProfile = async () => {
    if (!user?.lineId) return;
    
    setLineProfileLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/profile/line-profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setLineProfile(result.profile);
      } else {
        console.error('Failed to fetch LINE profile:', result.message);
        setLineProfile(null);
      }
    } catch (e) {
      console.error('Error fetching LINE profile:', e);
      setLineProfile(null);
    } finally {
      setLineProfileLoading(false);
    }
  };

  // Unlink LINE account
  const unlinkLineAccount = async () => {
    setUnlinkLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/profile/line-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || t('profile.unlinkFailed'));
      
      setShowUnlinkConfirm(false);
      setShowLogoutInstruction(true);
      setLineProfile(null);
      await refreshUser();
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.unlinkFailed'));
    } finally {
      setUnlinkLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        }
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };


  // Avatar crop handlers
  const onSelectAvatar: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(t('profile.invalidImageFile'));
        return;
      }
      
      // Validate file size (max 20MB for mobile compatibility)
      if (!isFileSizeValid(file, 20)) {
        alert(`${t('profile.imageTooLarge')} (${formatFileSize(file.size)})`);
        return;
      }
      
      // Compress image before showing cropper (especially important for mobile)
      console.log(`Original file size: ${formatFileSize(file.size)}`);
      const compressedFile = await compressImage(file, { maxWidth: 1024, quality: 0.8 });
      console.log(`Compressed file size: ${formatFileSize(compressedFile.size)}`);
      
      const url = URL.createObjectURL(compressedFile);
      setImageSrc(url);
      setShowCropper(true);
    } catch (error) {
      console.error('Avatar selection error:', error);
      alert(t('profile.failedToLoadImage'));
    }
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);


  async function getCroppedBlob(imageSrc: string, cropPixels: { x: number; y: number; width: number; height: number }): Promise<Blob> {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Add CORS support
      
      image.onload = () => {
        resolve(image);
      };
      
      image.onerror = (error) => {
        reject(new Error('Failed to load image for cropping'));
      };
      
      image.src = imageSrc;
    });
    
    const canvas = document.createElement('canvas');
    const size = Math.min(cropPixels.width, cropPixels.height);
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    
    try {
      // Set canvas properties for better compatibility
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, cropPixels.x, cropPixels.y, size, size, 0, 0, size, size);
      
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 
          'image/jpeg', 
          0.85
        );
      });
    } catch (error) {
      throw new Error('Failed to process image crop');
    }
  }

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      alert('Missing image or crop data. Please try selecting the image again.');
      return;
    }
    
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      
      if (!blob) {
        throw new Error('Failed to create cropped blob');
      }
      
      const file = new File([blob], 'avatar_cropped.jpg', { type: 'image/jpeg' });
      
      setShowCropper(false);
      
      // Clean up object URL
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
        setImageSrc(null);
      }
      
      // Automatically upload the cropped image
      setLoading(true);
      
      const form = new FormData();
      form.append('avatar', file);
      
      const res = await fetch(`${getApiBaseUrl()}/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        },
        body: form
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || t('profile.failedToUploadAvatar'));
      
      await refreshUser();
      setAvatarFile(null);
      alert(t('profile.avatarUpdated'));
      
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.reset();
      }
      
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToUploadAvatar'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  // Fetch LINE profile when user changes
  useEffect(() => {
    if (user?.lineId) {
      fetchLineProfile();
    } else {
      setLineProfile(null);
    }
  }, [user?.lineId]);

  // Update original values when user data changes
  useEffect(() => {
    if (user) {
      setOriginalValues({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: (user as any)?.phone || ''
      });
    }
  }, [user]);


  return (
    <div className="container mx-auto px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.profileInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <Avatar className="h-16 w-16">
                {user?.avatarUrl ? (
                  <AvatarImage src={getAvatarUrl(user.avatarUrl)} alt="avatar" />
                ) : null}
                <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="avatar">{t('profile.changeProfilePicture')}</Label>
                <div className="flex gap-2">
                  <FileUpload 
                    ref={fileInputRef}
                    accept="image/*" 
                    onChange={(files) => onSelectAvatar({ target: { files } } as any)} 
                    placeholder={t('profile.chooseFile')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('profile.firstName')}</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.lastName')}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.email')}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.phone')}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={updateProfile} 
                disabled={loading || !hasProfileChanges()}
              >
                {t('profile.saveChanges')}
              </Button>
              {hasProfileChanges() && (
                <span className="text-xs text-muted-foreground">
                  {t('profile.unsavedChanges')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column: LINE Account + Change password */}
        <div className="space-y-6 lg:col-span-1">
          {/* Section 2: LINE Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('profile.lineAccount')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.lineId ? (
                <div className="space-y-4">
                  {lineProfileLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                    </div>
                  ) : lineProfile ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-12 w-12">
                          {lineProfile.pictureUrl ? (
                            <AvatarImage src={lineProfile.pictureUrl} alt="LINE profile" />
                          ) : null}
                          <AvatarFallback>
                            {lineProfile.displayName?.[0] || 'L'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {lineProfile.displayName || t('profile.lineDisplayName')}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t('profile.linkedLineAccount')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              const res = await fetch(`${getApiBaseUrl()}/users/line/test`, {
                                method: 'POST',
                                headers: { 
                                  'Authorization': `Bearer ${localStorage.getItem('token')}` || '',
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({})
                              });
                              const result = await res.json();
                              if (!res.ok) throw new Error(result.message || t('profile.failedToSendTestNotification'));
                              
                              let message = t('profile.testNotificationSent');
                              if (result.warning) {
                                message += '\n\n' + result.warning;
                              }
                              alert(message);
                            } catch (e) {
                              alert(e instanceof Error ? e.message : t('profile.failedToSendTestNotification'));
                            }
                          }}
                          className="w-full"
                        >
                          {t('profile.sendTestLineNotification')}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          onClick={() => setShowUnlinkConfirm(true)}
                          className="w-full"
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          {t('profile.unlinkLineAccount')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        {t('profile.failedToGetLineProfile')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLineProfile}
                        className="mt-2"
                      >
                        {t('common.retry')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('profile.lineAccountNotLinked')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('profile.changePassword')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); changePassword(); }} className="space-y-4">
                {/* Hidden username field for accessibility */}
                <input 
                  type="text" 
                  name="username" 
                  value={user?.username || ''} 
                  autoComplete="username" 
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  readOnly
                />
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t('profile.currentPassword')}</Label>
                  <Input 
                    id="current-password"
                    name="current-password"
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder={t('profile.currentPassword')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('profile.newPassword')}</Label>
                  <Input 
                    id="new-password"
                    name="new-password"
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={t('profile.newPassword')}
                  />
                </div>
                <div>
                  <Button type="submit" disabled={loading || !currentPassword || !newPassword}>
                    {t('profile.changePassword')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile-only Logout Button */}
      <div className="lg:hidden mt-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
              size="lg"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Unlink Confirmation Modal */}
      <Dialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlink className="h-5 w-5 text-destructive" />
              {t('profile.unlinkConfirmationTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('profile.unlinkConfirmationMessage')}
            </p>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowUnlinkConfirm(false)}
                className="flex-1"
                disabled={unlinkLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={unlinkLineAccount}
                className="flex-1"
                disabled={unlinkLoading}
              >
                {unlinkLoading ? t('common.loading') : t('profile.unlinkLineAccount')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Instruction Modal */}
      <Dialog open={showLogoutInstruction} onOpenChange={setShowLogoutInstruction}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-primary" />
              {t('profile.logoutInstructionTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('profile.logoutInstructionMessage')}
            </p>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowLogoutInstruction(false)}
                className="flex-1"
              >
                {t('common.close')}
              </Button>
              <Button 
                onClick={handleLogout}
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('profile.logoutNow')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={(open) => {
        setShowCropper(open);
        // Reset file input when dialog is closed
        if (!open && fileInputRef.current) {
          fileInputRef.current.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('profile.cropAvatar')}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-80 bg-black/80 rounded">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                restrictPosition={false}
              />
            )}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Label className="text-sm">{t('profile.zoom')}</Label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setShowCropper(false);
              // Reset file input when cancelling
              if (fileInputRef.current) {
                fileInputRef.current.reset();
              }
            }} disabled={loading}>{t('profile.cancel')}</Button>
            <Button onClick={applyCrop} disabled={loading}>
              {loading ? t('profile.uploading') : t('profile.applyAndUpload')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
