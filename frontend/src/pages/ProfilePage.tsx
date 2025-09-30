import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, Key, MessageSquare, User } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [title, setTitle] = useState((user as any)?.title || '');
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

  const uploadsBase = (API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL).replace(/\/$/, '');

  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` || ''
        },
        body: JSON.stringify({ firstName, lastName, email, phone, title, lineId })
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
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
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

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('avatar', avatarFile);
      const res = await fetch(`${API_BASE_URL}/users/profile/avatar`, {
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
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToUploadAvatar'));
    } finally {
      setLoading(false);
    }
  };

  // Avatar crop handlers
  const onSelectAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setShowCropper(true);
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function getCroppedBlob(imageSrc: string, cropPixels: { x: number; y: number; width: number; height: number }): Promise<Blob> {
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageSrc;
    });
    const canvas = document.createElement('canvas');
    const size = Math.min(cropPixels.width, cropPixels.height);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, cropPixels.x, cropPixels.y, size, size, 0, 0, size, size);
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob as Blob), 'image/png', 0.92);
    });
  }

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar_cropped.png', { type: 'image/png' });
      setAvatarFile(file);
      setShowCropper(false);
      URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : t('profile.failedToCropImage'));
    }
  };

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);


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
                <AvatarImage src={`${uploadsBase}${user.avatarUrl}`} alt="avatar" />
              ) : null}
              <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar">{t('profile.changeProfilePicture')}</Label>
              <div className="flex gap-2">
                <FileUpload 
                  accept="image/*" 
                  onChange={(files) => onSelectAvatar({ target: { files } } as any)} 
                  placeholder={t('profile.chooseFile')}
                />
                <Button onClick={uploadAvatar} disabled={!avatarFile || loading}>{t('profile.upload')}</Button>
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
            <div className="space-y-2">
              <Label>{t('profile.jobTitle')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className='text-muted-foreground bg-muted' readOnly/>
            </div>
            {/* Read-only derived fields */}
            <div className="space-y-2">
              <Label>{t('profile.department')}</Label>
              <Input
                value={(() => {
                  const u: any = user || {};
                  return (
                    u.departmentName ||
                    (u.departmentCode ? `${u.departmentName ? `${u.departmentName} ` : ''}(${u.departmentCode})` : '') ||
                    (u.department !== undefined ? String(u.department) : '') ||
                    ''
                  );
                })()}
                readOnly
                className='text-muted-foreground bg-muted'
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.group')}</Label>
              <Input value={(user as any)?.groupName || ''} readOnly className='text-muted-foreground bg-muted'/>
            </div>
            <div className="space-y-2">
              <Label>{t('profile.personCode')}</Label>
              <Input value={(user as any)?.personCode || ''} readOnly className='text-muted-foreground bg-muted'/>
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
                    const res = await fetch(`${API_BASE_URL}/users/line/test`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` || '' }
                    });
                  const result = await res.json();
                  if (!res.ok) throw new Error(result.message || t('profile.failedToSendTestNotification'));
                  alert(t('profile.testNotificationSent'));
                } catch (e) {
                  alert(e instanceof Error ? e.message : t('profile.failedToSendTestNotification'));
                }
              }}
            >
              {t('profile.sendTestLineNotification')}
            </Button>
            <p className="text-sm text-muted-foreground">{t('profile.ensureLineIdSet')}</p>
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
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
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
            <Button variant="outline" onClick={() => setShowCropper(false)}>{t('profile.cancel')}</Button>
            <Button onClick={applyCrop}>{t('profile.apply')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
