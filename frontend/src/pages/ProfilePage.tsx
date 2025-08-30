import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [shift, setShift] = useState(user?.shift || '');
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
        body: JSON.stringify({ firstName, lastName, department, shift, lineId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to update profile');
      await refreshUser();
      alert('Profile updated');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update profile');
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
      if (!res.ok) throw new Error(result.message || 'Failed to change password');
      setCurrentPassword('');
      setNewPassword('');
      alert('Password changed');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to change password');
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
      if (!res.ok) throw new Error(result.message || 'Failed to upload avatar');
      await refreshUser();
      setAvatarFile(null);
      alert('Avatar updated');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to upload avatar');
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
      alert(e instanceof Error ? e.message : 'Failed to crop image');
    }
  };

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
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
              <Label htmlFor="avatar">Change Profile Picture</Label>
              <div className="flex gap-2">
                <Input id="avatar" type="file" accept="image/*" onChange={onSelectAvatar} />
                <Button onClick={uploadAvatar} disabled={!avatarFile || loading}>Upload</Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Input value={shift} onChange={(e) => setShift(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <Label>LINE User ID (for notifications)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs text-left">
                        <p className="font-medium mb-1">Find your LINE userId</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>Add our LINE Official Account.</li>
                          <li>Open the chat and send: "Line ID".</li>
                          <li>Copy the returned userId and paste it here.</li>
                        </ol>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="Enter your LineID" />
            </div>
          </div>
          <div>
            <Button onClick={updateProfile} disabled={loading}>Save Changes</Button>
          </div>

          {/* LINE Test Notification */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch(`${API_BASE_URL}/users/line/test`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` || '' }
                  });
                  const result = await res.json();
                  if (!res.ok) throw new Error(result.message || 'Failed to send');
                  alert('Test notification sent to your LINE.');
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Failed to send test notification');
                }
              }}
            >
              Send Test LINE Notification
            </Button>
            <span className="text-sm text-muted-foreground">Ensure your LineID is set above.</span>
          </div>

          <Separator />

          {/* Change Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <Button variant="outline" onClick={changePassword} disabled={loading || !currentPassword || !newPassword}>Change Password</Button>
          </div>
        </CardContent>
      </Card>
      {/* Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
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
            <Label className="text-sm">Zoom</Label>
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
            <Button variant="outline" onClick={() => setShowCropper(false)}>Cancel</Button>
            <Button onClick={applyCrop}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
