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
import { HelpCircle, Key, MessageSquare, User } from 'lucide-react';
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
  const [lineId, setLineId] = useState(user?.lineId || '');
  const [lineIdLoading, setLineIdLoading] = useState(false);
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showLineHelp, setShowLineHelp] = useState(false);
  const fileInputRef = useRef<FileUploadRef>(null);

  const uploadsBase = getApiBaseUrl().replace(/\/$/, '').replace(/\/api$/, '');

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
        body: JSON.stringify({ firstName, lastName, email, phone, lineId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || t('profile.failedToUpdateProfile'));
      await refreshUser();
      alert(t('profile.profileUpdated'));
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToUpdateProfile'));
    } finally {
      setLoading(false);
    }
  };

  const updateLineId = async () => {
    setLineIdLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/profile/line-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        },
        body: JSON.stringify({ lineId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || t('profile.failedToUpdateLineId'));
      await refreshUser();
      alert(t('profile.lineIdUpdated'));
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToUpdateLineId'));
    } finally {
      setLineIdLoading(false);
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
            <div>
              <Button onClick={updateProfile} disabled={loading}>{t('profile.saveChanges')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Right column: LINE notification + Change password */}
        <div className="space-y-6 lg:col-span-1">
          {/* Section 2: LINE Notification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('profile.lineNotifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{t('profile.lineUserId')}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLineHelp(true)}
                    className="h-6 w-6 p-0"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <Input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder={t('profile.enterLineId')} />
              </div>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Don't send lineId in body - let backend use saved value
                      const res = await fetch(`${getApiBaseUrl()}/users/line/test`, {
                        method: 'POST',
                        headers: { 
                          'Authorization': `Bearer ${localStorage.getItem('token')}` || '',
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({}) // Empty body to use saved LINE ID
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
                  disabled={!user?.lineId?.trim()}
                >
                  {t('profile.sendTestLineNotification')}
                </Button>
                
                {/* Show warning if LINE ID has been changed but not saved */}
                {lineId !== (user?.lineId || '') && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      <strong>{t('profile.note')}:</strong> {t('profile.lineIdChangedNotSaved')}
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  {user?.lineId?.trim() ? 
                    t('profile.testWillUseSavedLineId') : 
                    t('profile.ensureLineIdSet')
                  }
                </p>
              </div>
              
              {/* LINE ID Save Button - moved to last component */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  onClick={updateLineId} 
                  disabled={lineIdLoading || lineId === (user?.lineId || '')}
                  size="sm"
                >
                  {lineIdLoading ? t('profile.saving') : t('profile.saveLineId')}
                </Button>
                {lineId !== (user?.lineId || '') && (
                  <Button 
                    variant="outline" 
                    onClick={() => setLineId(user?.lineId || '')}
                    size="sm"
                  >
                    {t('profile.cancel')}
                  </Button>
                )}
              </div>
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

      {/* LINE Help Modal */}
      <Dialog open={showLineHelp} onOpenChange={setShowLineHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile.lineHelpTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t('profile.lineHelpDescription')}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('profile.step1Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.step1Description')}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://lin.ee/y3TiTtU', '_blank')}
                      className="w-fit"
                    >
                      {t('profile.addLineFriend')}
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Link: <span className="font-mono">https://lin.ee/y3TiTtU</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('profile.step2Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.step2Description')} <span className="font-mono bg-muted px-1 rounded">Line ID</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('profile.step3Title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.step3Description')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowLineHelp(false)}
                className="w-full"
              >
                {t('profile.gotIt')}
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
