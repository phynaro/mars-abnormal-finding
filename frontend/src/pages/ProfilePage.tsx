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
  const onSelectAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    console.log('📁 onSelectAvatar called with files:', e.target.files);
    const file = e.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }
    
    console.log('📄 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('❌ Invalid file type:', file.type);
        alert(t('profile.invalidImageFile'));
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.error('❌ File too large:', file.size);
        alert(t('profile.imageTooLarge'));
        return;
      }
      
      console.log('🔄 Creating object URL...');
      const url = URL.createObjectURL(file);
      console.log('✅ Object URL created:', url.substring(0, 50) + '...');
      
      console.log('🔄 Setting image source and showing cropper...');
      setImageSrc(url);
      setShowCropper(true);
      
      console.log('✅ File selection completed successfully');
    } catch (error) {
      console.error('❌ Error creating object URL:', error);
      alert(t('profile.failedToLoadImage'));
    }
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    console.log('🔄 onCropComplete called with pixels:', croppedPixels);
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function getCroppedBlob(imageSrc: string, cropPixels: { x: number; y: number; width: number; height: number }): Promise<Blob> {
    console.log('🎨 getCroppedBlob called with:', {
      imageSrc: imageSrc.substring(0, 50) + '...',
      cropPixels
    });
    
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      console.log('🖼️ Creating image element...');
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Add CORS support
      
      image.onload = () => {
        console.log('✅ Image loaded successfully:', {
          width: image.width,
          height: image.height,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight
        });
        resolve(image);
      };
      
      image.onerror = (error) => {
        console.error('❌ Image load error:', error);
        reject(new Error('Failed to load image for cropping'));
      };
      
      console.log('🔄 Setting image source...');
      image.src = imageSrc;
    });
    
    console.log('🖼️ Image loaded, creating canvas...');
    const canvas = document.createElement('canvas');
    const size = Math.min(cropPixels.width, cropPixels.height);
    canvas.width = size;
    canvas.height = size;
    
    console.log('📐 Canvas dimensions:', { width: canvas.width, height: canvas.height, size });
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Canvas 2D context not supported');
      throw new Error('Canvas 2D context not supported');
    }
    
    try {
      // Set canvas properties for better compatibility
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      console.log('🎨 Drawing image to canvas with crop parameters:', {
        sourceX: cropPixels.x,
        sourceY: cropPixels.y,
        sourceWidth: size,
        sourceHeight: size,
        destX: 0,
        destY: 0,
        destWidth: size,
        destHeight: size
      });
      
      ctx.drawImage(img, cropPixels.x, cropPixels.y, size, size, 0, 0, size, size);
      
      console.log('🔄 Converting canvas to blob...');
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log('✅ Blob created from canvas:', {
                size: blob.size,
                type: blob.type
              });
              resolve(blob);
            } else {
              console.error('❌ Failed to create blob from canvas');
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 
          'image/png', 
          0.92
        );
      });
    } catch (error) {
      console.error('❌ Canvas drawing error:', error);
      throw new Error('Failed to process image crop');
    }
  }

  const applyCrop = async () => {
    console.log('🚀 applyCrop function called - starting crop and upload process');
    console.log('📊 Current state:', {
      imageSrc: imageSrc ? 'exists' : 'null',
      croppedAreaPixels: croppedAreaPixels,
      showCropper: showCropper,
      avatarFile: avatarFile ? 'exists' : 'null'
    });
    
    if (!imageSrc || !croppedAreaPixels) {
      console.error('❌ Missing required data:', {
        imageSrc: !!imageSrc,
        croppedAreaPixels: !!croppedAreaPixels
      });
      alert('Missing image or crop data. Please try selecting the image again.');
      return;
    }
    
    try {
      console.log('🔄 Starting crop process with pixels:', croppedAreaPixels);
      console.log('🖼️ Image source type:', typeof imageSrc, imageSrc.substring(0, 50) + '...');
      
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      console.log('✅ Blob created successfully:', {
        size: blob.size,
        type: blob.type
      });
      
      if (!blob) {
        throw new Error('Failed to create cropped blob');
      }
      
      const file = new File([blob], 'avatar_cropped.png', { type: 'image/png' });
      console.log('📁 File created:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      console.log('🔄 Closing cropper and starting upload...');
      setShowCropper(false);
      
      // Clean up object URL
      if (imageSrc) {
        console.log('🧹 Cleaning up object URL');
        URL.revokeObjectURL(imageSrc);
        setImageSrc(null);
      }
      
      // Automatically upload the cropped image
      console.log('🚀 Starting automatic upload of cropped image...');
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
      
      console.log('✅ Avatar uploaded successfully!');
      await refreshUser();
      setAvatarFile(null);
      alert(t('profile.avatarUpdated'));
      
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.reset();
        console.log('🔄 File input reset for next selection');
      }
      
    } catch (e) {
      console.error('❌ Crop and upload error details:', {
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : 'No stack trace'
      });
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
  useEffect(() => {
    console.log('hello');
  }, []);
  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log('🔄 State update - croppedAreaPixels:', croppedAreaPixels);
  }, [croppedAreaPixels]);

  useEffect(() => {
    console.log('🔄 State update - imageSrc:', imageSrc ? 'exists' : 'null');
  }, [imageSrc]);

  useEffect(() => {
    console.log('🔄 State update - showCropper:', showCropper);
  }, [showCropper]);

  useEffect(() => {
    console.log('🔄 State update - avatarFile:', avatarFile ? 'exists' : 'null');
  }, [avatarFile]);


  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Section 1: Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('profile.profileInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
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
              {/* <p className="text-sm text-muted-foreground">
                {t('profile.avatarUploadHint')}
              </p> */}
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

      {/* Responsive Layout for LINE and Password sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    // Use the current form value for testing, not the saved value
                    const testLineId = lineId.trim();
                    if (!testLineId) {
                      alert(t('profile.pleaseEnterLineId'));
                      return;
                    }
                    
                    const res = await fetch(`${getApiBaseUrl()}/users/line/test`, {
                      method: 'POST',
                      headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('token')}` || '',
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ lineId: testLineId })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message || t('profile.failedToSendTestNotification'));
                    alert(t('profile.testNotificationSent'));
                  } catch (e) {
                    alert(e instanceof Error ? e.message : t('profile.failedToSendTestNotification'));
                  }
                }}
                disabled={!lineId.trim()}
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
                {lineId.trim() ? 
                  t('profile.testWillUseCurrentInput') : 
                  t('profile.ensureLineIdSet')
                }
              </p>
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
            <div className="space-y-2">
              <Label>{t('profile.currentPassword')}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.newPassword')}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Button variant="outline" onClick={changePassword} disabled={loading || !currentPassword || !newPassword}>
                {t('profile.changePassword')}
              </Button>
            </div>
          </CardContent>
        </Card>
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
          console.log('🔄 File input reset after dialog close');
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
              console.log('❌ Cancel button clicked');
              setShowCropper(false);
              // Reset file input when cancelling
              if (fileInputRef.current) {
                fileInputRef.current.reset();
                console.log('🔄 File input reset after cancel');
              }
            }} disabled={loading}>{t('profile.cancel')}</Button>
            <Button onClick={() => {
              console.log('✅ Apply & Upload button clicked - calling applyCrop');
              applyCrop();
            }} disabled={loading}>
              {loading ? t('profile.uploading') : t('profile.applyAndUpload')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
